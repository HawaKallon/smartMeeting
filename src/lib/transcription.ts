import { readFile } from "fs/promises";

// PRD §6.2 — cloud transcription. Phase 1 targets the OpenAI Whisper API.
// A local Whisper.cpp provider for the RESTRICTED tier slots in here later
// (PRD §8 Phase 3) behind the same TranscriptSegment contract.

export type TranscriptSegment = {
  speaker: string;
  start: number;
  end: number;
  text: string;
};

export type TranscriptionResult = {
  provider: string;
  segments: TranscriptSegment[];
};

/**
 * Transcribe an audio file. Uses OpenAI Whisper when OPENAI_API_KEY is set;
 * otherwise returns a clearly-labelled stub so the end-to-end flow (upload →
 * job → transcript → review) is exercisable without a key during development.
 */
export async function transcribeFile(
  filePath: string,
  fileName: string,
): Promise<TranscriptionResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      provider: "stub",
      segments: [
        {
          speaker: "Speaker 1",
          start: 0,
          end: 0,
          text: `[Transcription stub — set OPENAI_API_KEY to transcribe "${fileName}".]`,
        },
      ],
    };
  }

  const buf = await readFile(filePath);
  const form = new FormData();
  form.set(
    "file",
    new Blob([new Uint8Array(buf)], { type: "audio/mpeg" }),
    fileName,
  );
  form.set("model", "whisper-1");
  form.set("response_format", "verbose_json");
  form.set("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Transcription failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as {
    segments?: { start: number; end: number; text: string }[];
    text?: string;
  };

  const segments: TranscriptSegment[] = (json.segments ?? []).map((s) => ({
    // Whisper API does not diarize; a single speaker label until the local
    // pyannote tier is wired (PRD §6.2 speaker diarization, Phase 3).
    speaker: "Speaker 1",
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }));

  if (segments.length === 0 && json.text) {
    segments.push({ speaker: "Speaker 1", start: 0, end: 0, text: json.text.trim() });
  }

  return { provider: "openai-whisper", segments };
}
