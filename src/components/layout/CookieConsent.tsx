"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "granted");
    setShow(false);
    
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }
  };

  const handleDecline = () => {
    localStorage.setItem("cookie_consent", "denied");
    setShow(false);
    
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
      });
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className="max-w-4xl mx-auto bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
        
        {/* Subtle background decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>

        <div className="flex-1 text-center sm:text-left relative z-10">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Çerezler ve Gizlilik</h3>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            Size daha iyi ve kişiselleştirilmiş bir deneyim sunabilmek, platform trafiğini analiz edebilmek için çerezleri kullanıyoruz. 
            "Kabul Et" butonuna tıklayarak Google Analytics çerezlerine (KVKK ve GDPR uyumlu olarak) onay vermiş olursunuz.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
          <button
            onClick={handleDecline}
            className="flex-1 sm:flex-none px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border-secondary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Reddet
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 sm:flex-none px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all whitespace-nowrap"
          >
            Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
