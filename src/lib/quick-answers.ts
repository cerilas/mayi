import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { chatAI } from "@/ai";
import {
  CLINIC_PHONE,
  QUICK_ACTIONS,
  QUICK_QUESTIONS,
  isStaticQuickActionKey,
  toTelHref,
  withDisclaimer,
  type QuickActionKey,
} from "@/lib/clinic";

const SUMMARY_MODEL = "gemini-2.5-flash";
/** Bump when the prompt changes so cached summaries are regenerated. */
const SUMMARY_PROMPT_VERSION = "v1";

const SUMMARY_INSTRUCTION = `Bir fizyoterapi kliniğinin iletişim asistanısın. Sana fizyoterapistin bir danışanı için sisteme yazdığı notlar verilecek.
Bu notları danışana hitaben ("siz" diye), sıcak, kibar ve günlük konuşma dilinde, en fazla 5-6 cümlelik kısa bir özet olarak yeniden yaz.

Kurallar:
- Tıbbi veya teknik terim, teşhis, hastalık adı, ilaç, doz, egzersiz talimatı ya da tedavi önerisi yazma. Bu tür ifadeleri "fizyoterapistinizin sizinle konuştuğu konular" gibi genel ve sade ifadelerle anlat.
- Ağrı, belirti, şikâyet veya vücut bölgesi ayrıntısı verme; sürecin genel akışını (ör. seansların devam edeceği, nelere dikkat etmesi gerektiğini fizyoterapistinin anlatacağı) sade biçimde aktar.
- Notlarda olmayan hiçbir bilgi ekleme; yorum yapma, tahmin yürütme, sonuç veya süre vaat etme.
- Korkutucu ya da endişe verici ifade kullanma. "Geçmiş olsun" gibi kalıplar kullanma.
- Son cümlede ayrıntılar için fizyoterapistine danışabileceğini nazikçe belirt.
- Yalnızca özet metnini yaz: başlık, madde işareti, emoji veya uyarı metni ekleme.`;

/** Calls always go to the clinic line, whoever the responsible therapist is. */
function callCard(label: string): string {
  return `[${label.replace(/[[\]]/g, "")}](${toTelHref(CLINIC_PHONE)})`;
}

async function therapistAnswer(userId: string): Promise<string> {
  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
    select: { responsibleAdmin: { select: { name: true } } },
  });
  const therapist = profile?.responsibleAdmin;

  if (!therapist) {
    return `Size henüz bir sorumlu terapist atanmamıştır. Sorularınız için kliniğimizi arayabilirsiniz.\n\n${callCard("Kliniği ara")}`;
  }
  return `**Sorumlu terapistiniz:** ${therapist.name}\n\nAşağıdaki butona dokunarak kliniğimizi arayabilir, terapistinize ulaşabilirsiniz.\n\n${callCard(therapist.name)}`;
}

async function videosAnswer(userId: string): Promise<string> {
  const profile = await prisma.patientProfile.findUnique({ where: { userId }, select: { videoLinks: true } });
  const links = (profile?.videoLinks ?? []).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l));
  if (!links.length) {
    return "Size henüz önerilen bir video atanmamıştır. Fizyoterapistiniz video eklediğinde burada görebilirsiniz.";
  }
  return `Fizyoterapistinizin sizinle paylaştığı videolar:\n\n${links.map((l, i) => `[Video ${i + 1}](${l})`).join("\n\n")}`;
}

async function summaryAnswer(userId: string): Promise<string> {
  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
    select: { id: true, clinicalOpinion: true, longDetails: true, friendlySummary: true, friendlySummaryHash: true },
  });
  const source = [profile?.clinicalOpinion, profile?.longDetails].map((s) => s?.trim()).filter(Boolean).join("\n\n");
  if (!profile || !source) {
    return "Fizyoterapistiniz henüz sizin için bir özet yazmamıştır. Özet eklendiğinde burada görebilirsiniz.";
  }

  const hash = createHash("sha256").update(`${SUMMARY_PROMPT_VERSION}\n${source}`).digest("hex");
  let summary = profile.friendlySummaryHash === hash ? profile.friendlySummary : null;

  if (!summary) {
    try {
      const generated = await chatAI({
        provider: "gemini",
        model: SUMMARY_MODEL,
        messages: [
          { role: "system", content: SUMMARY_INSTRUCTION },
          { role: "user", content: `Fizyoterapistin notları:\n"""\n${source.slice(0, 6000)}\n"""` },
        ],
      });
      summary = generated.trim();
    } catch (err) {
      console.error("[quick-answers] summary generation failed", err);
    }
    if (!summary) return "Özetiniz şu anda hazırlanamadı. Lütfen biraz sonra tekrar deneyin.";
    await prisma.patientProfile.update({
      where: { id: profile.id },
      data: { friendlySummary: summary, friendlySummaryHash: hash },
    });
  }

  return `**Fizyoterapist özetiniz**\n\n${summary}\n\n_Bu metin, fizyoterapistinizin notlarından yapay zekâ ile sadeleştirilmiştir._`;
}

/** Fixed or per-user answer for a quick action; never consumes a usage credit. */
export async function buildQuickAnswer(key: QuickActionKey, userId: string): Promise<{ question: string; answer: string }> {
  const question = QUICK_QUESTIONS[key];
  if (isStaticQuickActionKey(key)) return { question, answer: withDisclaimer(QUICK_ACTIONS[key].answer) };

  const body =
    key === "therapist" ? await therapistAnswer(userId)
      : key === "videos" ? await videosAnswer(userId)
        : await summaryAnswer(userId);
  return { question, answer: withDisclaimer(body) };
}
