import { createTogetherAI } from "@ai-sdk/togetherai";
import { Client } from "@upstash/workflow";

const APP_NAME_HELICONE = "whisper-app";

export const togetheraiClient = createTogetherAI({
  apiKey: process.env.TOGETHER_API_KEY ?? "",
  baseURL: "https://together.helicone.ai/v1",
  headers: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Property-AppName": APP_NAME_HELICONE,
  },
});

// Dynamic TogetherAI client for client-side use
export function togetheraiClientWithKey(apiKey?: string) {
  return createTogetherAI({
    apiKey: apiKey || process.env.TOGETHER_API_KEY || "",
    baseURL: "https://together.helicone.ai/v1",
    headers: {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-AppName": APP_NAME_HELICONE,
    },
  });
}

export const upstashWorkflow = new Client({
  token: process.env.QSTASH_TOKEN || "",
});
