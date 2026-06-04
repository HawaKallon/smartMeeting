import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireRole } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getActiveToken } from "@/lib/checkin";
import { RefreshOnExpiry } from "./RefreshOnExpiry";

export default async function CheckInCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("ADMIN");

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
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-semibold text-gray-900">{event.title}</h1>
      <p className="mt-1 text-sm text-gray-500">Scan to check in</p>

      <div className="mt-6 inline-block rounded-xl border bg-white p-4 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt="Check-in QR code" width={360} height={360} />
      </div>

      <p className="mt-4 break-all text-xs text-gray-400">{url}</p>
      <p className="mt-1 text-xs text-gray-500">
        Code rotates automatically. Refreshing in ~{secondsLeft}s.
      </p>

      <RefreshOnExpiry secondsLeft={secondsLeft} />
    </div>
  );
}
