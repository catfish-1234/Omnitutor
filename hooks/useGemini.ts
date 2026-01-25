import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Subject, Message, Role } from '../types';

interface UseGeminiReturn {
  sendMessage: (text: string, subject: Subject, previousMessages: Message[]) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  statusMessage: string | null;
}

export const useGemini = (): UseGeminiReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string, subject: Subject, previousMessages: Message[]) => {
    setIsLoading(true);
    setError(null);
    setStatusMessage(null);

    let attempt = 0;
    const maxRetries = 1;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key is not configured (VITE_GEMINI_API_KEY missing).");

      const genAI = new GoogleGenerativeAI(apiKey);
      const history = previousMessages.map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Use clear model names
      const modelId = "gemini-2.0-flash";

      let systemInstruction = `You are an expert ${subject} tutor.`;
      if ([Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY].includes(subject)) {
        systemInstruction += ` Use LaTeX for all math equations. Wrap block equations in $$ and inline in $. Provide clear, step-by-step explanations.`;
      }

      const model = genAI.getGenerativeModel({
        model: modelId,
        systemInstruction: systemInstruction,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ]
      });

      const chat = model.startChat({
        history: history,
        generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
      });

      while (attempt <= maxRetries) {
        try {
          const result = await chat.sendMessage(text);
          const response = await result.response;
          return response.text();
        } catch (err: any) {
          const is429 = err.message?.includes('429') || err.status === 429;

          if (is429 && attempt < maxRetries) {
            console.warn("Hit 429 Rate Limit. Retrying in 3s...");
            setStatusMessage("Server is busy (High Traffic). Retrying in 3 seconds...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            attempt++;
            setStatusMessage("Retrying now...");
            continue; // Retry loop
          } else {
            throw err; // Not 429 or max retries reached
          }
        }
      }
      throw new Error("Max retries exceeded.");

    } catch (err: any) {
      console.error("FULL GEMINI ERROR:", err);
      if (err.response) console.error("Error Response:", err.response);

      const errorMessage = err.message || "Failed to communicate with Gemini.";
      setError(errorMessage);
      setStatusMessage(null); // Clear status on final error
      throw err;
    } finally {
      setIsLoading(false);
      setStatusMessage(null); // Clear status on success too
    }
  }, []);

  return { sendMessage, isLoading, error, statusMessage };
};