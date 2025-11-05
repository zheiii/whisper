/**
 * Ink-Whisper (Cartesia) Adapter
 * Handles audio transcription via Cartesia's Ink-Whisper model
 */

import { CartesiaClient } from "@cartesia/cartesia-js";

interface TranscribeOptions {
  language?: string;
}

/**
 * Transcribe audio from a URL using Cartesia Ink-Whisper
 * @param audioUrl - S3 URL or public URL to the audio file
 * @param options - Optional transcription settings (language, etc.)
 * @param apiKey - Optional API key (falls back to env variable)
 * @returns The transcribed text
 */
export async function transcribeWithInkWhisper(
  audioUrl: string,
  options?: TranscribeOptions,
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.CARTESIA_API_KEY;

  if (!key) {
    throw new Error(
      "Cartesia API key is required. Please provide it via parameter or CARTESIA_API_KEY environment variable."
    );
  }

  // Download the audio file from the URL
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio file from URL: ${audioResponse.statusText}`);
  }

  // Convert to Buffer for Cartesia
  const audioArrayBuffer = await audioResponse.arrayBuffer();
  const audioBuffer = Buffer.from(audioArrayBuffer);

  try {
    const client = new CartesiaClient({ apiKey: key });

    // Convert Buffer to Blob for Cartesia API
    const audioBlob = new Blob([audioBuffer]);

    const result = await client.stt.transcribe(audioBlob, {
      model: "ink-whisper",
      language: options?.language || "en",
    });

    if (!result?.text) {
      throw new Error("No transcription text received from Cartesia Ink-Whisper");
    }

    return result.text;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Cartesia Ink-Whisper error: ${error.message}`);
    }
    throw new Error("Failed to transcribe audio via Cartesia Ink-Whisper");
  }
}
