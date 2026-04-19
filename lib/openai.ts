
import { env } from "@/lib/env";

const EMBEDDING_DIMENSIONS = 1536;

export function hasOpenAI() {
  return Boolean(env.openAiApiKey);
}

async function requestOpenAI<T>(path: string, body: Record<string, unknown>) {
  if (!env.openAiApiKey) {
    throw new Error("OpenAI is not configured.");
  }

  const response = await fetch(`https://api.openai.com/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openAiApiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

type EmbeddingsResponse = {
  data: Array<{ embedding: number[] }>;
};

export async function embedText(input: string) {
  if (!input.trim()) {
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const result = await requestOpenAI<EmbeddingsResponse>("/embeddings", {
    model: env.openAiEmbeddingModel,
    input
  });

  return result.data[0]?.embedding ?? new Array(EMBEDDING_DIMENSIONS).fill(0);
}

type ResponsesResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

export async function studyCopilotReply(input: {
  prompt: string;
  context?: string;
  profileSummary?: string;
}) {
  const instructions = [
    "You are a science study copilot inside a community platform.",
    "Be precise, practical, and safe.",
    "Prefer structured study help: summaries, examples, mini quizzes, and action plans.",
    "If the user asks for medical, legal, or unsafe advice, stay high-level and cautious."
  ].join(" ");

  const result = await requestOpenAI<ResponsesResponse>("/responses", {
    model: env.openAiStudyModel,
    instructions,
    input: [
      input.profileSummary ? `Learner profile: ${input.profileSummary}` : "",
      input.context ? `Relevant platform context:\n${input.context}` : "",
      `User request:\n${input.prompt}`
    ]
      .filter(Boolean)
      .join("\n\n")
  });

  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  const text = result.output
    ?.flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();

  return text || "I could not generate a response.";
}
