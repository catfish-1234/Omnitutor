import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Subject } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const getSystemInstruction = (subject: Subject): string => {
  const baseInstruction = `You are a helpful, expert tutor specializing in ${subject}.`;
  
  if (subject === Subject.MATH || subject === Subject.PHYSICS || subject === Subject.CHEMISTRY) {
    return `${baseInstruction} 
    - CRITICAL: You MUST use LaTeX formatting for all mathematical equations, formulas, and symbols.
    - Wrap block equations in double dollar signs: $$ ... $$
    - Wrap inline equations in single dollar signs: $ ... $
    - Explain concepts step-by-step.
    - If the user makes a mistake, gently correct them.`;
  }
  
  if (subject === Subject.CODING) {
    return `${baseInstruction} Provide clean, well-commented code snippets. Explain the logic behind the code.`;
  }

  return `${baseInstruction} Be concise and clear.`;
};

export const generateTutorResponse = async (
  prompt: string,
  subject: Subject,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Error: API_KEY is missing in environment variables.";
  }

  try {
    const modelId = (subject === Subject.MATH || subject === Subject.PHYSICS || subject === Subject.CODING)
      ? 'gemini-3-pro-preview' 
      : 'gemini-3-flash-preview';

    // We use generateContent with system instructions. 
    // Ideally, for history, we would use chat.sendMessage, but to keep the service stateless
    // relative to the React component, we pass history manually or maintain a chat instance in the hook.
    // Here we will use a fresh chat session config for each "turn" if we want to strictly follow the prompt's
    // requirement to "append system instruction" effectively. 
    
    // However, the best practice with the new SDK is to use the Chat object for conversation history.
    
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: getSystemInstruction(subject),
      },
      history: history // Pass existing history to maintain context
    });

    const result: GenerateContentResponse = await chat.sendMessage({ message: prompt });
    return result.text || "I couldn't generate a response.";
    
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};