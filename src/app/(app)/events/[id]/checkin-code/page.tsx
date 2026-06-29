import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireStaffRole } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { getActiveToken } from "@/lib/checkin";
import { RefreshOnExpiry } from "./RefreshOnExpiry";

export default async function CheckInCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireStaffRole();

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const { token, expiresAt } = await getActiveToken(event.id);

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/checkin/${token}`;

  const dataUrl = await QRCode.toDataURL(url, { width: 360, margin: 2 });
  const secondsLeft = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );

  return (
    <div className="space-y-6">
      <div>
        <BackButton href={`/administrative/events/${id}`} label={event.title} />
        <h1 className="mt-4 text-3xl font-bold text-foreground">{event.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Scan to check in</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex justify-center">
          <div className="rounded-lg border border-border p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt="Check-in QR code" width={360} height={360} />
          </div>
        </div>

        <div className="mt-6 space-y-2 text-center">
          <p className="break-all text-xs text-muted-foreground">{url}</p>
          <p className="text-xs text-muted-foreground">
            Code rotates automatically. Refreshing in ~{secondsLeft}s.
          </p>
          <RefreshOnExpiry secondsLeft={secondsLeft} />
        </div>
      </div>
    </div>
  );
}
