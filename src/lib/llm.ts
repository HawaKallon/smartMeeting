/**
 * LLM Integration - supports both OpenAI and local Ollama
 *
 * Usage:
 * - For cloud: Set OPENAI_API_KEY environment variable
 * - For local: Ensure Ollama is running on OLLAMA_API_URL with OLLAMA_MODEL pulled
 *
 * Example:
 * const response = await generateText("Summarize this meeting...");
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_API_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";

export const useOllama = !OPENAI_API_KEY || OPENAI_API_KEY.trim() === "";

/**
 * Generate text using available LLM provider
 */
export async function generateText(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string> {
  if (useOllama) {
    return generateTextOllama(prompt, options);
  } else {
    return generateTextOpenAI(prompt, options);
  }
}

/**
 * Generate text using OpenAI API
 */
async function generateTextOpenAI(
  prompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: options?.maxTokens || 500,
      temperature: options?.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = (await response.json()) as any;
  return data.choices[0]?.message?.content || "";
}

/**
 * Generate text using local Ollama
 */
async function generateTextOllama(
  prompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        temperature: options?.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return data.response || "";
  } catch (error) {
    console.error("Ollama error:", error);
    throw new Error(
      `Failed to connect to Ollama at ${OLLAMA_URL}. Make sure Ollama is running: ollama serve`,
    );
  }
}

/**
 * Summarize text (useful for meeting minutes)
 */
export async function summarizeText(text: string): Promise<string> {
  const prompt = `Please provide a concise summary of the following text in 2-3 sentences:\n\n${text}`;
  return generateText(prompt);
}

/**
 * Extract action items from text
 */
export async function extractActionItems(text: string): Promise<string[]> {
  const prompt = `Extract all action items from this text. Return only a numbered list:\n\n${text}`;
  const response = await generateText(prompt);
  return response
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.replace(/^\d+\.\s*/, "").trim());
}

/**
 * Generate meeting summary with key points
 */
export async function summarizeMeeting(transcript: string): Promise<{ summary: string; keyPoints: string[] }> {
  const summaryPrompt = `You are a meeting summarizer. Read ONLY the meeting notes provided below and write a concise 2-3 sentence summary of what was actually discussed. Do not make up or infer anything not explicitly in the notes.

MEETING NOTES:
${transcript}

SUMMARY (2-3 sentences):`;
  const summary = await generateText(summaryPrompt).then((s) => s.trim());

  const pointsPrompt = `You are a meeting notes analyzer. Read ONLY the meeting notes provided below. Extract ONLY the actual key points, decisions, or important information that are explicitly mentioned. Do not invent, hallucinate, or assume any additional points. Return as a numbered list with only real points from the notes.

MEETING NOTES:
${transcript}

KEY POINTS (numbered list, only actual points from the notes):`;
  const pointsResponse = await generateText(pointsPrompt);
  const keyPoints = pointsResponse
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter((point) => point.length > 0 && point.length < 300);

  return { summary, keyPoints };
}

/**
 * Get LLM provider info (for debugging/logging)
 */
export function getLLMInfo(): { provider: string; model: string; url?: string } {
  if (useOllama) {
    return {
      provider: "Ollama (Local)",
      model: OLLAMA_MODEL,
      url: OLLAMA_URL,
    };
  }
  return {
    provider: "OpenAI",
    model: "gpt-3.5-turbo",
  };
}
