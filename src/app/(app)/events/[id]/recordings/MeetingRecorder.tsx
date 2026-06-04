"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
      <p className="mb-3 text-sm font-medium text-gray-700">Record Meeting Audio</p>

      {state === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white" />
          Start Recording
        </button>
      )}

      {(state === "recording" || state === "paused") && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {state === "recording" && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
                REC {formatTime(elapsed)}
              </span>
            )}
            {state === "paused" && (
              <span className="text-sm font-semibold text-yellow-600">
                ⏸ PAUSED {formatTime(elapsed)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {state === "recording" ? (
              <button
                type="button"
                onClick={pauseRecording}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeRecording}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Resume
              </button>
            )}
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Stop & Upload
            </button>
          </div>
        </div>
      )}

      {state === "uploading" && (
        <p className="text-sm text-gray-600">Uploading & transcribing… please wait.</p>
      )}

      {state === "done" && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-green-700">Recording uploaded and transcription started.</p>
          <button type="button" onClick={reset} className="text-xs text-gray-500 hover:text-gray-900 underline">
            Record again
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-2">
          <p className="text-sm text-red-700">{error ?? "Upload failed."}</p>
          <button type="button" onClick={reset} className="text-xs text-gray-500 underline">
            Try again
          </button>
        </div>
      )}

      {error && state === "idle" && (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
