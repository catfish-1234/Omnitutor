import { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Subject, Message, Role } from '../types';

interface UseGeminiReturn {
  sendMessage: (text: string, subject: Subject, previousMessages: Message[]) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

export const useGemini = (): UseGeminiReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string, subject: Subject, previousMessages: Message[]) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!process.env.API_KEY) {
        throw new Error("Gemini API Key is not configured.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Transform internal Message type to Gemini history format
      const history = previousMessages.map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const modelId = (subject === Subject.MATH || subject === Subject.PHYSICS || subject === Subject.CODING)
        ? 'gemini-3-pro-preview' // Better reasoning for STEM
        : 'gemini-3-flash-preview';

      let systemInstruction = `You are an expert ${subject} tutor.`;
      if ([Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY].includes(subject)) {
        systemInstruction += ` Use LaTeX for all math equations. Wrap block equations in $$ and inline in $. Provide clear, step-by-step explanations.`;
      }

      const chat = ai.chats.create({
        model: modelId,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
        history: history
      });

      const result = await chat.sendMessage({ message: text });
      
      // Artificial delay for better UX if response is too fast
      // await new Promise(resolve => setTimeout(resolve, 500));

      return result.text || "";

    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "Failed to communicate with Gemini.";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendMessage, isLoading, error };
};