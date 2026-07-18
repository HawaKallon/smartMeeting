"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { manualCheckInAction } from "./actions";

export function InlineCheckInButton({
  eventId,
  attendeeId,
}: {
  eventId: string;
  attendeeId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);

    const formData = new FormData();
    formData.set("eventId", eventId);
    formData.set("attendeeId", attendeeId);

    try {
      await manualCheckInAction(formData);
      router.refresh();
    } catch (err) {
      console.error("Check-in failed:", err);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleCheckIn}
      disabled={pending}
      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? "Checking in…" : "Check in"}
    </button>
  );
}
