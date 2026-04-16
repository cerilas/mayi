import { GoogleGenAI } from "@google/genai";
import type { AIMessage, AIRequestOptions } from "@/types";
import { toolDeclarations, executeToolCall } from "@/ai/tools/builtinTools";
import { prisma } from "@/lib/prisma";

const URL_REGEX = /https?:\/\/[^\s"'<>()[\]{}]+/i;
const MAX_TOOL_TURNS = 5; // function calling döngüsü sınırı

async function getApiKey(): Promise<string> {
  // 1. Try DB setting (any admin who saved a key)
  try {
    const dbSetting = await prisma.setting.findFirst({
      where: { key: "gemini_api_key", value: { not: "" } },
      orderBy: { updatedAt: "desc" },
    });
    if (dbSetting?.value) return dbSetting.value;
  } catch { /* DB not ready, fall through */ }

  // 2. Fallback to env vars
  const geminiKey = process.env.GEMINI_API_KEY;
  const fallbackFromOpenAI =
    !geminiKey && (process.env.OPENAI_API_KEY ?? "").startsWith("AIza")
      ? process.env.OPENAI_API_KEY
      : undefined;
  const apiKey = geminiKey || fallbackFromOpenAI;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY tanımlanmamış. Lütfen Ayarlar'dan veya .env dosyasından Gemini anahtarınızı ekleyin."
    );
  }
  return apiKey;
}

function lastUserText(messages: AIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    const textPart = m.content.find((c) => c.type === "text");
    return textPart?.text ?? "";
  }
  return "";
}

function hasUrl(messages: AIMessage[]): boolean {
  return URL_REGEX.test(lastUserText(messages));
}

function stripInlineImages(text: string): string {
  return text.replace(/!\[.*?\]\(data:[^)]+\)/g, "[görsel]").trim() || "[görsel]";
}

function getSystemInstruction(messages: AIMessage[]): string | undefined {
  const sys = messages.find((m) => m.role === "system");
  return sys && typeof sys.content === "string" ? sys.content : undefined;
}

function buildContents(messages: AIMessage[]) {
  const filtered = messages.filter((m) => m.role !== "system");
  return filtered.map((msg) => {
    const role = msg.role === "assistant" ? "model" : "user";
    if (typeof msg.content === "string") {
      const text = role === "model" ? stripInlineImages(msg.content) : msg.content;
      return { role, parts: [{ text }] };
    }
    const parts = msg.content.map((c) => {
      if (c.type === "text") return { text: c.text ?? "" };
      if (role === "model") return { text: "[görsel/dosya]" };
      if (c.type === "inline_data" && c.inline_data) {
        return { inlineData: { mimeType: c.inline_data.mimeType, data: c.inline_data.data } };
      }
      const url = c.image_url?.url ?? "";
      const match = url.match(/^data:([^;]+);base64,([\s\S]+)$/);
      if (match) return { inlineData: { mimeType: match[1], data: match[2] } };
      return { text: "[görsel]" };
    });
    return { role, parts };
  });
}

// Gemini API kısıtı: googleSearch (built-in) ile functionDeclarations aynı istekte kullanılamaz.
// - URL varsa   → urlContext only  (sayfayı okur)
// - URL yoksa   → functionDeclarations only  (datetime, BMI vb.)
// - "Arama" isteği → googleSearch only  (geçici: ayrı fonksiyon)
function buildTools(messages: AIMessage[], webSearch?: boolean): { mode: "url" | "fn" | "search"; tools: Record<string, unknown>[] } {
  if (hasUrl(messages)) {
    return { mode: "url", tools: [{ urlContext: {} }] };
  }
  if (webSearch) {
    return { mode: "search", tools: [{ googleSearch: {} }] };
  }
  // Gemini 2.5+ models have google_search built-in; functionDeclarations conflicts.
  // Use no tools for normal requests — model handles math/date natively.
  return { mode: "fn", tools: [] };
}

// googleSearch sadece burada: hiçbir custom tool ile birleştirilmez
async function runGoogleSearch(
  ai: GoogleGenAI,
  model: string,
  contents: unknown[],
  systemInstruction?: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ text: string; candidate: any }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (ai.models as any).generateContent({
    model,
    contents,
    config: {
      ...(systemInstruction ? { systemInstruction } : {}),
      tools: [{ googleSearch: {} }],
    },
  });
  return {
    text: response.text ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    candidate: (response as any).candidates?.[0],
  };
}

// Run the function-calling loop: model may call our tools multiple times before
// producing a final text response. Returns the accumulated content array and
// last response.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runToolLoop(
  ai: GoogleGenAI,
  model: string,
  contents: unknown[],
  config: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ finalText: string; lastCandidate: any }> {
  let currentContents = [...contents];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastCandidate: any = null;

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (ai.models as any).generateContent({
      model,
      contents: currentContents,
      config,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = (response as any).candidates?.[0];
    lastCandidate = candidate;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionCalls: any[] = response.functionCalls ?? [];
    if (!functionCalls.length) {
      // No more function calls — return the text
      return { finalText: response.text ?? "", lastCandidate };
    }

    // Execute each function call and build the response parts
    const functionResponseParts = functionCalls.map((fc) => ({
      functionResponse: {
        id: fc.id,
        name: fc.name,
        response: { result: executeToolCall(fc.name, fc.args ?? {}) },
      },
    }));

    // Append model turn + function responses to contents
    currentContents = [
      ...currentContents,
      candidate.content,
      { role: "user", parts: functionResponseParts },
    ];
  }

  return { finalText: "", lastCandidate };
}

// Extract grounding chunks and return a formatted citations footnote
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCitations(candidate: any): string {
  const chunks: Array<{ web?: { uri?: string; title?: string } }> =
    candidate?.groundingMetadata?.groundingChunks ?? [];
  if (!chunks.length) return "";

  const lines = chunks
    .map((c, i) =>
      c.web?.uri
        ? `${i + 1}. [${c.web.title ?? c.web.uri}](${c.web.uri})`
        : null
    )
    .filter(Boolean) as string[];

  return lines.length ? `\n\n---\n**Kaynaklar**\n${lines.join("\n")}` : "";
}

// ─── Structured Output (Yapılandırılmış Yanıt) ─────────────────────────────

const STRUCTURED_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: {
            type: "string",
            description:
              "Bölüm başlığı. Kısa/basit yanıtlarda boş string kullan.",
          },
          content: {
            type: "string",
            description:
              "Bölüm içeriği. Markdown formatında yaz: **kalın**, *italik*, listeler, kod blokları kullanabilirsin.",
          },
        },
        required: ["heading", "content"],
      },
      description:
        "Yanıtın bölümleri. Kısa yanıtlarda tek bölüm (boş başlıklı) yeterli, detaylı konularda birden fazla başlıklı bölüm kullan.",
    },
    keyPoints: {
      type: "array",
      items: { type: "string" },
      description:
        "Önemli noktaların kısa listesi. Selamlaşma veya basit yanıtlarda boş dizi [] kullan.",
    },
  },
  required: ["sections", "keyPoints"],
};

function formatStructuredResponse(jsonText: string): string {
  try {
    const parsed = JSON.parse(jsonText) as {
      sections: Array<{ heading: string; content: string }>;
      keyPoints: string[];
    };

    const parts: string[] = [];

    for (const section of parsed.sections) {
      if (section.heading) {
        parts.push(`## ${section.heading}\n\n${section.content}`);
      } else {
        parts.push(section.content);
      }
    }

    if (parsed.keyPoints && parsed.keyPoints.length > 0) {
      parts.push(
        `📌 **Önemli Noktalar:**\n${parsed.keyPoints
          .map((p) => `- ${p}`)
          .join("\n")}`
      );
    }

    return parts.join("\n\n").trim();
  } catch {
    // JSON parse hatası — ham metin döndür
    return jsonText;
  }
}

export async function streamGemini(
  options: AIRequestOptions,
  onChunk: (text: string) => void
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: await getApiKey() });
  const systemInstruction = getSystemInstruction(options.messages);
  const contents = buildContents(options.messages);
  const { mode, tools } = buildTools(options.messages, options.webSearch);

  const config: Record<string, unknown> = {
    ...(systemInstruction ? { systemInstruction } : {}),
    ...(tools.length > 0 ? { tools } : {}),
  };

  // URL mode: urlContext, non-streaming
  if (mode === "url") {
    const { finalText, lastCandidate } = await runToolLoop(ai, options.model, contents, config);
    const citations = extractCitations(lastCandidate);
    const full = finalText + citations;
    if (full) onChunk(full);
    return full;
  }

  // Google Search mode: non-streaming
  if (mode === "search") {
    const { text, candidate } = await runGoogleSearch(ai, options.model, contents, systemInstruction);
    const citations = extractCitations(candidate);
    const full = text + citations;
    if (full) onChunk(full);
    return full;
  }

  // Structured output mode: non-streaming JSON → formatted markdown
  if (options.structuredOutput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (ai.models as any).generateContent({
      model: options.model,
      contents,
      config: {
        ...config,
        responseMimeType: "application/json",
        responseJsonSchema: STRUCTURED_RESPONSE_SCHEMA,
      },
    });

    const formatted = formatStructuredResponse(response.text ?? "");
    if (formatted) onChunk(formatted);
    return formatted;
  }

  // Function calling mode: try streaming, handle tool calls if they appear
  const streamResult = await ai.models.generateContentStream({
    model: options.model,
    contents,
    config,
  });

  let full = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastCandidate: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pendingFunctionCalls: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastModelContent: any = null;

  for await (const chunk of streamResult) {
    const text = chunk.text ?? "";
    if (text) {
      full += text;
      onChunk(text);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = (chunk as any).candidates?.[0];
    if (candidate) {
      lastCandidate = candidate;
      lastModelContent = candidate.content;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fcs: any[] = (chunk as any).functionCalls ?? [];
    if (fcs.length) pendingFunctionCalls = fcs;
  }

  // If the streaming response triggered function calls, continue the loop
  if (pendingFunctionCalls.length) {
    const functionResponseParts = pendingFunctionCalls.map((fc) => ({
      functionResponse: {
        id: fc.id,
        name: fc.name,
        response: { result: executeToolCall(fc.name, fc.args ?? {}) },
      },
    }));

    const continuedContents = [
      ...contents,
      lastModelContent,
      { role: "user", parts: functionResponseParts },
    ];
    const { finalText, lastCandidate: lc } = await runToolLoop(ai, options.model, continuedContents, config);
    lastCandidate = lc;
    full = finalText;
    if (finalText) onChunk(finalText);
  }

  const citations = extractCitations(lastCandidate);
  if (citations) onChunk(citations);
  return full + citations;
}

export async function chatGemini(options: AIRequestOptions): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: await getApiKey() });
  const systemInstruction = getSystemInstruction(options.messages);
  const contents = buildContents(options.messages);
  const { tools } = buildTools(options.messages, options.webSearch);

  const config: Record<string, unknown> = {
    ...(systemInstruction ? { systemInstruction } : {}),
    ...(tools.length > 0 ? { tools } : {}),
  };

  // Structured output mode
  if (options.structuredOutput && tools.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (ai.models as any).generateContent({
      model: options.model,
      contents,
      config: {
        ...config,
        responseMimeType: "application/json",
        responseJsonSchema: STRUCTURED_RESPONSE_SCHEMA,
      },
    });
    return formatStructuredResponse(response.text ?? "");
  }

  const { finalText, lastCandidate } = await runToolLoop(ai, options.model, contents, config);
  const citations = extractCitations(lastCandidate);
  return finalText + citations;
}
