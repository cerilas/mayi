"use client";

import { appConfig } from "@/lib/config";
import { useEffect, useState } from "react";

interface Model {
  id: string;
  label: string;
}

interface ModelSelectorProps {
  model: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({
  model,
  onModelChange,
  disabled,
}: ModelSelectorProps) {
  const [geminiModels, setGeminiModels] = useState<Model[]>(
    [...appConfig.ai.providers.gemini.models]
  );

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

  return (
    <div className="flex items-center gap-1.5">
      {/* Gemini label */}
      <span className="text-xs font-medium text-gray-600 px-2.5 py-1">
        Gemini
      </span>

      {/* Model select */}
      <select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
      >
        {geminiModels.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
