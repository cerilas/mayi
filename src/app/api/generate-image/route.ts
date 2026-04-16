import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

const IMAGE_GEN_MODEL = "gemini-3.1-flash-image-preview";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  // prompt: string (required)
  // conversationId: string (required for DB save)
  // inputImage?: { mimeType: string; base64: string } (optional, for image editing)
  const { prompt, conversationId, inputImage } = await req.json().catch(() => ({}));
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Geçersiz prompt" }, { status: 400 });
  }

  // Try DB setting first, then env var
  let apiKey: string | undefined;
  try {
    const dbSetting = await prisma.setting.findFirst({
      where: { key: "gemini_api_key", value: { not: "" } },
      orderBy: { updatedAt: "desc" },
    });
    if (dbSetting?.value) apiKey = dbSetting.value;
  } catch { /* fall through */ }
  if (!apiKey) apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key bulunamadı" }, { status: 500 });
  }

  // Verify conversation belongs to user (if provided)
  if (conversationId) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id, deletedAt: null },
    });
    if (!conv) {
      return NextResponse.json({ error: "Sohbet bulunamadı" }, { status: 404 });
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build contents in the correct @google/genai format
    let contents: string | { role: string; parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] }[];
    if (inputImage?.base64 && inputImage?.mimeType) {
      contents = [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: inputImage.mimeType, data: inputImage.base64 } },
          ],
        },
      ];
    } else {
      contents = prompt; // plain string — the SDK wraps this as a user turn automatically
    }

    // Save user message to DB before calling API
    let userMsgId: string | null = null;
    if (conversationId) {
      const userMsg = await prisma.message.create({
        data: {
          conversationId,
          role: "user",
          content: `🎨 Görsel üret: ${prompt}`,
          provider: "gemini",
          model: IMAGE_GEN_MODEL,
          status: "done",
        },
      });
      userMsgId = userMsg.id;
    }

    const response = await ai.models.generateContent({
      model: IMAGE_GEN_MODEL,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contents: contents as any,
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });

    const responseParts = response.candidates?.[0]?.content?.parts ?? [];
    const imageData: { mimeType: string; base64: string }[] = [];
    const texts: string[] = [];

    for (const part of responseParts) {
      if (part.inlineData?.data) {
        imageData.push({
          mimeType: part.inlineData.mimeType ?? "image/png",
          base64: part.inlineData.data,
        });
      } else if (part.text) {
        texts.push(part.text);
      }
    }

    // Build markdown content for assistant message
    let assistantContent = texts.join("\n").trim();
    if (imageData.length > 0) {
      const imgMarkdown = imageData
        .map((img) => `![Oluşturulan görsel](data:${img.mimeType};base64,${img.base64})`)
        .join("\n\n");
      assistantContent = imgMarkdown + (assistantContent ? `\n\n${assistantContent}` : "");
    }

    // Save assistant message to DB
    let assistantMsgId: string | null = null;
    if (conversationId) {
      const assistantMsg = await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: assistantContent || "Görsel oluşturuldu.",
          provider: "gemini",
          model: IMAGE_GEN_MODEL,
          status: "done",
        },
      });
      assistantMsgId = assistantMsg.id;
    }

    return NextResponse.json({
      images: imageData,
      text: texts.join("\n").trim(),
      assistantContent: assistantContent || "Görsel oluşturuldu.",
      userMsgId,
      assistantMsgId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Görsel oluşturulamadı";
    console.error("Image generation error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
