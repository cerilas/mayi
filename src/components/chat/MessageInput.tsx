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
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxMb = appConfig.upload.maxFileSizeMb;
  const allowedTypes = appConfig.upload.allowedMimeTypes;

  // Auto-focus textarea when component mounts or becomes enabled
  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus();
    }
  }, [disabled]);

  // When an external edit image arrives, auto-enter image mode
  useEffect(() => {
    if (editImage) {
      setImageMode(true);
      setAttachments([]);
      textareaRef.current?.focus();
    }
  }, [editImage]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadError("");

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setUploadError(`Desteklenmeyen tür: ${file.type}`);
        return;
      }
      if (file.size > maxMb * 1024 * 1024) {
        setUploadError(`Maksimum dosya boyutu: ${maxMb}MB`);
        return;
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error ?? "Yükleme başarısız");
        return;
      }

      const newAtts: PendingAttachment[] = data.attachments.map(
        (att: PendingAttachment) => ({
          ...att,
          preview: att.mimeType === "application/pdf"
            ? ""
            : URL.createObjectURL(files.find((f) => f.name === att.fileName)!),
        })
      );
      setAttachments((prev) => [...prev, ...newAtts]);
    } catch {
      setUploadError("Yükleme sırasında hata oluştu");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  const handleSend = useCallback(() => {
    const content = text.trim();
    if ((!content && attachments.length === 0) || disabled || uploading) return;

    if (imageMode && onGenerateImage) {
      // Use externally loaded edit image first, then fall back to uploaded attachment
      let inputImage: { mimeType: string; base64: string } | undefined;
      if (editImage) {
        inputImage = editImage;
      } else {
        const imgAttachment = attachments.find((a) => a.mimeType.startsWith("image/"));
        if (imgAttachment?.preview && imgAttachment.preview.startsWith("data:")) {
          const [header, b64] = imgAttachment.preview.split(",");
          const mimeMatch = header.match(/data:([^;]+)/);
          if (mimeMatch && b64) {
            inputImage = { mimeType: mimeMatch[1], base64: b64 };
          }
        }
      }
      onGenerateImage(content, inputImage);
      setText("");
      setAttachments([]);
      onClearEditImage?.();
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      return;
    }

    if ((!content && attachments.length === 0)) return;

    onSend(
      content,
      attachments.map((a) => a.id),
      "gemini",
      model,
      attachments.map((a) => ({ id: a.id, fileName: a.fileName, mimeType: a.mimeType, filePath: a.filePath })),
      webSearch
    );
    setText("");
    setAttachments([]);
    setWebSearch(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [text, attachments, disabled, uploading, onSend, model, imageMode, onGenerateImage, setAttachments, editImage, onClearEditImage, webSearch]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {/* Disclaimer */}
      {appConfig.disclaimer.enabled && (
        <div className="text-xs text-gray-400 text-center mb-2 flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>{appConfig.disclaimer.text}</p>
        </div>
      )}

      {/* External edit image preview */}
      {editImage && imageMode && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
            <Image
              src={`data:${editImage.mimeType};base64,${editImage.base64}`}
              alt="Düzenlenecek görsel"
              fill
              className="object-cover"
            />
          </div>
          <span className="text-xs text-purple-700 flex-1">Düzenleme modu aktif</span>
          <button
            onClick={() => { onClearEditImage?.(); setImageMode(false); }}
            className="text-purple-400 hover:text-purple-700 transition-colors"
            title="İptal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Pending attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att) =>
            att.mimeType === "application/pdf" ? (
              <div key={att.id} className="relative group flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9.3 15.5c-.1.4-.4.7-.8.8-.2.1-.4.1-.6.1-.5 0-.9-.2-1.2-.5-.5-.5-.5-1.3 0-1.8.3-.3.7-.5 1.2-.5.2 0 .4 0 .6.1.4.1.7.4.8.8H8.1c-.1-.2-.3-.3-.6-.3-.4 0-.7.3-.7.7s.3.7.7.7c.3 0 .5-.1.6-.3h1.2zm2.2.9h-1.1v-3h1.8c.5 0 .9.4.9.9v.2c0 .5-.4.9-.9.9h-.7v1zm0-1.8v.8h.6c.2 0 .3-.1.3-.3v-.2c0-.2-.1-.3-.3-.3h-.6zm4.4 1.8H14v-3h1.9c.5 0 .9.4.9.9v1.2c0 .5-.4.9-.9.9zm-.9-.9h.8c.2 0 .3-.1.3-.3v-1c0-.2-.1-.3-.3-.3H15v1.6z"/>
                </svg>
                <span className="text-xs text-gray-700 max-w-[120px] truncate">{att.fileName}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="ml-1 w-4 h-4 bg-gray-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <div key={att.id} className="relative group w-16 h-16">
                <Image
                  src={att.preview}
                  alt={att.fileName}
                  fill
                  className="object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            )
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 mb-2">{uploadError}</p>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Upload button (hidden in image mode) */}
        {!imageMode && (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 p-2 text-gray-500 brand-icon-btn rounded-lg transition-colors disabled:opacity-40"
          title="Görsel veya PDF yükle"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-gray-300 brand-spinner rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        )}
        {/* Image generation toggle */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setImageMode((v) => !v); setAttachments([]); onClearEditImage?.(); }}
          className={`flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-40 ${
            imageMode
              ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
              : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
          }`}
          title={imageMode ? "Görsel üretim modu aktif – Kapatmak için tıkla" : "Görsel üret (Gemini ile)"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>
        {/* Web search toggle (disabled in image mode) */}
        {!imageMode && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setWebSearch((v) => !v)}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-40 ${
              webSearch
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
            }`}
            title={webSearch ? "Web araması aktif – Kapatmak için tıkla" : "Web araması yap (Google)"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Textarea */}
        <div className={`flex-1 border rounded-xl overflow-hidden bg-white transition-colors ${
          imageMode
            ? "border-purple-300 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-400"
            : "border-gray-300 brand-focus-within"
        }`}>
          {imageMode && (
            <div className="flex items-center gap-1.5 px-3 pt-2 text-xs text-purple-600 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Görsel Üret Modu
            </div>
          )}
          <textarea
            ref={textareaRef}
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={imageMode ? "Oluşturulacak görseli açıklayın..." : "Mesaj yazın... (Shift+Enter: yeni satır)"}
            rows={1}
            className="w-full px-3 py-2.5 text-sm resize-none outline-none bg-transparent max-h-48 disabled:opacity-60"
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || uploading || !text.trim()}
          className={`flex-shrink-0 p-2.5 text-white rounded-xl transition-colors disabled:opacity-40 ${
            imageMode
              ? "bg-purple-600 hover:bg-purple-700"
              : "btn-brand"
          }`}
          title={imageMode ? "Görsel oluştur" : "Gönder"}
        >
          {disabled ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : imageMode ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* Model selector (hidden for patients) */}
      {!isPatient && (
      <div className="flex justify-start mt-2">
        <ModelSelector
          model={model}
          onModelChange={onModelChange}
          disabled={disabled}
        />
      </div>
      )}
    </div>
  );
}
