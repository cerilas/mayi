"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import ModelSelector from "./ModelSelector";
import Image from "next/image";
import { appConfig } from "@/lib/config";

interface PendingAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  filePath: string;
  preview: string;
}

interface PendingAttachmentInfo {
  id: string;
  fileName: string;
  mimeType: string;
  filePath: string;
}

interface MessageInputProps {
  onSend: (
    content: string,
    attachmentIds: string[],
    provider: "openai" | "gemini",
    model: string,
    pendingAttachments: PendingAttachmentInfo[],
    webSearch: boolean
  ) => void;
  onGenerateImage?: (prompt: string, inputImage?: { mimeType: string; base64: string }) => void;
  disabled?: boolean;
  model: string;
  onModelChange: (m: string) => void;
  editImage?: { mimeType: string; base64: string } | null;
  onClearEditImage?: () => void;
  isPatient?: boolean;
}

export default function MessageInput({
  onSend,
  onGenerateImage,
  disabled,
  model,
  onModelChange,
  editImage,
  onClearEditImage,
  isPatient,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Mobile keyboard gap fix
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const handler = () => {
      const offset = window.innerHeight - vv.height;
      document.documentElement.style.setProperty("--keyboard-offset", `${offset}px`);
    };
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => {
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
      document.documentElement.style.setProperty("--keyboard-offset", "0px");
    };
  }, []);

  // Close tools on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    if (toolsOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [toolsOpen]);

  const allowedTypes = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
  ];

  function autoResize() {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      // 3 lines: 3 × 20px line-height + 24px vertical padding ≈ 84px
      ta.style.height = Math.min(ta.scrollHeight, 84) + "px";
    }
  }

  function removeAttachment(id: string) {
    setAttachments(a => a.filter(x => x.id !== id));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) fd.append("files", files[i]);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || "Yükleme başarısız"); return; }
      const newAtts: PendingAttachment[] = (data.attachments || []).map((a: any) => ({
        id: a.id, fileName: a.fileName, mimeType: a.mimeType, filePath: a.filePath,
        preview: a.mimeType.startsWith("image/") ? `/api/files/${a.filePath}` : "",
      }));
      setAttachments(prev => [...prev, ...newAtts]);
    } catch { setUploadError("Sunucu hatası"); }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (imageMode && onGenerateImage && trimmed) {
      onGenerateImage(trimmed, editImage || undefined);
      setText(""); setImageMode(false); onClearEditImage?.(); autoResize(); return;
    }
    const pendingInfos: PendingAttachmentInfo[] = attachments.map(a => ({
      id: a.id, fileName: a.fileName, mimeType: a.mimeType, filePath: a.filePath,
    }));
    onSend(trimmed, [], "gemini", model, pendingInfos, webSearch);
    setText(""); setAttachments([]); setWebSearch(false); autoResize();
  }, [text, attachments, model, imageMode, onGenerateImage, editImage, onClearEditImage, onSend, webSearch]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const hasActiveMode = imageMode || webSearch;

  return (
    <div className="px-3 sm:px-4 py-2 sm:py-3 shrink-0" style={{ borderTop: "1px solid var(--border-primary)", background: "var(--bg-primary)" }}>

      {/* Disclaimer */}
      {appConfig.disclaimer.enabled && (
        <div className="flex items-center gap-1 mb-2" style={{ color: "var(--text-tertiary)" }}>
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-center leading-tight" style={{ fontSize: "10px" }}>{appConfig.disclaimer.text}</p>
        </div>
      )}

      {/* Edit image preview */}
      {editImage && imageMode && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
            <Image src={`data:${editImage.mimeType};base64,${editImage.base64}`} alt="Düzenlenecek görsel" fill className="object-cover" />
          </div>
          <span className="text-xs text-purple-700 flex-1">Düzenleme modu aktif</span>
          <button onClick={() => { onClearEditImage?.(); setImageMode(false); }} className="text-purple-400 hover:text-purple-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Pending attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map(att =>
            att.mimeType === "application/pdf" ? (
              <div key={att.id} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-4 h-4 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z"/></svg>
                <span className="text-xs text-gray-700 max-w-[120px] truncate">{att.fileName}</span>
                <button onClick={() => removeAttachment(att.id)} className="ml-1 w-4 h-4 bg-gray-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
              </div>
            ) : (
              <div key={att.id} className="relative w-14 h-14">
                <Image src={att.preview} alt={att.fileName} fill className="object-cover rounded-lg border border-gray-200" />
                <button onClick={() => removeAttachment(att.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center">×</button>
              </div>
            )
          )}
        </div>
      )}

      {uploadError && <p className="text-xs text-red-600 mb-2">{uploadError}</p>}

      {/* Active mode pills */}
      {hasActiveMode && (
        <div className="flex gap-1.5 mb-2">
          {imageMode && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[11px] font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              Görsel Üret
              <button onClick={() => { setImageMode(false); onClearEditImage?.(); }} className="ml-0.5">×</button>
            </span>
          )}
          {webSearch && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
              Web Arama
              <button onClick={() => setWebSearch(false)} className="ml-0.5">×</button>
            </span>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          INPUT ROW: [+] [ textarea ···· [▶] ]
          All elements same height, vertically centered
          ═══════════════════════════════════════════ */}
      <div className="flex items-center gap-2">

        {/* Tools button */}
        <div ref={toolsRef} className="relative shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setToolsOpen(v => !v)}
            className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-40 ${
              toolsOpen || hasActiveMode
                ? "text-[var(--brand)] bg-[var(--brand)]/10"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            title="Araçlar"
          >
            <svg className={`w-5 h-5 transition-transform duration-200 ${toolsOpen ? "rotate-45" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {hasActiveMode && !toolsOpen && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--brand)] rounded-full" />
            )}
          </button>

          {/* Tools popup — opens upward */}
          {toolsOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 rounded-2xl py-2 min-w-[210px] z-50"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)", boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}
            >
              {!imageMode && (
                <button type="button" disabled={uploading}
                  onClick={() => { fileInputRef.current?.click(); setToolsOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Dosya Yükle</span>
                </button>
              )}
              <button type="button"
                onClick={() => {
                  const next = !imageMode;
                  setImageMode(next);
                  if (next) { setWebSearch(false); setAttachments([]); onClearEditImage?.(); }
                  setToolsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{ color: imageMode ? "rgb(126,34,206)" : "var(--text-secondary)", background: imageMode ? "rgba(126,34,206,0.06)" : "transparent" }}
                onMouseEnter={e => { if (!imageMode) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (!imageMode) e.currentTarget.style.background = "transparent"; }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="flex-1 text-left">Görsel Üret</span>
                {imageMode && <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </button>
              {!imageMode && (
                <button type="button"
                  onClick={() => {
                    const next = !webSearch;
                    setWebSearch(next);
                    if (next) setImageMode(false);
                    setToolsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: webSearch ? "rgb(29,78,216)" : "var(--text-secondary)", background: webSearch ? "rgba(29,78,216,0.06)" : "transparent" }}
                  onMouseEnter={e => { if (!webSearch) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (!webSearch) e.currentTarget.style.background = "transparent"; }}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                  <span className="flex-1 text-left">Web Araması</span>
                  {webSearch && <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </button>
              )}
              {!isPatient && (
                <>
                  <div className="my-1 mx-3" style={{ borderTop: "1px solid var(--border-secondary)" }} />
                  <div className="px-1">
                    <ModelSelector model={model} onModelChange={m => { onModelChange(m); setToolsOpen(false); }} disabled={disabled} inline />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />

        {/* ── Unified pill: [ textarea ··· [▶] ] ── */}
        <div
          className={`flex flex-1 items-center rounded-2xl border transition-colors ${
            imageMode
              ? "border-purple-400"
              : "border-[var(--border-primary)] focus-within:border-[var(--brand)]"
          }`}
          style={{ background: "var(--bg-input)" }}
        >
          {/* Textarea — grows vertically, centered */}
          <textarea
            ref={textareaRef}
            autoFocus
            value={text}
            onChange={e => { setText(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={imageMode ? "Görseli açıklayın..." : "Mesaj yazın..."}
            rows={1}
            className="flex-1 self-center px-4 py-3 text-sm resize-none outline-none bg-transparent disabled:opacity-60 overflow-y-auto no-scrollbar"
            style={{ color: "var(--text-primary)", lineHeight: "1.4", maxHeight: "84px" }}
          />

          {/* Send — floats inside pill, vertically centered */}
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || uploading || !text.trim()}
            title={imageMode ? "Görsel oluştur" : "Gönder"}
            className={`shrink-0 m-1.5 w-9 h-9 flex items-center justify-center rounded-xl text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              imageMode ? "bg-purple-600 hover:bg-purple-700" : "btn-brand"
            }`}
          >
            {disabled
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : imageMode
                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
