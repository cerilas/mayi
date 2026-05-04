"use client";

import { appConfig } from "@/lib/config";
import { useEffect, useState, useRef } from "react";

interface Model {
  id: string;
  label: string;
}

interface ModelSelectorProps {
  model: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  inline?: boolean; // When true, renders as a flat list inside a parent popup
}

export default function ModelSelector({
  model,
  onModelChange,
  disabled,
  inline = false,
}: ModelSelectorProps) {
  const [geminiModels, setGeminiModels] = useState<Model[]>(
    [...appConfig.ai.providers.gemini.models]
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch Gemini models from API on mount
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/models");
        if (res.ok) {
          const data = await res.json();
          if (data.gemini) {
            setGeminiModels(data.gemini);
          }
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
        // Keep fallback models from config
      }
    }
    fetchModels();
  }, []);

  // Close on outside click (standalone mode only)
  useEffect(() => {
    if (inline) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open, inline]);

  const activeLabel = geminiModels.find((m) => m.id === model)?.label || model;

  // Inline mode: render flat list of models directly
  if (inline) {
    return (
      <div>
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Model
        </div>
        {geminiModels.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onModelChange(m.id)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors disabled:opacity-40"
            style={model === m.id
              ? { color: "var(--brand)", background: "var(--brand-light, rgba(var(--brand-rgb, 210,34,103), 0.06))" }
              : { color: "var(--text-secondary)" }
            }
            onMouseEnter={e => { if (model !== m.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={e => { if (model !== m.id) e.currentTarget.style.background = "transparent"; }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            <span className="flex-1 text-left">{m.label}</span>
            {model === m.id && (
              <svg className="w-4 h-4 text-[var(--brand)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Standalone mode (backward compat — not used anymore but kept)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40 ${
          open
            ? "bg-gray-100 text-gray-700"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
        }`}
        title={`Model: ${activeLabel}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
        {open && <span className="text-gray-500">{activeLabel}</span>}
        {!open && (
          <svg className="w-2.5 h-2.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 rounded-xl shadow-lg py-1 min-w-[180px] z-50" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)" }}>
          {geminiModels.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onModelChange(m.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2`}
              style={model === m.id
                ? { background: "var(--bg-hover)", color: "var(--text-primary)", fontWeight: 500 }
                : { color: "var(--text-secondary)" }
              }
              onMouseEnter={e => { if (model !== m.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { if (model !== m.id) e.currentTarget.style.background = "transparent"; }}
            >
              <span>{m.label}</span>
              {model === m.id && (
                <svg className="w-3.5 h-3.5 text-[var(--brand)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
