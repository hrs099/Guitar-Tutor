export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface StreamingStatus {
  isConnected: boolean;
  isAudioStreaming: boolean;
  isVideoStreaming: boolean;
  error: string | null;
}

export interface Recording {
  id: string;
  url: string;
  timestamp: Date;
  duration: number; // in seconds
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';