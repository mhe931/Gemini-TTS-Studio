/**
 * Decodes a base64 string into a Uint8Array.
 */
export const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Declare lamejs global which is loaded via script tag in index.html
declare const lamejs: any;

/**
 * Encodes PCM data to MP3 using lamejs.
 * Gemini returns raw PCM, 24kHz, 1 channel, 16-bit (Int16).
 */
export const createMp3Blob = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
  if (typeof lamejs === 'undefined') {
    console.error("lamejs library not loaded");
    throw new Error("MP3 encoder library not found.");
  }

  // pcmData is Uint8Array of Int16 bytes (little endian).
  // Convert to Int16Array for lamejs.
  const samples = new Int16Array(pcmData.buffer);
  
  // Mono channel, sampleRate, 128kbps
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); 
  const mp3Data = [];
  
  // Encode in chunks
  const sampleBlockSize = 1152; 
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }
  
  return new Blob(mp3Data, { type: 'audio/mp3' });
};
