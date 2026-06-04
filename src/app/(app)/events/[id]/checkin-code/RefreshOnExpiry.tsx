"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-fetch the server component once the current token expires so a fresh
// QR code is minted and displayed (PRD §6.1 rotating code).
export function RefreshOnExpiry({ secondsLeft }: { secondsLeft: number }) {
  const router = useRouter();

  useEffect(() => {
    const ms = Math.max(5, secondsLeft) * 1000;
    const t = setTimeout(() => router.refresh(), ms);
    return () => clearTimeout(t);
  }, [secondsLeft, router]);

  return null;
}
