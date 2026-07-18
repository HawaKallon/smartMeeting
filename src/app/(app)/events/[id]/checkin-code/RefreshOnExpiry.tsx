"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Live countdown to QR expiry. When the token expires, re-fetch the server
// component so a fresh QR code is minted and displayed (PRD §6.1 rotating code).
export function RefreshOnExpiry({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState<string>("—");

  useEffect(() => {
    const computeRemaining = () => {
      const expiresTime = new Date(expiresAt).getTime();
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.floor((expiresTime - now) / 1000));

      const minutes = Math.floor(secondsLeft / 60);
      const seconds = secondsLeft % 60;
      const display = `${minutes}:${String(seconds).padStart(2, "0")}`;

      setRemaining(display);

      if (secondsLeft <= 0) {
        clearInterval(interval);
        router.refresh();
      }
    };

    computeRemaining();
    const interval = setInterval(computeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, router]);

  return (
    <p className="text-sm text-muted-foreground">
      Refreshing in {remaining}
    </p>
  );
}
