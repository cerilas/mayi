"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTypewriter } from "@/hooks/useTypewriter";
import AssistantAvatar from "@/components/chat/AssistantAvatar";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  provider?: string | null;
  status?: string;
  errorMessage?: string | null;
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    filePath: string;
  }>;
  isStreaming?: boolean;
  onEditImage?: (src: string, mimeType: string) => void;
}

export default function MessageBubble({
  role,
  content,
  model,
  provider,
  status,
  errorMessage,
  attachments = [],
  isStreaming,
  onEditImage,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const isError = status === "error";
  const [lightbox, setLightbox] = useState<string | null>(null);

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop anything else

    // Sadece düz metni oku (görselleri ve markdown karakterlerini temizle)
    const plainText = content
      .replace(/!\[.*?\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+\)/g, "")
      .replace(/([*#_`\[\]()])/g, "")
      .trim();

    if (!plainText) return;

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = "tr-TR";
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Typewriter effect: reveal streamed content character by character
  const typedContent = useTypewriter(isStreaming ? (content || '') : '', 14);
  const renderContent = isStreaming ? typedContent : (content || '');

  // Long message expansion logic
  const CHARACTER_LIMIT = 800;
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  // Görsel (Base64) içeren mesajların gereksiz yere uzun metin olarak algılanmasını ve 
  // Devamını Gör butonu çıkarıp kasmaya neden olmasını engellemek için hızlı kontrol.
  const hasBase64Image = content.includes("data:image/");
  const showSeeMore = !isUser && !isError && !hasBase64Image && content.length > CHARACTER_LIMIT && !isExpanded;

  function downloadImage(src: string) {
    const a = document.createElement("a");
    a.href = src;
    a.download = "gorsel.png";
    a.click();
  }

  return (
    <>
    <div className={`flex min-w-0 gap-3 py-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar */}
      {!isUser && (
        <AssistantAvatar />
      )}

      <div className={`max-w-[90%] sm:max-w-[75%] min-w-0 ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {/* Image attachments */}
        {attachments.filter((a) => a.mimeType.startsWith("image/")).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-1 justify-end">
            {attachments
              .filter((a) => a.mimeType.startsWith("image/"))
              .map((att) => {
                const src = `/api/files/${encodeURIComponent(att.filePath.split("/").pop() || "")}`;
                return (
                  <div key={att.id} className="relative group w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={att.fileName}
                      className="w-full h-full object-cover"
                    />
                    {onEditImage && (
                      <button
                        onClick={() => onEditImage(src, att.mimeType)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Bu görseli düzenle"
                      >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* PDF attachments */}
        {attachments.filter((a) => a.mimeType === "application/pdf").length > 0 && (
          <div className="flex flex-col gap-1.5 mb-1">
            {attachments
              .filter((a) => a.mimeType === "application/pdf")
              .map((att) => (
                <a
                  key={att.id}
                  href={`/api/files/${encodeURIComponent(att.filePath.split("/").pop() || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors max-w-[220px]"
                >
                  <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9.3 15.5c-.1.4-.4.7-.8.8-.2.1-.4.1-.6.1-.5 0-.9-.2-1.2-.5-.5-.5-.5-1.3 0-1.8.3-.3.7-.5 1.2-.5.2 0 .4 0 .6.1.4.1.7.4.8.8H8.1c-.1-.2-.3-.3-.6-.3-.4 0-.7.3-.7.7s.3.7.7.7c.3 0 .5-.1.6-.3h1.2zm2.2.9h-1.1v-3h1.8c.5 0 .9.4.9.9v.2c0 .5-.4.9-.9.9h-.7v1zm0-1.8v.8h.6c.2 0 .3-.1.3-.3v-.2c0-.2-.1-.3-.3-.3h-.6zm4.4 1.8H14v-3h1.9c.5 0 .9.4.9.9v1.2c0 .5-.4.9-.9.9zm-.9-.9h.8c.2 0 .3-.1.3-.3v-1c0-.2-.1-.3-.3-.3H15v1.6z"/>
                  </svg>
                  <span className="text-xs text-red-700 truncate">{att.fileName}</span>
                </a>
              ))}
          </div>
        )}

        {/* Bubble & Actions */}
        {(content || isStreaming || isError) && (
          <div className="group/message relative flex flex-col gap-1 items-start">
            <div
              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words [overflow-wrap:anywhere]
                ${isUser
                  ? "user-bubble text-white rounded-br-sm"
                  : isError
                    ? "rounded-bl-sm"
                    : "rounded-bl-sm relative"
                }`}
              style={isUser ? undefined : isError
                ? { background: "var(--bubble-error-bg)", border: "1px solid var(--bubble-error-border)", color: "var(--bubble-error-text)" }
                : { background: "var(--bubble-assistant)", color: "var(--bubble-assistant-text)" }
              }
            >
            {isError ? (
              <div className="flex items-start gap-1.5 min-w-0">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="min-w-0 break-words [overflow-wrap:anywhere] whitespace-pre-wrap [word-break:break-word]">
                  {errorMessage || "Bir hata oluştu. Lütfen tekrar deneyin."}
                </span>
              </div>
            ) : (
              <div className="relative">
                <div 
                  className={`prose-chat w-full min-w-0 ${isUser ? "prose-invert" : ""} ${showSeeMore ? "overflow-hidden" : ""}`}
                  style={showSeeMore ? { 
                    maxHeight: "250px", 
                    WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                    maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" 
                  } : undefined}
                >
                  <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  urlTransform={(url) => url}
                  key={isStreaming ? undefined : content}
                  components={{
                    img: ({ src, alt }) => {
                      const srcStr = typeof src === "string" ? src : null;
                      return srcStr ? (
                        <span className="block relative group mt-2 w-fit">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={srcStr}
                            alt={alt ?? "Oluşturulan görsel"}
                            className="max-w-full rounded-lg border border-gray-200 cursor-pointer"
                            onClick={() => setLightbox(srcStr)}
                          />
                          {/* Overlay buttons */}
                          <span className="absolute top-2 right-2 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setLightbox(srcStr)}
                              title="Büyüt"
                              className="p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0zM11 8v6M8 11h6" />
                              </svg>
                            </button>
                            <button
                              onClick={() => downloadImage(srcStr)}
                              title="İndir"
                              className="p-1.5 rounded-md bg-black/60 hover:bg-black/80 text-white"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                              </svg>
                            </button>
                          </span>
                        </span>
                      ) : null;
                    },
                    a: ({ href, children }) => {
                      if (!href) return <a>{children}</a>;
                      
                      const match = href.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                      if (match) {
                        const videoId = match[1];
                        return (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block my-3 max-w-[280px] sm:max-w-sm rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:opacity-90 transition-opacity no-underline"
                          >
                            <div className="relative aspect-video bg-black/10">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                alt="Video Önizleme"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-sm">
                                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="text-sm font-medium text-[var(--bubble-assistant-text)] truncate">
                                {children}
                              </div>
                              <div className="text-[11px] text-[var(--bubble-assistant-text)] opacity-70 mt-1 truncate">
                                {href}
                              </div>
                            </div>
                          </a>
                        );
                      }
                      return <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-90 hover:opacity-100">{children}</a>;
                    },
                  }}
                >
                  {renderContent}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-0.5 h-[1em] bg-gray-500 ml-0.5 align-text-bottom" style={{ animation: 'blink 1s step-end infinite' }} />
                )}
                </div>
                
                {showSeeMore && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center pointer-events-none pb-4">
                    <button 
                      onClick={() => setIsExpanded(true)}
                      className="pointer-events-auto px-6 py-2.5 btn-brand rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                    >
                      Devamını Gör
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>

            {/* AI Action Buttons (TTS vs) */}
            {!isUser && !isError && content && !isStreaming && (
              <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover/message:opacity-100 transition-opacity px-1 -mt-0.5">
                <button
                  onClick={handleSpeak}
                  title={isSpeaking ? "Dinlemeyi Durdur" : "Sesli Oku"}
                  className={`p-1.5 rounded-md transition-colors ${
                    isSpeaking 
                      ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" 
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {isSpeaking ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        )}


      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5" style={{ background: "var(--bg-tertiary)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--text-secondary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>

    {/* Lightbox */}
    {lightbox && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={() => setLightbox(null)}
      >
        <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Büyütülmüş görsel"
            className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain shadow-2xl"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => downloadImage(lightbox)}
              title="İndir"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              İndir
            </button>
            <button
              onClick={() => setLightbox(null)}
              title="Kapat"
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
