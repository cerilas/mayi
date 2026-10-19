"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";

interface SlotInfo { time: string; available: boolean }
interface DayAvailability { date: string; weekday: string; label: string; slots: SlotInfo[] }

interface AppointmentPickerProps<TMessage> {
  conversationId: string;
  onBooked: (messages: TMessage[]) => void;
}

const SHORT_WEEKDAY: Record<string, string> = {
  Pazartesi: "Pzt", Salı: "Sal", Çarşamba: "Çar", Perşembe: "Per", Cuma: "Cum", Cumartesi: "Cmt", Pazar: "Paz",
};

export default function AppointmentPicker<TMessage>({ conversationId, onBooked }: AppointmentPickerProps<TMessage>) {
  const [days, setDays] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookedLabel, setBookedLabel] = useState<string | null>(null);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments/availability");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const nextDays: DayAvailability[] = data.days ?? [];
      setDays(nextDays);
      setSelectedDate((current) => (current && nextDays.some((d) => d.date === current) ? current : nextDays[0]?.date ?? null));
    } catch {
      setError("Uygun saatler alınamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAvailability(); }, [loadAvailability]);

  const selectedDay = useMemo(() => days.find((d) => d.date === selectedDate) ?? null, [days, selectedDate]);

  async function submit() {
    if (!selectedDay || !selectedTime || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDay.date, time: selectedTime, conversationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Randevu talebi gönderilemedi. Lütfen tekrar deneyin.");
        setSelectedTime(null);
        void loadAvailability();
        return;
      }
      setBookedLabel(data.label ?? `${selectedDay.label}, ${selectedTime}`);
      onBooked(data.messages ?? []);
      window.dispatchEvent(new CustomEvent("refreshSidebarConversations"));
    } catch {
      setError("Randevu talebi gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  if (bookedLabel) {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-[13px] font-bold text-emerald-800">Talebiniz kliniğe iletildi</p>
          <p className="text-xs text-emerald-700 mt-0.5">{bookedLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full min-w-0 max-w-md rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-primary)", background: "var(--bg-primary)" }}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-2.5">
        <span className="flex w-8 h-8 items-center justify-center rounded-lg brand-bg-light">
          <CalendarDays className="w-4 h-4 brand-text" />
        </span>
        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Gün seçin</span>
      </div>

      {loading && days.length === 0 ? (
        <div className="flex justify-center py-7">
          <span className="w-5 h-5 rounded-full border-2 border-[var(--brand-light)] border-t-[var(--brand)] animate-spin" />
        </div>
      ) : days.length === 0 ? (
        <p className="px-4 pb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {error || "Önümüzdeki günlerde boş saat kalmadı. Lütfen kliniğimizi arayın."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 min-[420px]:grid-cols-5 sm:grid-cols-6 gap-1.5 sm:gap-2 px-3 sm:px-4 pb-1">
            {days.map((day) => {
              const [dayNum, month] = day.label.split(" ");
              const active = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => { setSelectedDate(day.date); setSelectedTime(null); setError(""); }}
                  className={`min-w-0 rounded-xl py-2 text-center transition-colors ${active ? "btn-brand" : ""}`}
                  style={active ? undefined : { background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}
                  title={day.label}
                >
                  <span className={`block text-[10.5px] font-semibold ${active ? "text-white/85" : ""}`} style={active ? undefined : { color: "var(--text-tertiary)" }}>
                    {SHORT_WEEKDAY[day.weekday] ?? day.weekday}
                  </span>
                  <span className={`block text-lg font-extrabold leading-tight ${active ? "text-white" : ""}`} style={active ? undefined : { color: "var(--text-primary)" }}>
                    {dayNum}
                  </span>
                  <span className={`block text-[10px] ${active ? "text-white/85" : ""}`} style={active ? undefined : { color: "var(--text-tertiary)" }}>
                    {month?.slice(0, 3)}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <div className="px-3 sm:px-4 pt-3.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                <Clock className="w-3.5 h-3.5" /> {selectedDay.label}
              </p>
              <div className="grid grid-cols-3 min-[420px]:grid-cols-4 gap-1.5 sm:gap-2">
                {selectedDay.slots.map((slot) => {
                  const active = slot.time === selectedTime;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => { setSelectedTime(slot.time); setError(""); }}
                      className={`rounded-lg py-2 text-[13px] font-bold transition-colors ${active ? "btn-brand" : slot.available ? "btn-brand-soft" : "line-through opacity-50 cursor-not-allowed"}`}
                      style={!active && !slot.available ? { background: "var(--bg-secondary)", color: "var(--text-tertiary)" } : undefined}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="px-3 sm:px-4 pt-2.5 text-xs text-red-600">{error}</p>}

          <div className="p-3 sm:p-4">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!selectedTime || submitting}
              className={`w-full rounded-xl py-3 text-sm font-bold transition-colors ${selectedTime ? "btn-brand" : ""}`}
              style={selectedTime ? undefined : { background: "var(--bg-secondary)", color: "var(--text-tertiary)", border: "1px solid var(--border-primary)" }}
            >
              {submitting
                ? "Gönderiliyor..."
                : selectedTime && selectedDay
                  ? `${selectedDay.label}, ${selectedTime} için talep gönder`
                  : "Saat seçin"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
