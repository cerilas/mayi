"use client";

import { useRouter } from "next/navigation";

export default function WelcomeScreen() {
  const router = useRouter();

  async function handleNewChat() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const conv = await res.json();
      router.push(`/chat/${conv.id}`);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 mb-5">
        <img src="/logo.png" alt="MY FizyoAI" className="w-full h-full object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">MY FizyoAI</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-sm">
        Mahmut Yücel Fizyoterapi Kliniği yapay zeka asistanı. Sorularınızı
        sorun, görsel yükleyin, rapora bakın.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mb-8">
        {[
          { key: "qa", title: "Soru-Cevap", desc: "Fizyoterapi hakkında sorular sorun" },
          { key: "vision", title: "Görsel Analiz", desc: "Rapor veya egzersiz görüntüsü yükleyin" },
          { key: "notes", title: "Bilgi Asistanı", desc: "Rehabilitasyon bilgisi edinin" },
        ].map((item) => (
          <div
            key={item.key}
            className="border border-gray-200 rounded-xl p-4 text-left brand-card-hover cursor-pointer transition-colors"
            onClick={handleNewChat}
          >
            <div className="mb-2 w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center brand-text">
              {item.key === "qa" && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              )}
              {item.key === "vision" && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm4 7l2.5-3 2.5 3 3.5-4 2.5 3" />
                </svg>
              )}
              {item.key === "notes" && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
              )}
            </div>
            <div className="text-sm font-medium text-gray-800">{item.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
          </div>
        ))}
      </div>
      <button
        onClick={handleNewChat}
        className="px-6 py-2.5 btn-brand text-white text-sm font-medium rounded-lg transition-colors"
      >
        Sohbet Başlat
      </button>
    </div>
  );
}
