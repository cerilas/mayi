import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { streamAI, chatAI, generateTitle } from "@/ai";
import { appConfig } from "@/lib/config";
import type { AIMessage, AIMessageContent, AIProvider } from "@/types";
import path from "path";
import fs from "fs";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} zaman aşımına uğradı (${timeoutMs / 1000}s)`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { id: conversationId } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: session.user.id, deletedAt: null },
  });
  if (!conversation)
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const userContent: string = (body.content ?? "").toString().trim();
  const attachmentIds: string[] = body.attachmentIds ?? [];
  const requestedProvider: AIProvider = body.provider ?? conversation.aiProvider;
  const requestedModel: string = body.model ?? conversation.aiModel;
  const webSearch: boolean = body.webSearch === true;

  const openAIKey = process.env.OPENAI_API_KEY ?? "";
  const hasGeminiKey = !!process.env.GEMINI_API_KEY || openAIKey.startsWith("AIza");
  const forceGemini = requestedProvider === "openai" && openAIKey.startsWith("AIza") && hasGeminiKey;

  const provider: AIProvider = forceGemini ? "gemini" : requestedProvider;
  const model: string = forceGemini
    ? appConfig.ai.providers.gemini.models[0].id
    : requestedModel;

  if (!userContent && attachmentIds.length === 0) {
    return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });
  }

  const userMsg = await prisma.message.create({
    data: { conversationId, role: "user", content: userContent, provider, model },
    include: { attachments: true },
  });

  if (attachmentIds.length > 0) {
    await prisma.attachment.updateMany({
      where: { id: { in: attachmentIds } },
      data: { messageId: userMsg.id },
    });
  }

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: { attachments: true },
  });

  function buildContent(msgContent: string, attList: typeof history[0]["attachments"], role: string): string | AIMessageContent[] {
    const isUser = role === "user";

    // Strip data: URI images from content string — Gemini rejects inlineData in model role.
    // For user messages we want to keep them as inlineData parts instead.
    const inlineImageRegex = /!\[.*?\]\((data:([^;]+);base64,([A-Za-z0-9+/=]+))\)/g;
    const inlineImageParts: AIMessageContent[] = [];
    const strippedContent = msgContent.replace(inlineImageRegex, (_, url, mimeType) => {
      if (isUser) inlineImageParts.push({ type: "image_url", image_url: { url } });
      return "";
    }).trim();

    // File attachment images (only for user messages)
    const fileImageParts: AIMessageContent[] = [];
    if (isUser) {
      for (const att of attList.filter((a) => a.mimeType.startsWith("image/"))) {
        const absPath = path.join(process.cwd(), att.filePath);
        try {
          const b64 = fs.readFileSync(absPath).toString("base64");
          fileImageParts.push({ type: "image_url", image_url: { url: `data:${att.mimeType};base64,${b64}` } });
        } catch { /* skip */ }
      }
    }

    // PDF attachments (only for user messages, inline base64)
    const filePdfParts: AIMessageContent[] = [];
    if (isUser) {
      for (const att of attList.filter((a) => a.mimeType === "application/pdf")) {
        const absPath = path.join(process.cwd(), att.filePath);
        try {
          const b64 = fs.readFileSync(absPath).toString("base64");
          filePdfParts.push({ type: "inline_data", inline_data: { mimeType: "application/pdf", data: b64 } });
        } catch { /* skip */ }
      }
    }

    const hasData = inlineImageParts.length > 0 || fileImageParts.length > 0 || filePdfParts.length > 0;
    if (!hasData) {
      // No files to attach; return plain string (stripped for safety)
      return strippedContent || msgContent;
    }

    // Build multi-part content for user messages with files
    const parts: AIMessageContent[] = [];
    if (strippedContent) parts.push({ type: "text", text: strippedContent });
    parts.push(...inlineImageParts, ...fileImageParts, ...filePdfParts);
    return parts;
  }

  const nowTR = new Date().toLocaleString("tr-TR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  });

  // Fetch per-user base instruction + custom system instruction from DB
  let customInstruction = "";
  let dbBaseInstruction = "";
  try {
    const settings = await prisma.setting.findMany({
      where: { userId: session.user.id, key: { in: ["system_instruction", "base_instruction"] } },
    });
    for (const s of settings) {
      if (s.key === "system_instruction") customInstruction = s.value;
      if (s.key === "base_instruction") dbBaseInstruction = s.value;
    }
  } catch { /* ignore */ }

  const defaultBase =
    "Sen yardımcı bir yapay zeka asistanısın. Türkçe cevap ver." +
    " Kullanıcı senden bir görseli düzenlemeni, değiştirmeni veya yeni görsel oluşturmanı isterse, bunu kendin yapamayacağını belirt ve mesaj kutusunun yanındaki 🎨 (Görsel Üret) butonuna tıklayarak görsel üretme moduna geçmesini söyle." +
    " Asla '🎨 Görsel üret:' önekiyle başlayan mesajlar üretme.";

  const baseInstruction =
    `Şu anki tarih ve saat: ${nowTR} (Türkiye saati). ` +
    (dbBaseInstruction || defaultBase) +
    (appConfig.disclaimer.enabled
      ? " Hatırlat: Bu içerik yalnızca bilgilendirme amaçlıdır; uzman değerlendirmesi gereklidir."
      : "");

  const aiMessages: AIMessage[] = [
    {
      role: "system",
      content: customInstruction
        ? `${baseInstruction}\n\nÖzel Talimatlar:\n${customInstruction}`
        : baseInstruction,
    },
    ...history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: buildContent(msg.content, msg.attachments, msg.role),
    })),
  ];

  // PDF attachments need more time to process
  const hasPdfAttachment = history.some((m) =>
    m.attachments.some((a) => a.mimeType === "application/pdf")
  );

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";
      const generationTimeoutMs = hasPdfAttachment ? 180000 : 90000;

      // Send keep-alive immediately so the client watchdog doesn't fire
      // while Gemini is processing large payloads (PDFs, long histories)
      if (hasPdfAttachment) {
        controller.enqueue(new TextEncoder().encode("__KEEPALIVE__"));
      }

      try {
        if (appConfig.ai.enableStreaming) {
          fullResponse = await withTimeout(
            streamAI({ provider, model, messages: aiMessages, webSearch, structuredOutput: true }, (chunk) => {
              controller.enqueue(new TextEncoder().encode(chunk));
            }),
            generationTimeoutMs,
            "AI yanıt üretimi"
          );
        } else {
          fullResponse = await withTimeout(
            chatAI({ provider, model, messages: aiMessages, webSearch, structuredOutput: true }),
            generationTimeoutMs,
            "AI yanıt üretimi"
          );
          controller.enqueue(new TextEncoder().encode(fullResponse));
        }

        if (!fullResponse.trim()) {
          throw new Error("Model boş yanıt döndürdü. Sağlayıcı/model ayarlarını kontrol edin.");
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Bilinmeyen hata";
        console.error("[chat/messages] provider error", {
          conversationId,
          provider,
          model,
          forceGemini,
          error: errMsg,
        });
        const encodedError = Buffer.from(errMsg, "utf8").toString("base64");
        controller.enqueue(new TextEncoder().encode(`\n\n__ERROR_B64__${encodedError}`));
        await prisma.message.create({
          data: { conversationId, role: "assistant", content: "", provider, model, status: "error", errorMessage: errMsg },
        });
        controller.close();
        return;
      }

      await prisma.message.create({
        data: { conversationId, role: "assistant", content: fullResponse, provider, model, status: "done" },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date(), aiProvider: provider, aiModel: model },
      });

      if (appConfig.ai.enableAutoTitle && history.length === 3 && conversation.title === "Yeni Sohbet" && userContent) {
        try {
          // Pass both first and second user messages for a better title
          const firstUserMsg = history.find((m) => m.role === "user" && m.id !== userMsg.id);
          const titleContext = firstUserMsg
            ? `${firstUserMsg.content}\n${userContent}`
            : userContent;
          const title = await generateTitle(titleContext, provider, model);
          await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
          const encodedTitle = Buffer.from(title, "utf8").toString("base64");
          controller.enqueue(new TextEncoder().encode(`\n\n__TITLE_B64__${encodedTitle}`));
        } catch {
          // non-critical
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
