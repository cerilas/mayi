import OpenAI from "openai";
import type { AIMessage, AIRequestOptions } from "@/types";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY tanımlanmamış. Lütfen .env dosyasına ekleyin."
    );
  }
  if (apiKey.startsWith("AIza")) {
    throw new Error(
      "OPENAI_API_KEY değeri Gemini anahtarı formatında görünüyor. OpenAI için sk- ile başlayan anahtar kullanın veya sağlayıcıyı Gemini seçin."
    );
  }
  return new OpenAI({ apiKey });
}

function buildMessages(messages: AIMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((msg): OpenAI.Chat.ChatCompletionMessageParam => {
    if (typeof msg.content === "string") {
      if (msg.role === "system") return { role: "system", content: msg.content };
      if (msg.role === "assistant") return { role: "assistant", content: msg.content };
      return { role: "user", content: msg.content };
    }
    // Vision: content array (only user messages support vision parts)
    const parts: OpenAI.Chat.ChatCompletionContentPart[] = msg.content.map((c) => {
      if (c.type === "text") return { type: "text", text: c.text ?? "" };
      return {
        type: "image_url",
        image_url: { url: c.image_url?.url ?? "" },
      };
    });
    return { role: "user", content: parts };
  });
}

export async function streamOpenAI(
  options: AIRequestOptions,
  onChunk: (text: string) => void
): Promise<string> {
  const client = getClient();
  const stream = await client.chat.completions.create({
    model: options.model,
    messages: buildMessages(options.messages),
    stream: true,
  });

  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      full += delta;
      onChunk(delta);
    }
  }
  return full;
}

export async function chatOpenAI(options: AIRequestOptions): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: options.model,
    messages: buildMessages(options.messages),
    stream: false,
  });
  return response.choices[0]?.message?.content ?? "";
}
