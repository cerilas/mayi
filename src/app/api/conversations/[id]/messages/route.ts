import { getUserSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { streamAI, chatAI, generateTitle } from "@/ai";
import { appConfig } from "@/lib/config";
import type { AIMessage, AIMessageContent, AIProvider } from "@/types";
import path from "path";
import fs from "fs";
import { checkAndUpdateUsage, incrementUsage } from "@/lib/usage";
import { clinicFactsForAI, matchTypedIntent, usageLimitMessage } from "@/lib/clinic";
import { buildQuickAnswer } from "@/lib/quick-answers";
import { appointmentToolSet } from "@/ai/tools/appointmentTools";

function getUploadDir() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "public", "uploads");
}

/** Resolve attachment filePath (handles both old "public/uploads/x" and new "uploads/x") */
function resolveAttachmentPath(filePath: string): string {
  const fileName = path.basename(filePath);
  return path.join(getUploadDir(), fileName);
}

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
  const session = await getUserSession(req);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  // ── Paralel: conversation lookup + request body parse ──────────────────
  const [{ id: conversationId }, body] = await Promise.all([
    params,
    req.json().catch(() => ({})),
  ]);

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: session.user.id, deletedAt: null },
  });
  if (!conversation)
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const userContent: string = (body.content ?? "").toString().trim();
  const attachmentIds: string[] = body.attachmentIds ?? [];

  // Clinic info questions get the fixed answer, even when the usage limit is reached.
  const typedIntent = attachmentIds.length === 0 ? matchTypedIntent(userContent) : null;
  if (typedIntent) {
    const { question, answer } = await buildQuickAnswer(typedIntent, session.user.id);
    const isFirstMessage = conversation.title === "Yeni Sohbet";
    await prisma.$transaction([
      prisma.message.create({ data: { conversationId, role: "user", content: userContent } }),
      prisma.message.create({ data: { conversationId, role: "assistant", content: answer, status: "done" } }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date(), ...(isFirstMessage ? { title: question.slice(0, 60) } : {}) },
      }),
    ]);
    const titleMarker = isFirstMessage
      ? `\n\n__TITLE_B64__${Buffer.from(question.slice(0, 60), "utf8").toString("base64")}`
      : "";
    return new Response(answer + titleMarker, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  }

  // ── Usage limit validation ──────────────────────────────────────────
  try {
    const usage = await checkAndUpdateUsage(session.user.id);
    if (usage.isExceeded) {
      return NextResponse.json(
        { error: "usage_limit_exceeded", message: usageLimitMessage(usage.resetAt), resetAt: usage.resetAt },
        { status: 403 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Kullanım hakları kontrol edilemedi." }, { status: 500 });
  }
  const requestedProvider: AIProvider = body.provider ?? conversation.aiProvider;
  const requestedModel: string = body.model ?? conversation.aiModel;
  const webSearch: boolean = body.webSearch === true;

  const openAIKey = process.env.OPENAI_API_KEY ?? "";
  const hasGeminiKey = !!process.env.GEMINI_API_KEY || openAIKey.startsWith("AIza");
  const forceGemini = requestedProvider === "openai" && openAIKey.startsWith("AIza") && hasGeminiKey;

  const provider: AIProvider = forceGemini ? "gemini" : requestedProvider;
  let model: string = forceGemini
    ? appConfig.ai.providers.gemini.models[0].id
    : requestedModel;

  if (model === "gemini-1.5-pro") {
    model = "gemini-1.5-pro-latest";
  }

  if (!userContent && attachmentIds.length === 0) {
    return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });
  }

  const isPatient = session.user.role === "patient";

  // ── Paralel: save user message + fetch settings ──────────────────────
  const settingsKeys = isPatient
    ? ["patient_system_instruction", "base_instruction"]
    : ["system_instruction", "base_instruction"];

  const [userMsg, globalSettings] = await Promise.all([
    prisma.message.create({
      data: { conversationId, role: "user", content: userContent, provider, model },
      include: { attachments: true },
    }),
    prisma.setting.findMany({
      where: {
        key: { in: settingsKeys },
        // Patients read admin's global settings; admins/users read their own.
        ...(isPatient
          ? { user: { role: "admin" } }
          : { userId: session.user.id }
        ),
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // ── Sıralı: link attachments then fetch message history ────────────────
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

    const inlineImageRegex = /!\[.*?\]\((data:([^;]+);base64,([A-Za-z0-9+/=]+))\)/g;
    const inlineImageParts: AIMessageContent[] = [];
    const strippedContent = msgContent.replace(inlineImageRegex, (_, url, mimeType) => {
      if (isUser) inlineImageParts.push({ type: "image_url", image_url: { url } });
      return "";
    }).trim();

    const fileImageParts: AIMessageContent[] = [];
    if (isUser) {
      for (const att of attList.filter((a) => a.mimeType.startsWith("image/"))) {
        const absPath = resolveAttachmentPath(att.filePath);
        try {
          const b64 = fs.readFileSync(absPath).toString("base64");
          fileImageParts.push({ type: "image_url", image_url: { url: `data:${att.mimeType};base64,${b64}` } });
        } catch { /* skip */ }
      }
    }

    const filePdfParts: AIMessageContent[] = [];
    if (isUser) {
      for (const att of attList.filter((a) => a.mimeType === "application/pdf")) {
        const absPath = resolveAttachmentPath(att.filePath);
        try {
          const b64 = fs.readFileSync(absPath).toString("base64");
          filePdfParts.push({ type: "inline_data", inline_data: { mimeType: "application/pdf", data: b64 } });
        } catch { /* skip */ }
      }
    }

    const hasData = inlineImageParts.length > 0 || fileImageParts.length > 0 || filePdfParts.length > 0;
    if (!hasData) return strippedContent || msgContent;

    const parts: AIMessageContent[] = [];
    if (strippedContent) parts.push({ type: "text", text: strippedContent });
    parts.push(...inlineImageParts, ...fileImageParts, ...filePdfParts);
    return parts;
  }

  const nowTR = new Date().toLocaleString("tr-TR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  });

  // ── Build system prompt ───────────────────────────────────────────────
  let customInstruction = "";
  let dbBaseInstruction = "";

  // Build map: updatedAt desc means index 0 = most recent; first-write wins per key.
  const settingsMap = new Map<string, string>();
  for (const s of [...globalSettings].reverse()) {
    settingsMap.set(s.key, s.value);
  }

  if (isPatient) {
    // Patient profile fetched only when needed
    const patientUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        patientProfile: {
          include: { responsibleAdmin: true }
        }
      },
    }).catch(() => null);
    {
      const p = patientUser?.patientProfile;
      const globalPatientInstruction = settingsMap.get("patient_system_instruction") || "";
      dbBaseInstruction = ""; // Danışanlar temel talimatı (base_instruction) görmemeli, sadece danışan talimatı ve profilleri geçerli

      const physioName = p?.responsibleAdmin?.name;
      const contactLine = physioName
        ? `Kullanıcının bağlı olduğu uzman: ${physioName}. İletişim gerektiğinde bu ismi kullan.`
        : `Kullanıcıya atanmış bir uzman yok. İletişim gerektiğinde "kliniğimiz" de.`;
      const linksLine = p?.videoLinks?.length
        ? `Kliniğin bu kullanıcıyla paylaştığı içerik bağlantıları: ${p.videoLinks.join(', ')}. Kullanıcı bunları isterse yalnızca bağlantıyı ver; içeriği yorumlama, uygulama talimatı ekleme.`
        : "";

      customInstruction = `${globalPatientInstruction ? "Klinik iletişim notları:\n" + globalPatientInstruction + "\n\n" : ""}SABİT KURALLAR (yukarıdaki notlarla çelişirse her zaman bu kurallar geçerlidir):

Rolün: MY FizyoAI kliniğinin dijital karşılama ve yönlendirme asistanısın. Sağlık profesyoneli değilsin; hasta, şikâyet veya tedavi üzerinden konuşmazsın.

Yapacakların:
- Klinik, randevu, iletişim ve uygulamanın kullanımı hakkındaki soruları kısa ve net yanıtla.
- Genel, kişiye özel olmayan yaşam alışkanlıkları (hareketli kalmak, mola vermek, ergonomik oturma gibi) hakkında birkaç cümlelik genel bilgi verebilirsin.
- Sağlıkla ilgili her somut soruda kullanıcıyı uzmanına veya hekimine yönlendir.

Yapmayacakların:
- Teşhis koyma, olası hastalık veya neden sayma, risk değerlendirmesi yapma.
- Tedavi, egzersiz programı, set/tekrar, ilaç, dozaj veya iyileşme süresi önerme.
- Ağrı, şikâyet veya ölçüm değerlerini yorumlama.
- "Geçmiş olsun", "şikâyetiniz nedir", "ağrınız nasıl" gibi hasta karşılama kalıpları kullanma. Kullanıcıyı hasta olarak değil, kliniğin bir kullanıcısı olarak karşıla.
- Akademik makale, yazar veya yıl referansı verme.
- Kendi tıbbi uyarı metnini ekleme; uygulama bunu her yanıtın altına kendisi ekler.

Selamlaşma: Kullanıcı "merhaba" gibi kısa bir mesaj yazarsa yalnızca kısa bir karşılama yap ve nasıl yardımcı olabileceğini sor. Örnek: "Merhaba, ben MY FizyoAI asistanıyım. Randevu, iletişim veya uygulama hakkında nasıl yardımcı olabilirim?"

Acil durum: Kullanıcı şiddetli ağrı, nefes darlığı, bilinç kaybı, düşme sonrası yaralanma gibi acil bir durum anlatırsa yorum yapmadan hemen 112'yi aramasını ve uzmanına haber vermesini söyle.

${contactLine}
${linksLine}`;
    }
  } else {
    customInstruction = settingsMap.get("system_instruction") || "";
    dbBaseInstruction = settingsMap.get("base_instruction") || "";
  }

  const defaultBase =
    "Sen yardımcı bir yapay zeka asistanısın. Türkçe cevap ver." +
    " Kullanıcı senden bir görseli düzenlemeni, değiştirmeni veya yeni görsel oluşturmanı isterse, bunu kendin yapamayacağını belirt ve mesaj kutusunun yanındaki 🎨 (Görsel Üret) butonuna tıklayarak görsel üretme moduna geçmesini söyle." +
    " Asla '🎨 Görsel üret:' önekiyle başlayan mesajlar üretme.";

  const appointmentTools = provider === "gemini" && !webSearch
    ? appointmentToolSet(session.user.id, conversationId)
    : undefined;

  const baseInstruction =
    `Şu anki tarih ve saat: ${nowTR} (Türkiye saati). ` +
    (dbBaseInstruction || defaultBase) +
    `\n\n${clinicFactsForAI(!!appointmentTools)}`;

  const disclaimerFooter = `\n\n---\n*${appConfig.disclaimer.text}*`;

  const aiMessages: AIMessage[] = [
    {
      role: "system",
      content: customInstruction
        ? `${baseInstruction}\n\nÖzel Talimatlar:\n${customInstruction}`
        : baseInstruction,
    },
    ...history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: buildContent(
        msg.role === "assistant" ? msg.content.replace(disclaimerFooter, "") : msg.content,
        msg.attachments,
        msg.role
      ),
    })),
  ];

  const hasHeavyAttachment = history.some((m) =>
    m.attachments.some((a) => a.mimeType === "application/pdf" || a.mimeType.startsWith("image/"))
  );

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";
      let controllerClosed = false;
      const generationTimeoutMs = hasHeavyAttachment ? 180000 : 90000;

      function safeEnqueue(chunk: Uint8Array) {
        if (!controllerClosed) controller.enqueue(chunk);
      }
      function safeClose() {
        if (!controllerClosed) { controllerClosed = true; controller.close(); }
      }

      safeEnqueue(new TextEncoder().encode("__KEEPALIVE__"));

      try {
        if (appConfig.ai.enableStreaming) {
          fullResponse = await withTimeout(
            streamAI({ provider, model, messages: aiMessages, webSearch, structuredOutput: true, tools: appointmentTools }, (chunk) => {
              safeEnqueue(new TextEncoder().encode(chunk));
            }),
            generationTimeoutMs,
            "AI yanıt üretimi"
          );
        } else {
          fullResponse = await withTimeout(
            chatAI({ provider, model, messages: aiMessages, webSearch, structuredOutput: !appointmentTools, tools: appointmentTools }),
            generationTimeoutMs,
            "AI yanıt üretimi"
          );
          safeEnqueue(new TextEncoder().encode(fullResponse));
        }

        if (!fullResponse.trim()) {
          throw new Error("Model boş yanıt döndürdü. Sağlayıcı/model ayarlarını kontrol edin.");
        }

        if (appConfig.disclaimer.enabled) {
          safeEnqueue(new TextEncoder().encode(disclaimerFooter));
          fullResponse += disclaimerFooter;
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
        safeEnqueue(new TextEncoder().encode(`\n\n__ERROR_B64__${encodedError}`));
        await prisma.message.create({
          data: { conversationId, role: "assistant", content: "", provider, model, status: "error", errorMessage: errMsg },
        });
        safeClose();
        return;
      }

      // ── Paralel: save assistant message + update conversation + usage increment ──
      await Promise.all([
        prisma.message.create({
          data: { conversationId, role: "assistant", content: fullResponse, provider, model, status: "done" },
        }),
        prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date(), aiProvider: provider, aiModel: model },
        }),
        incrementUsage(session.user.id),
      ]);

      if (appConfig.ai.enableAutoTitle && history.length === 1 && conversation.title === "Yeni Sohbet" && userContent) {
        try {
          const titleContext = userContent;
          const title = await generateTitle(titleContext, provider, model);
          await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
          const encodedTitle = Buffer.from(title, "utf8").toString("base64");
          safeEnqueue(new TextEncoder().encode(`\n\n__TITLE_B64__${encodedTitle}`));
        } catch {
          // non-critical
        }
      }

      safeClose();
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
