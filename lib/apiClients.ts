import OpenAI from "openai";

const APP_NAME_HELICONE = "whisper-app";

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  baseURL: "https://oai.helicone.ai/v1",
  defaultHeaders: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Property-AppName": APP_NAME_HELICONE,
  },
});

// Dynamic OpenAI client for client-side use
export function openaiClientWithKey(apiKey?: string) {
  const baseOptions: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey: apiKey || process.env.OPENAI_API_KEY || "",
  };

  if (process.env.HELICONE_API_KEY) {
    baseOptions.baseURL = "https://oai.helicone.ai/v1";
    baseOptions.defaultHeaders = {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-AppName": APP_NAME_HELICONE,
    };
  }

  return new OpenAI(baseOptions);
}
