"use client";

import { useState } from "react";
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

  // Typewriter effect: reveal streamed content character by character
  const typedContent = useTypewriter(isStreaming ? (content || '') : '', 14);
  const renderContent = isStreaming ? typedContent : (content || '');

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

        {/* Bubble */}
        {(content || isStreaming || isError) && (
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words [overflow-wrap:anywhere]
              ${isUser
                ? "user-bubble text-white rounded-br-sm"
                : isError
                  ? "rounded-bl-sm"
                  : "rounded-bl-sm"
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
              <div className={`prose-chat w-full min-w-0 ${isUser ? "prose-invert" : ""}`}>
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
                          <span className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  }}
                >
                  {renderContent}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-0.5 h-[1em] bg-gray-500 ml-0.5 align-text-bottom" style={{ animation: 'blink 1s step-end infinite' }} />
                )}
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
