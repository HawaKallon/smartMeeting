"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

interface IdleLogoutProps {
  timeoutMinutes: number;
}

export function IdleLogout({ timeoutMinutes }: IdleLogoutProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // -1 means never timeout
  if (timeoutMinutes === -1) {
    return null;
  }

  useEffect(() => {
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        signOut({ redirectTo: "/administrative/login" });
      }, timeoutMs);
    };

    // Set initial timeout
    resetTimeout();

    // Reset timeout on user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, resetTimeout);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimeout);
      });
    };
  }, [timeoutMinutes]);

  return null;
}
