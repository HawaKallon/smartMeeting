"use client";

import { useState } from "react";
import { submitCheckIn, type CheckInResult } from "../actions";
import { SignaturePad } from "./SignaturePad";

export function CheckInClient({
  token,
  eventTitle,
  hasGeofence,
  defaultName,
}: {
  token: string;
  eventTitle: string;
  hasGeofence: boolean;
  defaultName: string;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "submitting">("idle");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [name, setName] = useState(defaultName);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

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
    fd.set("signedName", name.trim());
    fd.set("signature", signatureDataUrl || "");

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
    if (result.already) {
      return (
        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-lg font-semibold text-amber-800">Already checked in</p>
          <p className="mt-1 text-sm text-amber-700">{result.eventTitle}</p>
        </div>
      );
    }
    return (
      <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-5 text-center">
        <p className="text-lg font-semibold text-emerald-800">✓ Checked in</p>
        <p className="mt-1 text-sm text-emerald-700">{result.eventTitle}</p>
        {result.withinGeofence === true ? (
          <p className="mt-2 text-xs text-emerald-700">Location verified at venue.</p>
        ) : null}
      </div>
    );
  }

  const isFormValid = name.trim().length >= 2 && signatureDataUrl;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[#003580]">Check in</h1>
        <p className="text-sm text-slate-600">{eventTitle}</p>
      </div>

      {result && !result.ok ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-1">
          Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          minLength={2}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#003580] focus:ring-1 focus:ring-[#003580] outline-none"
        />
      </div>

      <SignaturePad onChange={setSignatureDataUrl} />

      <button
        onClick={handleCheckIn}
        disabled={status !== "idle" || !isFormValid}
        className="w-full rounded-xl bg-[#003580] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#00265b] disabled:opacity-50 disabled:cursor-not-allowed"
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
        <p className="text-center text-xs text-slate-500">
          This meeting requires you to be physically at the venue.
        </p>
      ) : null}
    </div>
  );
}
