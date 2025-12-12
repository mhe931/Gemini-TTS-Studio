import { VoiceName } from "../types";
import { decodeBase64 } from "../utils/audioUtils";

const API_ENDPOINT = "/api/tts/generate";

/**
 * Generates audio for a single speaker by calling the external TTS API.
 */
export const generateSingleSpeakerAudio = async (
  text: string,
  voice: VoiceName
): Promise<Uint8Array> => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.audio_base64) {
      throw new Error("No audio data returned from API.");
    }

    return decodeBase64(data.audio_base64);
  } catch (error) {
    console.error("Error generating single speaker audio:", error);
    throw error;
  }
};
