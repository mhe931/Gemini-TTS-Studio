import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName, SpeakerConfig, ConversationLine } from "../types";

const API_KEY = process.env.API_KEY || '';

if (!API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_NAME = "gemini-2.5-flash-preview-tts";

export const generateSingleSpeakerAudio = async (
  text: string,
  voice: VoiceName
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini.");
    }
    
    return base64Audio;
  } catch (error) {
    console.error("Error generating single speaker audio:", error);
    throw error;
  }
};

export const generateMultiSpeakerAudio = async (
  lines: ConversationLine[],
  speaker1: SpeakerConfig,
  speaker2: SpeakerConfig
): Promise<string> => {
  try {
    // Construct the prompt script
    const script = lines.map(line => {
      const name = line.speaker === 'Speaker A' ? speaker1.name : speaker2.name;
      return `${name}: ${line.text}`;
    }).join('\n');

    const prompt = `TTS the following conversation between ${speaker1.name} and ${speaker2.name}:\n${script}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: speaker1.name,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker1.voice } }
              },
              {
                speaker: speaker2.name,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker2.voice } }
              }
            ]
          }
        }
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini.");
    }

    return base64Audio;
  } catch (error) {
    console.error("Error generating multi-speaker audio:", error);
    throw error;
  }
};
