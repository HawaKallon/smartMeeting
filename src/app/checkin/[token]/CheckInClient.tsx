"use client";

import { useState } from "react";
import { submitCheckIn, type CheckInResult } from "../actions";

export function CheckInClient({
  token,
  eventTitle,
  needsName,
  hasGeofence,
}: {
  token: string;
  eventTitle: string;
  needsName: boolean;
  hasGeofence: boolean;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "locating" | "submitting">("idle");
  const [result, setResult] = useState<CheckInResult | null>(null);

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

  async function handleCheckIn() {
    setResult(null);

    const fd = new FormData();
    fd.set("token", token);
    if (name) fd.set("name", name);

    if (hasGeofence) {
      setStatus("locating");
      const pos = await getPosition();
      if (!pos) {
        setResult({
          ok: false,
          error: "Location is required for this meeting. Enable GPS and try again.",
        });
        setStatus("idle");
        return;
      }
      fd.set("lat", String(pos.coords.latitude));
      fd.set("lng", String(pos.coords.longitude));
      fd.set("accuracy", String(pos.coords.accuracy));
      // Heuristic anti-spoof flag: implausibly perfect accuracy.
      if (pos.coords.accuracy === 0) fd.set("mock", "true");
    }

    setStatus("submitting");
    const res = await submitCheckIn(fd);
    setResult(res);
    setStatus("idle");
  }

  if (result?.ok) {
    return (
      <div className="rounded-lg bg-green-50 p-5 text-center">
        <p className="text-lg font-semibold text-green-800">✓ Checked in</p>
        <p className="mt-1 text-sm text-green-700">{result.eventTitle}</p>
        {result.withinGeofence === true ? (
          <p className="mt-2 text-xs text-green-600">Location verified at venue.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Check in</h1>
        <p className="text-sm text-gray-500">{eventTitle}</p>
      </div>

      {needsName ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      ) : null}

      {result && !result.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <button
        onClick={handleCheckIn}
        disabled={status !== "idle"}
        className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {status === "locating"
          ? "Getting location…"
          : status === "submitting"
            ? "Checking in…"
            : hasGeofence
              ? "Check in at venue"
              : "Check in"}
      </button>

      {hasGeofence ? (
        <p className="text-center text-xs text-gray-400">
          This meeting requires you to be physically at the venue.
        </p>
      ) : null}
    </div>
  );
}
