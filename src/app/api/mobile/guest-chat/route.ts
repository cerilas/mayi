import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamAI, chatAI } from "@/ai";
import { appConfig } from "@/lib/config";
import type { AIMessage, AIProvider } from "@/types";
import {
  APPOINTMENT_PICKER_TOKEN,
  CLINIC_MAP_URL,
  CLINIC_PHONE,
  QUICK_ACTIONS,
  isStaticQuickActionKey,
  matchTypedIntent,
  withDisclaimer,
} from "@/lib/clinic";

const MAX_GUEST_QUESTIONS = 5;

const GUEST_APPOINTMENT_ANSWER = `Kliniğimizden randevu almak ve ilk değerlendirme sürecinizi planlamak için doğrudan **WhatsApp Danışma Hattımız** üzerinden bizimle iletişime geçebilirsiniz:

- **WhatsApp / Telefon:** [0540 650 27 27 — WhatsApp'tan Ulaşın](https://wa.me/905406502727)
- **Çalışma Saatlerimiz:** Pazartesi – Cuma 09:00 – 19:00, Cumartesi 09:00 – 15:00 (Pazar kapalı)

> **Not:** Uygulama içi online randevu takvimi, kliniğimizde aktif kaydı bulunan danışanlarımıza özeldir. Mevcut danışanımızsanız sağ üstteki **Giriş** butonundan hesabınıza giriş yaparak doğrudan uygulama üzerinden randevu oluşturabilirsiniz.`;

const GUEST_LIMIT_MESSAGE =
  "5 soruluk ücretsiz misafir danışma hakkınız doldu. MY FizyoAI uygulaması kliniğimizin danışanlarına özeldir. Daha fazla soru sormak ve kişisel danışan hesabınızın tanımlanması için önce kliniğimize başvurmanız gerekmektedir.";

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawMessages: Array<{ role?: string; content?: string }> = Array.isArray(body.messages)
      ? body.messages
      : [];

    const sanitizedMessages = rawMessages
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          (m?.role === "user" || m?.role === "assistant") &&
          typeof m?.content === "string" &&
          m.content.trim().length > 0
      )
      .map((m) => ({
        role: m.role,
        content: m.content.trim(),
      }));

    if (sanitizedMessages.length === 0) {
      return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });
    }

    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1];
    if (lastMessage.role !== "user") {
      return NextResponse.json({ error: "Son mesaj kullanıcıya ait olmalıdır" }, { status: 400 });
    }

    const userQuestionCount = sanitizedMessages.filter((m) => m.role === "user").length;
    const reportedQuestionCount =
      typeof body.questionCount === "number" ? body.questionCount : userQuestionCount;

    if (userQuestionCount > MAX_GUEST_QUESTIONS || reportedQuestionCount > MAX_GUEST_QUESTIONS) {
      return NextResponse.json(
        {
          error: "guest_limit_exceeded",
          message: GUEST_LIMIT_MESSAGE,
          whatsappPhone: CLINIC_PHONE,
        },
        { status: 403 }
      );
    }

    const userContent = lastMessage.content;

    // Direct appointment intent for guests -> guide to WhatsApp + Login for existing patients
    if (/(randevu|seans\s*al|muayene\s*ol|de[ğg]erlendirme\s*randevu)/i.test(userContent) && userContent.length <= 160) {
      return new Response(withDisclaimer(GUEST_APPOINTMENT_ANSWER), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Static clinic info questions (hours, location, about)
    const typedIntent = matchTypedIntent(userContent);
    if (typedIntent && isStaticQuickActionKey(typedIntent)) {
      const rawAnswer =
        typedIntent === "hours"
          ? `**Çalışma saatlerimiz**\n\n- **Pazartesi – Cuma:** 09:00 – 19:00\n- **Cumartesi:** 09:00 – 15:00\n- **Pazar:** Kapalı\n\nRandevu almak için [0540 650 27 27 WhatsApp hattımızdan](https://wa.me/905406502727) bize ulaşabilir, kayıtlı danışanımızsanız giriş yaparak uygulama içi randevu sistemimizi kullanabilirsiniz.`
          : QUICK_ACTIONS[typedIntent].answer;
      const answer = withDisclaimer(rawAnswer);
      return new Response(answer, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    const globalSettings = await prisma.setting.findMany({
      where: {
        key: { in: ["patient_system_instruction", "patient_default_model", "base_instruction"] },
        user: { role: "admin" },
      },
      orderBy: { updatedAt: "desc" },
    });

    const settingsMap = new Map<string, string>();
    for (const s of [...globalSettings].reverse()) {
      settingsMap.set(s.key, s.value);
    }

    const provider: AIProvider = "gemini";
    let model = settingsMap.get("patient_default_model") || appConfig.ai.defaultModel;
    if (model === "gemini-1.5-pro") {
      model = "gemini-1.5-pro-latest";
    }

    const nowTR = new Date().toLocaleString("tr-TR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });

    const globalPatientInstruction = settingsMap.get("patient_system_instruction") || "";
    const disclaimerFooter = `\n\n---\n*${appConfig.disclaimer.text}*`;

    const guestClinicFacts = `Klinik bilgileri (bunlar kesindir, değiştirme):
- Çalışma saatleri: Pazartesi–Cuma 09:00–19:00, Cumartesi 09:00–15:00, Pazar kapalı.
- Konum: [Haritada Aç](${CLINIC_MAP_URL})
- WhatsApp Danışma ve Randevu Hattı: 0540 650 27 27 ([WhatsApp'tan Ulaşın](https://wa.me/905406502727))
- Randevu Kuralı (Misafir Modu): Uygulama içi randevu seçici yalnızca giriş yapmış kayıtlı danışanlarımız içindir. Misafir kullanıcı randevu almak istediğinde ASLA ${APPOINTMENT_PICKER_TOKEN} kodunu kullanma; kullanıcıyı doğrudan 0540 650 27 27 numaralı WhatsApp hattımıza yönlendir ve mevcut danışanımız ise sağ üstteki Giriş butonundan giriş yaparak uygulama içi randevu sisteminden randevu alabileceğini belirt.`;

    const systemPrompt = `Şu anki tarih ve saat: ${nowTR} (Türkiye saati).
Sen MY FizyoAI (MyFizyoterapi / MyFizyoPilates Kliniği - Fizyoterapist Mahmut Yücel) yapay zeka danışma asistanısın. Türkçe, samimi, anlaşılır ve bilgilendirici yanıtlar ver.

Kullanıcı şu anda uygulamayı "Misafir" modunda (5 soruluk ücretsiz danışma hakkıyla) kullanmaktadır.
- Kullanıcının fizyoterapi, egzersiz, duruş (postür), kas-iskelet sağlığı, günlük yaşam ergonomisi, ağrı yönetimi veya kliniğimiz hakkındaki sorularını detaylı, açıklayıcı ve yardımcı şekilde yanıtla.
- Kesin tıbbi teşhis koymaktan veya reçeteli ilaç önermekten kaçın; bilgilendirme yaptıktan sonra kapsamlı değerlendirme ve kişiye özel planlama için MyFizyoterapi kliniğimize başvurabileceğini nazikçe hatırlat.
- Kendi tıbbi uyarı altbilgini ekleme; uygulama bunu her yanıtın altına otomatik olarak ekler.
- Selamlaşma, hal hatır sorma ("nasılsın"), teşekkür veya kısa sohbet mesajlarına yalnızca 1-2 cümlelik doğal bir yanıt ver; bu mesajlarda ASLA kaynak, referans, makale veya madde listesi ekleme.

${globalPatientInstruction ? `Klinik Notları ve Yönergeler:\n${globalPatientInstruction}\n\n` : ""}${guestClinicFacts}`;

    const aiMessages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      ...sanitizedMessages.slice(-10).map((msg) => ({
        role: msg.role,
        content:
          msg.role === "assistant" ? msg.content.replace(disclaimerFooter, "") : msg.content,
      })),
    ];

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        let controllerClosed = false;

        function safeEnqueue(chunk: Uint8Array) {
          if (!controllerClosed) controller.enqueue(chunk);
        }
        function safeClose() {
          if (!controllerClosed) {
            controllerClosed = true;
            controller.close();
          }
        }

        safeEnqueue(new TextEncoder().encode("__KEEPALIVE__"));

        try {
          if (appConfig.ai.enableStreaming) {
            fullResponse = await withTimeout(
              streamAI(
                { provider, model, messages: aiMessages, webSearch: false, structuredOutput: true },
                (chunk) => {
                  const cleaned = chunk.replaceAll(APPOINTMENT_PICKER_TOKEN, "");
                  if (cleaned) safeEnqueue(new TextEncoder().encode(cleaned));
                }
              ),
              90000,
              "AI yanıt üretimi"
            );
          } else {
            fullResponse = await withTimeout(
              chatAI({ provider, model, messages: aiMessages, webSearch: false, structuredOutput: true }),
              90000,
              "AI yanıt üretimi"
            );
            safeEnqueue(new TextEncoder().encode(fullResponse.replaceAll(APPOINTMENT_PICKER_TOKEN, "")));
          }

          if (!fullResponse.trim()) {
            throw new Error("Model boş yanıt döndürdü.");
          }

          if (appConfig.disclaimer.enabled) {
            safeEnqueue(new TextEncoder().encode(disclaimerFooter));
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Bilinmeyen hata";
          console.error("[mobile/guest-chat] error", errMsg);
          const encodedError = Buffer.from(errMsg, "utf8").toString("base64");
          safeEnqueue(new TextEncoder().encode(`\n\n__ERROR_B64__${encodedError}`));
        } finally {
          safeClose();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("Guest chat error:", error);
    return NextResponse.json(
      { error: error.message || "Misafir sohbeti başlatılamadı" },
      { status: 500 }
    );
  }
}
