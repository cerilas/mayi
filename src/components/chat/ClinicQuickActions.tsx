"use client";

import { CalendarPlus, ChevronRight, Clock, FileText, MapPin, Phone, UserRound, Video } from "lucide-react";
import type { QuickActionKey } from "@/lib/clinic";

interface ClinicQuickActionsProps {
  busyKey: QuickActionKey | null;
  onSelect: (key: QuickActionKey) => void;
}

type CardAction = { key: QuickActionKey; title: string; subtitle: string; Icon: typeof MapPin };

const CLINIC_CARDS: CardAction[] = [
  { key: "location", title: "Konum al", subtitle: "Google Haritalar'da aç", Icon: MapPin },
  { key: "hours", title: "Çalışma saatleri", subtitle: "Pazartesi – Cumartesi", Icon: Clock },
  { key: "about", title: "Mahmut Yücel kimdir?", subtitle: "Kurucumuzu tanıyın", Icon: UserRound },
];

const PERSONAL_CARDS: CardAction[] = [
  { key: "therapist", title: "Sorumlu terapistim", subtitle: "Tek dokunuşla arayın", Icon: Phone },
  { key: "videos", title: "Önerilen videolar", subtitle: "Size özel içerikler", Icon: Video },
  { key: "summary", title: "Fizyoterapist özeti", subtitle: "Sade bir dille", Icon: FileText },
];

const CHIPS: Array<{ key: QuickActionKey; label: string; Icon: typeof MapPin }> = [
  { key: "appointment", label: "Randevu al", Icon: CalendarPlus },
  { key: "therapist", label: "Terapistim", Icon: Phone },
  { key: "videos", label: "Videolarım", Icon: Video },
  { key: "summary", label: "Özetim", Icon: FileText },
  { key: "location", label: "Konum", Icon: MapPin },
  { key: "hours", label: "Çalışma saatleri", Icon: Clock },
  { key: "about", label: "Mahmut Yücel", Icon: UserRound },
];

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block w-4 h-4 rounded-full border-2 animate-spin ${light ? "border-white/40 border-t-white" : "border-[var(--brand-light)] border-t-[var(--brand)]"}`}
    />
  );
}

function CardGrid({ cards, busyKey, onSelect }: ClinicQuickActionsProps & { cards: CardAction[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      {cards.map(({ key, title, subtitle, Icon }) => (
        <button
          key={key}
          type="button"
          disabled={busyKey !== null}
          onClick={() => onSelect(key)}
          className="brand-card-hover min-w-0 rounded-2xl p-3 sm:p-3.5 text-left flex flex-col justify-between min-h-[112px] transition-colors disabled:opacity-70"
          style={{ border: "1px solid var(--border-primary)", background: "var(--bg-primary)" }}
        >
          <span className="flex w-9 h-9 items-center justify-center rounded-xl brand-bg-light">
            {busyKey === key ? <Spinner /> : <Icon className="w-[18px] h-[18px] brand-text" strokeWidth={2.2} />}
          </span>
          <span className="mt-3 block min-w-0">
            <span className="block text-[13px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{title}</span>
            <span className="block text-[11px] mt-1 truncate" style={{ color: "var(--text-tertiary)" }}>{subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default function ClinicQuickActions({ busyKey, onSelect }: ClinicQuickActionsProps) {
  const disabled = busyKey !== null;

  return (
    <div className="w-full max-w-xl">
      <p className="text-[11px] font-bold tracking-[0.12em] mb-2.5 ml-0.5" style={{ color: "var(--text-tertiary)" }}>
        HIZLI İŞLEMLER
      </p>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect("appointment")}
        className="clinic-hero group relative w-full overflow-hidden rounded-2xl px-5 py-5 text-left flex items-center gap-4 transition-transform active:scale-[0.99] disabled:opacity-80"
        style={{ background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)" }}
      >
        <span className="pointer-events-none absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute right-16 -bottom-14 w-24 h-24 rounded-full bg-white/[0.07]" />

        <span className="relative flex w-14 h-14 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-white/40 animate-ping [animation-duration:1.8s]" />
          <span className="relative flex w-14 h-14 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40">
            {busyKey === "appointment" ? <Spinner light /> : <CalendarPlus className="w-6 h-6 text-white" strokeWidth={2.2} />}
          </span>
        </span>

        <span className="relative flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-white">Randevu al</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white">1 DAKİKA</span>
          </span>
          <span className="block text-[13px] leading-snug text-white/85 mt-0.5">
            Gün ve saati seçin, talebiniz kliniğe hemen iletilsin.
          </span>
        </span>

        <span className="relative flex w-9 h-9 shrink-0 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
          <ChevronRight className="w-5 h-5 text-white" />
        </span>
      </button>

      <div className="mt-2.5">
        <CardGrid cards={CLINIC_CARDS} busyKey={busyKey} onSelect={onSelect} />
      </div>

      <p className="text-[11px] font-bold tracking-[0.12em] mt-5 mb-2.5 ml-0.5" style={{ color: "var(--text-tertiary)" }}>
        SİZE ÖZEL
      </p>
      <CardGrid cards={PERSONAL_CARDS} busyKey={busyKey} onSelect={onSelect} />
    </div>
  );
}

export function ClinicQuickChips({ busyKey, onSelect }: ClinicQuickActionsProps) {
  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible px-3 sm:px-4 pt-2 pb-2.5 sm:pt-2.5 sm:pb-3 [scrollbar-width:none]">
      {CHIPS.map(({ key, label, Icon }) => {
        const primary = key === "appointment";
        return (
          <button
            key={key}
            type="button"
            disabled={busyKey !== null}
            onClick={() => onSelect(key)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${primary ? "btn-brand" : "btn-brand-soft"}`}
          >
            {busyKey === key ? <Spinner light={primary} /> : <Icon className="w-3.5 h-3.5" strokeWidth={2.4} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
