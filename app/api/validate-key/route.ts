import { openRouterClient, getTransformModel } from "@/lib/adapters/openrouter";
import { generateText } from "ai";

export async function POST(request: Request) {
  const { apiKey, provider } = await request.json();

  if (!apiKey) {
    return new Response(JSON.stringify({ message: "API key is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!provider || !["openrouter", "whisper"].includes(provider)) {
    return new Response(
      JSON.stringify({ message: "Valid provider is required (openrouter or whisper)" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    if (provider === "openrouter") {
      // Validate OpenRouter key with a small LLM call
      const customClient = openRouterClient(apiKey);
      await generateText({
        model: customClient(getTransformModel()),
        maxTokens: 10,
        messages: [
          {
            role: "user",
            content: "hello",
          },
        ],
      });
    } else if (provider === "whisper") {
      // Validate Lemonfox WhisperAPI key by checking endpoint
      const baseUrl = process.env.LEMONFOX_BASE_URL || "https://api.lemonfox.ai";
      const response = await fetch(`${baseUrl}/v1/speech-to-text`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: "https://example.com/test.mp3",
        }),
      });

      // If 401, key is invalid; if 400, key is valid but payload is bad (expected)
      if (response.status === 401) {
        throw new Error("Invalid Lemonfox API key");
      }
      // Any other status is acceptable for validation purposes
    }

    return new Response(JSON.stringify({ message: "API key is valid" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("API key validation failed:", error);
    return new Response(
      JSON.stringify({ message: "API key is invalid", error: error.message }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
