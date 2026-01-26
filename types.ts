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
  attachment?: Attachment;
}

export interface Attachment {
  content: string; // Base64 or text content
  type: 'image' | 'text';
  mimeType?: string;
  fileName?: string;
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
  BIOLOGY = 'Biology',
  LITERATURE = 'Literature',
  CODING = 'Coding',
  GENERAL = 'General'
}

export interface GeminiConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
}