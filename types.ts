export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  en: string;
  zh: string;
}

export interface VocabWord {
  word: string;
  definition: string;
  example: string;
  phonetic?: string;
  partOfSpeech?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  LEARNING = 'LEARNING',
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  loopSingleSentence: boolean;
  isLoopingAll: boolean;
}