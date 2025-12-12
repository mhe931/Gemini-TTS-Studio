import { VoiceName } from "../types";
import { decodeBase64 } from "../utils/audioUtils";

const API_ENDPOINT = "/api/tts/sovits/generate";

/**
 * Generates audio for a single speaker by calling the external SoVITS TTS API.
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
      const errorBody = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorBody || response.statusText}`);
    }

    const data = await response.json();

    if (!data.audio_base64) {
      throw new Error("Invalid response from API: Missing 'audio_base64' field.");
    }

    return decodeBase64(data.audio_base64);
  } catch (error) {
    console.error("Error generating single speaker audio:", error);
    throw error;
  }
};
