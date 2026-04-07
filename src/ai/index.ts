import type { AIProvider, AIRequestOptions } from "@/types";
import { streamOpenAI, chatOpenAI } from "./providers/openai";
import { streamGemini, chatGemini } from "./providers/gemini";
import { appConfig } from "@/lib/config";

export async function streamAI(
  options: AIRequestOptions,
  onChunk: (text: string) => void
): Promise<string> {
  const provider: AIProvider = options.provider;

  if (provider === "openai") return streamOpenAI(options, onChunk);
  if (provider === "gemini") return streamGemini(options, onChunk);

  throw new Error(`Desteklenmeyen AI sağlayıcısı: ${provider}`);
}

export async function chatAI(options: AIRequestOptions): Promise<string> {
  const provider: AIProvider = options.provider;

  if (provider === "openai") return chatOpenAI(options);
  if (provider === "gemini") return chatGemini(options);

  throw new Error(`Desteklenmeyen AI sağlayıcısı: ${provider}`);
}

export async function generateTitle(
  userMessage: string,
  provider: AIProvider,
  model: string
): Promise<string> {
  try {
    const response = await chatAI({
      provider,
      model,
      messages: [
        {
          role: "user",
          content: `Bu mesaja kısa, açıklayıcı bir sohbet başlığı üret (en fazla 6 kelime, Türkçe veya konunun dilinde). Sadece başlığı yaz, başka açıklama ekleme:\n\n"${userMessage.slice(0, 200)}"`,
        },
      ],
    });
    return response.trim().replace(/^["']|["']$/g, "").slice(0, 60);
  } catch {
    return userMessage.slice(0, 40);
  }
}

export { appConfig };
