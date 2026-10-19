"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClinicQuickActions from "./ClinicQuickActions";
import type { QuickActionKey } from "@/lib/clinic";

export default function WelcomeScreen() {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<QuickActionKey | null>(null);

  async function startConversation(quick?: QuickActionKey) {
    if (busyKey) return;
    if (quick) setBusyKey(quick);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const conv = await res.json();
        router.push(quick ? `/chat/${conv.id}?quick=${quick}` : `/chat/${conv.id}`);
        return;
      }
    } catch { /* fall through */ }
    setBusyKey(null);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-6 sm:p-8 text-center">
        <div className="w-16 h-16 mb-4">
          <img src="/logo.png" alt="MY FizyoAI" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>MY FizyoAI</h1>
        <p className="text-sm mb-8 max-w-sm" style={{ color: "var(--text-secondary)" }}>
          Mahmut Yücel Fizyoterapi Kliniği dijital asistanı. Randevu alın, kliniğe ulaşın, bilgi edinin.
        </p>
        <div className="text-left w-full flex justify-center">
          <ClinicQuickActions busyKey={busyKey} onSelect={(key) => void startConversation(key)} />
        </div>
        <button
          onClick={() => void startConversation()}
          disabled={busyKey !== null}
          className="mt-6 px-6 py-2.5 btn-brand-soft text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          Sohbet Başlat
        </button>
      </div>
    </div>
  );
}
