"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mic, Pause, Play, Square } from "lucide-react";
import { uploadRecording } from "./actions";

type RecordState = "idle" | "recording" | "paused" | "uploading" | "done" | "error";

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function MeetingRecorder({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [state, setState] = useState<RecordState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function startRecording() {
    setError(null);
    setElapsed(0);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied. Please allow microphone access and try again.");
      return;
    }

    streamRef.current = stream;

    // Pick the best supported MIME type.
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"]
      .find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mediaRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stopTimer();
      streamRef.current?.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      const ext = mime.includes("ogg") ? ".ogg" : mime.includes("mp4") ? ".mp4" : ".webm";
      const file = new File([blob], `recording${ext}`, { type: blob.type });

      const fd = new FormData();
      fd.append("file", file);
      fd.append("eventId", eventId);

      setState("uploading");
      startTransition(async () => {
        const res = await uploadRecording(fd);
        if (!res.ok) {
          setError(res.error);
          setState("error");
        } else {
          setState("done");
          router.refresh();
        }
      });
    };

    recorder.start(1000); // collect a chunk every second
    setState("recording");
    startTimer();
  }

  function pauseRecording() {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.pause();
      stopTimer();
      setState("paused");
    }
  }

  function resumeRecording() {
    if (mediaRef.current?.state === "paused") {
      mediaRef.current.resume();
      startTimer();
      setState("recording");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    stopTimer();
  }

  function reset() {
    setState("idle");
    setElapsed(0);
    setError(null);
    chunksRef.current = [];
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="mb-4 text-sm font-medium text-foreground">Record Meeting Audio</p>

      {state === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 transition-colors"
        >
          <Mic size={18} />
          Start Recording
        </button>
      )}

      {(state === "recording" || state === "paused") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md bg-secondary/50 p-3">
            <div className="flex items-center gap-3">
              {state === "recording" && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                  <span className="text-sm font-semibold text-destructive">Recording</span>
                </span>
              )}
              {state === "paused" && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-500">Paused</span>
                </span>
              )}
            </div>
            <span className="font-mono text-sm font-semibold text-foreground">{formatTime(elapsed)}</span>
          </div>
          <div className="flex gap-2">
            {state === "recording" ? (
              <button
                type="button"
                onClick={pauseRecording}
                className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Pause size={16} />
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeRecording}
                className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Play size={16} />
                Resume
              </button>
            )}
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Square size={16} />
              Stop & Upload
            </button>
          </div>
        </div>
      )}

      {state === "uploading" && (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary"></div>
          <p className="text-sm text-muted-foreground">Uploading & transcribing… please wait.</p>
        </div>
      )}

      {state === "done" && (
        <div className="space-y-2 rounded-md bg-green-500/10 p-3">
          <p className="text-sm text-green-400">✓ Recording uploaded and transcription started.</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Record another
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-2 rounded-md bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error ?? "Upload failed."}</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Try again
          </button>
        </div>
      )}

      {error && state === "idle" && (
        <p className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
