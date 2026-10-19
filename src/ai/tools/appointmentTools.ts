import type { AIToolSet } from "@/types";
import { createAppointment, formatDayLabel, getAvailability, validateSlot } from "@/lib/appointments";

const declarations = [
  {
    name: "check_appointment_slots",
    description:
      "Klinikte randevu için uygun saatleri döndürür. Kullanıcı bir gün belirttiğinde o günü (YYYY-AA-GG) gönder; " +
      "gün belirtmediyse boş bırak, önümüzdeki günlerin özeti döner.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Türkiye saatine göre tarih, YYYY-AA-GG (örn. 2026-10-22)" },
      },
      required: [],
    },
  },
  {
    name: "create_appointment",
    description:
      "Kullanıcı adına klinik randevu talebi oluşturur. Yalnızca kullanıcı gün ve saati açıkça belirttiğinde ya da " +
      "önerdiğin saati onayladığında çağır.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-AA-GG (örn. 2026-10-22)" },
        time: { type: "string", description: "SS:DD, tam saat (örn. 14:00)" },
        note: { type: "string", description: "Kullanıcının eklemek istediği kısa not (isteğe bağlı)" },
      },
      required: ["date", "time"],
    },
  },
];

export function appointmentToolSet(userId: string, conversationId: string): AIToolSet {
  return {
    declarations,
    async execute(name, args) {
      if (name === "check_appointment_slots") {
        const days = await getAvailability();
        const date = typeof args.date === "string" ? args.date : "";
        if (!date) {
          return {
            days: days.map((d) => ({ date: d.date, label: d.label, availableTimes: d.slots.filter((s) => s.available).map((s) => s.time) })),
          };
        }
        const day = days.find((d) => d.date === date);
        if (!day) {
          const reason = validateSlot(date, "09:00");
          return { date, label: /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDayLabel(date) : date, availableTimes: [], reason: reason ?? "Bu gün için boş saat kalmadı." };
        }
        return { date, label: day.label, availableTimes: day.slots.filter((s) => s.available).map((s) => s.time) };
      }

      if (name === "create_appointment") {
        const result = await createAppointment({
          userId,
          date: typeof args.date === "string" ? args.date : "",
          time: typeof args.time === "string" ? args.time : "",
          note: typeof args.note === "string" ? args.note : null,
          source: "chat",
          conversationId,
        });
        return result.ok
          ? { success: true, appointment: result.label, status: "Talep alındı, klinik arayarak kesinleştirecek." }
          : { success: false, error: result.error };
      }

      return { error: `Bilinmeyen fonksiyon: ${name}` };
    },
  };
}
