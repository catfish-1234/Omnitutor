import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { Subject, Message, Role } from '../types';

interface UseAIReturn {
    sendMessage: (text: string, subject: Subject, previousMessages: Message[]) => Promise<string>;
    isLoading: boolean;
    error: string | null;
    statusMessage: string | null;
}

export const useAI = (): UseAIReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const sendMessage = useCallback(async (text: string, subject: Subject, previousMessages: Message[]) => {
        setIsLoading(true);
        setError(null);
        setStatusMessage(null);

        // Common System Instruction
        let systemInstruction = `You are an expert ${subject} tutor.`;
        if ([Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY].includes(subject)) {
            systemInstruction += ` Use LaTeX for all math equations. Wrap block equations in $$ and inline in $. Provide clear, step-by-step explanations.`;
        }

        // --- 1. Try Groq (The Brain) ---
        try {
            const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!groqApiKey) throw new Error("Groq API Key missing");

            const groq = new Groq({ apiKey: groqApiKey, dangerouslyAllowBrowser: true });

            // Transform history for Groq (System message needs to be prepended)
            const messages: any[] = [
                { role: "system", content: systemInstruction },
                ...previousMessages.map(msg => ({
                    role: msg.role === Role.USER ? "user" : "assistant",
                    content: msg.content
                })),
                { role: "user", content: text }
            ];

            const completion = await groq.chat.completions.create({
                messages: messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                max_tokens: 1024,
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) throw new Error("Empty response from Groq");

            return response;

        } catch (groqError: any) {
            console.warn("Groq Limit/Error hit, switching to Gemini Fallback...", groqError);
            setStatusMessage("Traffic high. Switching to backup AI...");

            // --- 2. Fallback to Gemini (The Backup/Eyes) ---
            // Re-using the robust Gemini logic with retry
            let attempt = 0;
            const maxRetries = 1;

            try {
                const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!geminiApiKey) throw new Error("Gemini API Key missing");

                const genAI = new GoogleGenerativeAI(geminiApiKey);
                const geminiHistory = previousMessages.map(msg => ({
                    role: msg.role === Role.USER ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }));

                const model = genAI.getGenerativeModel({
                    model: "gemini-2.0-flash", // Use the working model
                    systemInstruction: systemInstruction,
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
                    ]
                });

                const chat = model.startChat({
                    history: geminiHistory,
                    generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
                });

                while (attempt <= maxRetries) {
                    try {
                        const result = await chat.sendMessage(text);
                        const response = await result.response;
                        return response.text();
                    } catch (geminiErr: any) {
                        const is429 = geminiErr.message?.includes('429') || geminiErr.status === 429;
                        if (is429 && attempt < maxRetries) {
                            setStatusMessage("Server busy. Retrying backup connection...");
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            attempt++;
                            continue;
                        } else {
                            throw geminiErr;
                        }
                    }
                }
                throw new Error("Max retries exceeded on fallback.");

            } catch (finalError: any) {
                console.error("All AI services failed.", finalError);
                setError(finalError.message || "All AI services are currently busy.");
                throw finalError;
            }
        } finally {
            setIsLoading(false);
            setStatusMessage(null);
        }
    }, []);

    return { sendMessage, isLoading, error, statusMessage };
};
