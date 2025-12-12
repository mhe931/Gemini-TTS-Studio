export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export enum TTSMode {
  Single = 'Single Speaker',
  Conversation = 'Conversation',
  Document = 'Document Processing',
}

export interface GeneratedAudio {
  id: string;
  url: string; // Blob URL
  timestamp: number;
  mode: TTSMode;
  textSnippet: string;
  duration?: number;
}

export interface ConversationLine {
  speaker: string; // 'Speaker A' or 'Speaker B'
  text: string;
}

export interface SpeakerConfig {
  name: string; // e.g., 'Joe'
  voice: VoiceName;
}