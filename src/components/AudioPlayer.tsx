"use client";

import { useRef, useState } from "react";

function formatSeconds(seconds: number | null | undefined): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  durationSec,
}: {9
  src: string;
  durationSec?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState<number>(durationSec ?? 0);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  return (
    <div className="space-y-2">
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full h-8"
      >
        <source src={src} />
      </audio>
      <div className="text-xs text-muted-foreground">
        Duration: <span className="font-mono font-semibold text-foreground">{formatSeconds(duration)}</span>
      </div>
    </div>
  );
}
