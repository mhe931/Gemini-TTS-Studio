import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName, SpeakerConfig, ConversationLine } from "../types";
import { decodeBase64 } from "../utils/audioUtils";

const API_KEY = process.env.API_KEY || '';

if (!API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_NAME = "gemini-2.5-flash-preview-tts";

// CRITICAL SETTING: 
// Reduced to 120 characters. This is very granular but necessary to ensure 
// the response payloads are small enough to pass through strict XHR proxies 
// without triggering "Rpc failed" or timeout errors.
const MAX_CHARS_PER_BATCH = 120;

// Helper to concatenate Uint8Arrays
const concatenateAudioBuffers = (buffers: Uint8Array[]): Uint8Array => {
  const totalLength = buffers.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
};

// Helper for retry logic
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;
    
    // Check for Rate Limits (429)
    const isRateLimit = 
        error.status === 429 || 
        error.code === 429 || 
        error.status === 'RESOURCE_EXHAUSTED' || 
        (error.message && error.message.includes('429')) ||
        (error.message && error.message.includes('quota'));
        
    // Check for Server/Proxy Errors (500, 503, XHR failed)
    const isServerOverload = 
        error.status === 500 || 
        error.status === 503 || 
        error.status === 'INTERNAL' ||
        error.status === 'UNKNOWN'; 

    const isNetwork = 
        error.message && (
          error.message.includes('fetch') || 
          error.message.includes('network') ||
          error.message.includes('xhr error') || 
          error.message.includes('Rpc failed')
        );

    if (isRateLimit || isServerOverload || isNetwork) {
       let waitTime = delay;
       
       if (isRateLimit) {
           console.warn("Hit rate limit (429). Initiating long backoff.");
           waitTime = Math.max(delay, 5000); 
       } else if (isNetwork) {
           // RPC/XHR errors often indicate network congestion or proxy timeout.
           // Wait longer to let the connection clear.
           console.warn("Network/RPC error detected. Waiting 5s before retry.");
           waitTime = 5000;
       }

       console.warn(`Retry attempt ${4 - retries} of 3. Waiting ${waitTime}ms. Error: ${error.message}`);
       await new Promise(resolve => setTimeout(resolve, waitTime));
       
       // Exponential backoff for subsequent retries
       return retry(fn, retries - 1, waitTime * 1.5); 
    }
    throw error;
  }
}

// Throttling helper to prevent flooding the API
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to split long text into chunks ensuring sentence boundaries
const splitTextIntoChunks = (text: string, maxChars: number): string[] => {
  if (text.length <= maxChars) return [text];
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Split by sentences roughly
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];
  
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      // Force split long sentence
      let remaining = sentence;
      while (remaining.length > 0) {
        chunks.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      continue;
    }

    if (currentChunk.length + sentence.length > maxChars) {
      if (currentChunk.trim()) chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk);
  
  return chunks;
};

export const generateSingleSpeakerAudio = async (
  text: string,
  voice: VoiceName
): Promise<Uint8Array> => {
  try {
    const chunks = splitTextIntoChunks(text, MAX_CHARS_PER_BATCH);
    const audioBuffers: Uint8Array[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk.trim()) continue;
      
      // Throttle: 2s delay between requests to prevent XHR/Proxy congestion
      if (i > 0) await wait(2000);

      const buffer = await retry(async () => {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: [{ parts: [{ text: chunk }] }],
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
           console.warn("Empty audio response for chunk");
           return null;
        }
        return decodeBase64(base64Audio);
      });

      if (buffer) {
        audioBuffers.push(buffer);
      }
    }

    if (audioBuffers.length === 0) {
       throw new Error("No audio data returned from Gemini.");
    }
    
    return concatenateAudioBuffers(audioBuffers);

  } catch (error) {
    console.error("Error generating single speaker audio:", error);
    throw error;
  }
};

export const generateMultiSpeakerAudio = async (
  lines: ConversationLine[],
  speaker1: SpeakerConfig,
  speaker2: SpeakerConfig
): Promise<Uint8Array> => {
  try {
    const normalizedLines: ConversationLine[] = [];
    
    // Strict limit: SAFE_CHUNK_SIZE must be small enough that prompt + chunk < XHR limit
    const SAFE_CHUNK_SIZE = MAX_CHARS_PER_BATCH - 60; 

    for (const line of lines) {
        if (line.text.length > SAFE_CHUNK_SIZE) {
            const textChunks = splitTextIntoChunks(line.text, SAFE_CHUNK_SIZE);
            textChunks.forEach(chunk => {
                normalizedLines.push({ speaker: line.speaker, text: chunk });
            });
        } else {
            normalizedLines.push(line);
        }
    }

    const batches: ConversationLine[][] = [];
    let currentBatch: ConversationLine[] = [];
    let currentBatchLength = 0;

    for (const line of normalizedLines) {
      const lineLength = line.text.length + 30; // Estimation overhead
      
      if (currentBatchLength + lineLength > MAX_CHARS_PER_BATCH && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchLength = 0;
      }
      
      currentBatch.push(line);
      currentBatchLength += lineLength;
    }
    if (currentBatch.length > 0) batches.push(currentBatch);

    const audioBuffers: Uint8Array[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Throttle: 2s delay between batches
      if (i > 0) await wait(2000);

      const script = batch.map(line => {
        const name = line.speaker === 'Speaker A' ? speaker1.name : speaker2.name;
        return `${name}: ${line.text}`;
      }).join('\n');

      const prompt = `TTS the following conversation between ${speaker1.name} and ${speaker2.name}:\n${script}`;

      try {
        const buffer = await retry(async () => {
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
            if (base64Audio) {
                return decodeBase64(base64Audio);
            }
            return null;
        });

        if (buffer) {
            audioBuffers.push(buffer);
        } else {
             console.warn(`Batch ${i + 1} returned no audio data.`);
        }

      } catch (batchError) {
          console.error(`Error processing batch ${i + 1}:`, batchError);
          throw batchError;
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error("No audio data returned from Gemini.");
    }

    return concatenateAudioBuffers(audioBuffers);
  } catch (error) {
    console.error("Error generating multi-speaker audio:", error);
    throw error;
  }
};