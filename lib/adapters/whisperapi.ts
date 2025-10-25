/**
 * WhisperAPI (Lemonfox) Adapter
 * Handles audio transcription via Lemonfox's speech-to-text API
 */

const WHISPERAPI_BASE_URL =
  process.env.LEMONFOX_BASE_URL || "https://api.lemonfox.ai";

interface TranscribeOptions {
  language?: string;
}

interface WhisperAPIResponse {
  text: string;
}

/**
 * Transcribe audio from a URL using Lemonfox WhisperAPI
 * @param audioUrl - S3 URL or public URL to the audio file
 * @param options - Optional transcription settings (language, etc.)
 * @param apiKey - Optional API key (falls back to env variable)
 * @returns The transcribed text
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options?: TranscribeOptions,
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.LEMONFOX_API_KEY;

  if (!key) {
    throw new Error(
      "Lemonfox API key is required. Please provide it via parameter or LEMONFOX_API_KEY environment variable."
    );
  }

  // Download the audio file from the URL
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio file from URL: ${audioResponse.statusText}`);
  }

  const audioBlob = await audioResponse.blob();

  // Extract filename from URL or use default
  const urlParts = audioUrl.split('/');
  const filename = urlParts[urlParts.length - 1] || 'audio.mp3';

  // Lemonfox API uses FormData with actual file data
  const formData = new FormData();
  formData.append("file", audioBlob, filename);
  formData.append("response_format", "json");

  if (options?.language) {
    formData.append("language", options.language);
  }

  try {
    const response = await fetch(`${WHISPERAPI_BASE_URL}/v1/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        // Note: Don't set Content-Type header - browser will set it automatically with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid Lemonfox API key. Please check your credentials.");
      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Invalid request: ${errorData.error || errorData.message || "Missing or invalid file"}`
        );
      } else {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(
          `Lemonfox API error: ${response.status} - ${errorText}`
        );
      }
    }

    const data: WhisperAPIResponse = await response.json();

    if (!data.text) {
      throw new Error("No transcription text received from Lemonfox API");
    }

    return data.text;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to transcribe audio via Lemonfox WhisperAPI");
  }
}
