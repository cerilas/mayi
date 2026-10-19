import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { APPOINTMENT_RULES, CLINIC_HOURS } from "@/lib/clinic";

const TR_OFFSET = "+03:00";
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface SlotInfo {
  time: string;
  available: boolean;
}

export interface DayAvailability {
  date: string;
  weekday: string;
  label: string;
  slots: SlotInfo[];
}

class AppointmentError extends Error {}

export type CreateAppointmentResult =
  | { ok: true; appointment: { id: string; startsAt: Date; status: string }; label: string }
  | { ok: false; error: string };

function trToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T12:00:00${TR_OFFSET}`).getTime() + days * DAY_MS;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(base));
}

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00${TR_OFFSET}`).getUTCDay();
}

export function toInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${TR_OFFSET}`);
}

function slotTimesFor(date: string): string[] {
  const hours = CLINIC_HOURS[weekdayOf(date)];
  if (!hours) return [];
  const times: string[] = [];
  for (let minutes = hours.open * 60; minutes + APPOINTMENT_RULES.slotMinutes <= hours.close * 60; minutes += APPOINTMENT_RULES.slotMinutes) {
    times.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  }
  return times;
}

export function formatDayLabel(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${day} ${MONTH_NAMES[month - 1]} ${DAY_NAMES[weekdayOf(date)]}`;
}

export function formatAppointmentLabel(startsAt: Date): string {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(startsAt);
  const time = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hour12: false }).format(startsAt);
  return `${formatDayLabel(date)}, ${time}`;
}

function bookingWindow() {
  const today = trToday();
  const lastDay = addDays(today, APPOINTMENT_RULES.bookingDays - 1);
  return { today, lastDay, from: toInstant(today, "00:00"), to: toInstant(addDays(lastDay, 1), "00:00") };
}

export async function getAvailability(): Promise<DayAvailability[]> {
  const { today, from, to } = bookingWindow();
  const booked = await prisma.clinicAppointment.groupBy({
    by: ["startsAt"],
    where: { startsAt: { gte: from, lt: to }, status: { not: "cancelled" } },
    _count: { _all: true },
  });
  const bookedCount = new Map(booked.map((b) => [b.startsAt.getTime(), b._count._all]));
  const earliest = Date.now() + APPOINTMENT_RULES.minLeadMinutes * 60 * 1000;

  const days: DayAvailability[] = [];
  for (let i = 0; i < APPOINTMENT_RULES.bookingDays; i++) {
    const date = addDays(today, i);
    const times = slotTimesFor(date);
    if (!times.length) continue;
    const slots = times.map((time) => {
      const at = toInstant(date, time).getTime();
      return { time, available: at >= earliest && (bookedCount.get(at) ?? 0) < APPOINTMENT_RULES.slotCapacity };
    });
    if (!slots.some((s) => s.available)) continue;
    days.push({ date, weekday: DAY_NAMES[weekdayOf(date)], label: formatDayLabel(date), slots });
  }
  return days;
}

export function validateSlot(date: string, time: string): string | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return "Tarih YYYY-AA-GG, saat SS:DD biçiminde olmalı.";
  const { today, lastDay } = bookingWindow();
  if (date < today || date > lastDay) return `Randevular yalnızca önümüzdeki ${APPOINTMENT_RULES.bookingDays} gün için alınabilir.`;
  const times = slotTimesFor(date);
  if (!times.length) return "Klinik bu gün kapalı. Pazar günleri hizmet verilmiyor.";
  if (!times.includes(time)) return `Bu gün için uygun saatler: ${times.join(", ")}.`;
  if (toInstant(date, time).getTime() < Date.now() + APPOINTMENT_RULES.minLeadMinutes * 60 * 1000) {
    return "Bu saat geçmiş ya da çok yakın. Lütfen daha ileri bir saat seçin.";
  }
  return null;
}

export async function createAppointment(input: {
  userId: string;
  date: string;
  time: string;
  note?: string | null;
  source: "picker" | "chat";
  conversationId?: string | null;
}): Promise<CreateAppointmentResult> {
  const invalid = validateSlot(input.date, input.time);
  if (invalid) return { ok: false, error: invalid };

  const startsAt = toInstant(input.date, input.time);
  const note = input.note?.trim().slice(0, 500) || null;

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const [slotTaken, userActive] = await Promise.all([
        tx.clinicAppointment.count({ where: { startsAt, status: { not: "cancelled" } } }),
        tx.clinicAppointment.count({ where: { userId: input.userId, startsAt: { gte: new Date() }, status: { not: "cancelled" } } }),
      ]);
      if (slotTaken >= APPOINTMENT_RULES.slotCapacity) throw new AppointmentError("Bu saat az önce doldu. Lütfen başka bir saat seçin.");
      if (userActive >= APPOINTMENT_RULES.maxActivePerUser) {
        throw new AppointmentError(`Aynı anda en fazla ${APPOINTMENT_RULES.maxActivePerUser} bekleyen randevu talebiniz olabilir. Mevcut talepleriniz için kliniğimizle iletişime geçebilirsiniz.`);
      }
      return tx.clinicAppointment.create({
        data: {
          userId: input.userId,
          startsAt,
          durationMin: APPOINTMENT_RULES.slotMinutes,
          note,
          source: input.source,
          conversationId: input.conversationId ?? null,
        },
        select: { id: true, startsAt: true, status: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return { ok: true, appointment, label: formatAppointmentLabel(appointment.startsAt) };
  } catch (err) {
    if (err instanceof AppointmentError) return { ok: false, error: err.message };
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return { ok: false, error: "Bu saat az önce doldu. Lütfen başka bir saat seçin." };
    }
    console.error("[appointments] create failed", err);
    return { ok: false, error: "Randevu talebi kaydedilemedi. Lütfen tekrar deneyin." };
  }
}

export function appointmentConfirmationText(label: string): string {
  return `Randevu talebiniz alındı.

**${label}**

Kliniğimiz talebinizi kontrol edip sizinle iletişime geçerek randevunuzu kesinleştirecek. Değişiklik için kliniğimizi arayabilirsiniz.`;
}
