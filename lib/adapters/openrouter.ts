/**
 * OpenRouter Adapter
 * Provides OpenAI-compatible client for LLM tasks (title generation, transformations)
 */

import { createOpenAI } from "@ai-sdk/openai";

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || "";
const OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME || "whisper-app";

/**
 * Create an OpenRouter client compatible with Vercel AI SDK
 * @param apiKey - Optional API key (falls back to env variable)
 * @returns OpenAI-compatible client instance
 */
export function openRouterClient(apiKey?: string) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error(
      "OpenRouter API key is required. Please provide it via parameter or OPENROUTER_API_KEY environment variable."
    );
  }

  const headers: Record<string, string> = {
    "X-Title": OPENROUTER_APP_NAME,
  };

  // Only add HTTP-Referer if site URL is configured
  if (OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = OPENROUTER_SITE_URL;
  }

  return createOpenAI({
    apiKey: key,
    baseURL: OPENROUTER_BASE_URL,
    headers,
  });
}

/**
 * Get the model ID for transformation tasks (streaming)
 * @returns Model ID string
 */
export function getTransformModel(): string {
  return (
    process.env.OPENROUTER_MODEL_TRANSFORM ||
    "meta-llama/llama-3.3-70b-instruct"
  );
}

/**
 * Get the model ID for title generation (non-streaming)
 * @returns Model ID string
 */
export function getTitleModel(): string {
  return (
    process.env.OPENROUTER_MODEL_TITLE ||
    process.env.OPENROUTER_MODEL_TRANSFORM ||
    "meta-llama/llama-3.3-70b-instruct"
  );
}
