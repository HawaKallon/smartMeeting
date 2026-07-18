import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireUser } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { canManageExistingEvent } from "@/lib/eventAccess";
import { getActiveToken } from "@/lib/checkin";
import { absoluteAppUrl } from "@/lib/appUrl";
import { RefreshOnExpiry } from "./RefreshOnExpiry";
import { GenerateQrButton } from "./GenerateQrButton";

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
      venueLat: true,
      venueLng: true,
      coOrganizers: { select: { id: true } },
    },
  });
  if (!event) notFound();
  if (!canManageExistingEvent(user, event)) notFound();

  const hasLocation = event.venueLat != null && event.venueLng != null;
  let dataUrl: string | null = null;
  let expiresAtIso = "";

  if (hasLocation) {
    const { token, expiresAt } = await getActiveToken(event.id);
    const url = absoluteAppUrl(`/checkin/${token}`);
    dataUrl = await QRCode.toDataURL(url, { width: 360, margin: 2 });
    expiresAtIso = expiresAt.toISOString();
  }

  return (
    <div className="space-y-6">
      <div>
        <BackButton href={`/administrative/events/${id}`} label={event.title} />
        <h1 className="mt-4 text-3xl font-bold text-foreground">{event.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasLocation ? "Scan to check in" : "Generate check-in QR"}
        </p>
      </div>

      {!hasLocation ? (
        <>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-foreground">
              We'll ask for your current location — that becomes the boundary attendees must be within to check in.
            </p>
          </div>
          <GenerateQrButton eventId={id} />
        </>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex justify-center">
              <div className="rounded-lg border border-border p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dataUrl!} alt="Check-in QR code" width={360} height={360} />
              </div>
            </div>

            <div className="mt-6 space-y-3 text-center">
              <RefreshOnExpiry expiresAt={expiresAtIso} />
              <p className="text-xs text-muted-foreground">
                Rotates every 5 minutes so a screenshotted code can't be reused later.
              </p>
            </div>
          </div>

          <GenerateQrButton eventId={id} label="Regenerate at current location" />
        </>
      )}
    </div>
  );
}
