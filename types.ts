export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Timestamp {
  toDate: () => Date;
  seconds: number;
  nanoseconds: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date | Timestamp;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  subject: Subject;
  createdAt: Date | Timestamp;
  messages: Message[];
  userId: string;
}

export enum Subject {
  MATH = 'Math',
  PHYSICS = 'Physics',
  CHEMISTRY = 'Chemistry',
  HISTORY = 'History',
  CODING = 'Coding',
  GENERAL = 'General'
}

export interface GeminiConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
}