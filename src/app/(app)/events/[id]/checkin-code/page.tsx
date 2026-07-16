import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { canManageExistingEvent } from "@/lib/eventAccess";
import { getActiveToken } from "@/lib/checkin";
import { absoluteAppUrl } from "@/lib/appUrl";
import { RefreshOnExpiry } from "./RefreshOnExpiry";

export default async function CheckInCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      ministryId: true,
      organizerId: true,
      coOrganizers: { select: { id: true } },
    },
  });
  if (!event) notFound();
  if (!canManageExistingEvent(user, event)) notFound();

  const { token, expiresAt } = await getActiveToken(event.id);
  const url = absoluteAppUrl(`/checkin/${token}`);

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
