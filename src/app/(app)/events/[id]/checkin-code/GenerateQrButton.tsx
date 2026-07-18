"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateCheckInQr, type GenerateQrResult } from "./actions";

export function GenerateQrButton({
  eventId,
  label = "Generate QR",
}: {
  eventId: string;
  label?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "locating" | "generating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function getPosition(): Promise<GeolocationPosition | null> {
    if (!("geolocation" in navigator)) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }

  async function handleGenerateQr() {
    setError(null);
    setStatus("locating");

    const pos = await getPosition();
    if (!pos) {
      setError("Location is required to generate the QR code. Enable GPS and try again.");
      setStatus("idle");
      return;
    }

    setStatus("generating");
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("lat", String(pos.coords.latitude));
    fd.set("lng", String(pos.coords.longitude));

    const result: GenerateQrResult = await generateCheckInQr(fd);

    if (!result.ok) {
      setError(result.error);
      setStatus("idle");
      return;
    }

    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground mb-4">
          Generate the check-in QR when you're at the venue — your current location becomes the
          check-in boundary.
        </p>

        <button
          onClick={handleGenerateQr}
          disabled={status !== "idle"}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "locating"
            ? "Getting location…"
            : status === "generating"
              ? "Generating QR…"
              : label}
        </button>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
