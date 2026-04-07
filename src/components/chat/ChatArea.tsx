"use client";

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TextType from "./TextType";
import { appConfig } from "@/lib/config";

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  filePath: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  provider: string | null;
  model: string | null;
  status: string;
  errorMessage: string | null;
  attachments: Attachment[];
}

interface Conversation {
  id: string;
  title: string;
  aiProvider: string;
  aiModel: string;
  messages: Message[];
}

interface ChatAreaProps {
  conversationId: string;
}

export default function ChatArea({ conversationId }: ChatAreaProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const provider = "gemini"; // Sadece Gemini kullan
  const [model, setModel] = useState(appConfig.ai.defaultModel);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editImage, setEditImage] = useState<{ mimeType: string; base64: string } | null>(null);
  const [imageEditHint, setImageEditHint] = useState(false);
  const [, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const oldestMsgIdRef = useRef<string | null>(null);

  // Fetch conversation on mount
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setStreamingContent("");

    fetch(`/api/conversations/${conversationId}?limit=20`)
      .then((r) => r.json())
      .then((data: Conversation & { totalCount?: number; hasMore?: boolean }) => {
        setConversation(data);
        const msgs = data.messages ?? [];
        setMessages(msgs);
        setHasMore(data.hasMore ?? false);
        oldestMsgIdRef.current = msgs[0]?.id ?? null;
        // Provider sabit Gemini - arayüzden OpenAI kaldırıldı
        // Eski GPT modellerini Gemini'ye çevir
        const savedModel = data.aiModel ?? appConfig.ai.defaultModel;
        const isGptModel = savedModel.includes("gpt") || savedModel.includes("openai");
        setModel(isGptModel ? appConfig.ai.defaultModel : savedModel);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Scroll to bottom when sending starts (user message appeared) or streaming begins
  useEffect(() => {
    if (sending || generatingImage) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [sending, generatingImage]);

  // Keep scrolled to bottom while streaming content grows
  useEffect(() => {
    if (streamingContent) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [streamingContent]);

  // Scroll to bottom on first load
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (initialLoadRef.current && messages.length > 0) {
      initialLoadRef.current = false;
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages]);

  // Load more messages when scrolling to top
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestMsgIdRef.current) return;
    setLoadingMore(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}?limit=20&before=${oldestMsgIdRef.current}`
      );
      const data = await res.json() as { messages: Message[]; hasMore: boolean; totalCount: number };
      const older = data.messages ?? [];
      if (older.length > 0) {
        startTransition(() => {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const deduplicated = older.filter((m) => !existingIds.has(m.id));
            return [...deduplicated, ...prev];
          });
          setHasMore(data.hasMore ?? false);
          oldestMsgIdRef.current = older[0]?.id ?? null;
        });
        // Restore scroll position after prepend
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, loadingMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (container.scrollTop < 80 && hasMore && !loadingMore) {
        loadMoreMessages();
      }
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMore, loadMoreMessages]);

  const handleSend = useCallback(
    async (
      content: string,
      attachmentIds: string[],
      _provider: "openai" | "gemini", // Ignored, always use gemini
      selectedModel: string,
      pendingAttachments: { id: string; fileName: string; mimeType: string; filePath: string }[] = [],
      webSearch: boolean = false
    ) => {
      if (sending) return;

      // Detect image-editing intent in regular chat mode
      const hasImageAttachment = pendingAttachments.some((a) => a.mimeType.startsWith("image/"));
      const editKeywords = /düzenle|değiştir|değiştir|arka plan|kaldır|ekle|renk|filtre|kesme|kırp|büyüt|küçült|edit|modify|remove|crop|resize|change|adjust/i;
      if (hasImageAttachment && editKeywords.test(content)) {
        setImageEditHint(true);
        setTimeout(() => setImageEditHint(false), 7000);
      }

      setSending(true);
      setStreamingContent("");

      // Optimistic user message
      const tempId = `temp-${Date.now()}`;
      const userMsg: Message = {
        id: tempId,
        role: "user",
        content,
        provider: "gemini",
        model: selectedModel,
        status: "done",
        errorMessage: null,
        attachments: pendingAttachments,
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const hasPdf = pendingAttachments.some((a) => a.mimeType === "application/pdf");
        const totalTimeoutMs = hasPdf ? 200000 : 95000;
        const firstChunkMs = hasPdf ? 60000 : 15000;

        const abortController = new AbortController();
        const requestTimeout = window.setTimeout(() => {
          abortController.abort();
        }, totalTimeoutMs);
        let receivedAnyChunk = false;
        let firstChunkWatchdog: number | null = window.setTimeout(() => {
          if (!receivedAnyChunk) abortController.abort();
        }, firstChunkMs);

        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            content,
            attachmentIds,
            provider: "gemini",
            model: selectedModel,
            webSearch,
          }),
        });

        clearTimeout(requestTimeout);

        if (!res.ok || !res.body) {
          let serverErr = "Sunucu hatası";
          try {
            const contentType = res.headers.get("content-type") ?? "";
            if (contentType.includes("application/json")) {
              const data = await res.json();
              serverErr = data?.error ?? serverErr;
            } else {
              const text = await res.text();
              if (text.trim()) serverErr = text.slice(0, 300);
            }
          } catch {
            // ignore parse failure and keep generic error
          }
          throw new Error(serverErr);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          receivedAnyChunk = true;
          if (firstChunkWatchdog) {
            clearTimeout(firstChunkWatchdog);
            firstChunkWatchdog = null;
          }
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          // Check for title update signal
          const titleMatch = accumulated.match(/\n\n__TITLE_B64__([A-Za-z0-9+/=]+)/);
          if (titleMatch) {
            try {
              const title = atob(titleMatch[1]);
              setConversation((prev) => (prev ? { ...prev, title } : prev));
            } catch {}
            accumulated = accumulated.replace(/\n\n__TITLE_B64__[A-Za-z0-9+/=]+/, "");
          }

          // Check for error signal
          const errorMatch = accumulated.match(/\n\n__ERROR_B64__([A-Za-z0-9+/=]+)/);
          if (errorMatch) {
            try {
              const error = atob(errorMatch[1]);
              setMessages((prev) => [
                ...prev,
                {
                  id: `err-${Date.now()}`,
                  role: "assistant",
                  content: "",
                  provider: "gemini",
                  model: selectedModel,
                  status: "error",
                  errorMessage: error,
                  attachments: [],
                },
              ]);
            } catch {
              setMessages((prev) => [
                ...prev,
                {
                  id: `err-${Date.now()}`,
                  role: "assistant",
                  content: "",
                  provider: "gemini",
                  model: selectedModel,
                  status: "error",
                  errorMessage: "Sunucudan hata alındı fakat çözümlenemedi.",
                  attachments: [],
                },
              ]);
            }
            accumulated = accumulated.replace(/\n\n__ERROR_B64__[A-Za-z0-9+/=]+/, "");
            setStreamingContent("");
            setSending(false);
            return;
          }

          // Display streaming text (remove control sequences)
          const displayText = accumulated
            .replace(/__KEEPALIVE__/g, "")
            .replace(/\n\n__TITLE_B64__[A-Za-z0-9+/=]+/, "")
            .replace(/\n\n__ERROR_B64__[A-Za-z0-9+/=]+/, "");
          setStreamingContent(displayText);
        }

        // Finalise
        const finalText = accumulated
          .replace(/__KEEPALIVE__/g, "")
          .replace(/\n\n__TITLE_B64__[A-Za-z0-9+/=]+/g, "")
          .replace(/\n\n__ERROR_B64__[A-Za-z0-9+/=]+/g, "");

        if (!finalText.trim()) {
          throw new Error("Modelden boş yanıt alındı. Sağlayıcı/model ayarını kontrol edin.");
        }

        const assistantMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: finalText,
          provider: "gemini",
          model: selectedModel,
          status: "done",
          errorMessage: null,
          attachments: [],
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingContent("");
        // Scroll to bottom after new message
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));

        // Update conversation provider/model if changed
        if (
          "gemini" !== conversation?.aiProvider ||
          selectedModel !== conversation?.aiModel
        ) {
          setConversation((prev) =>
            prev
              ? { ...prev, aiProvider: "gemini", aiModel: selectedModel }
              : prev
          );
        }
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        const errMsg = isAbort
          ? "Yanıt alınamadı (zaman aşımı). API key/sağlayıcı ayarlarını kontrol edin."
          : err instanceof Error
            ? err.message
            : "Hata oluştu";
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "",
            provider: "gemini",
            model: selectedModel,
            status: "error",
            errorMessage: errMsg,
            attachments: [],
          },
        ]);
        setStreamingContent("");
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending, conversation]
  );

  const handleGenerateImage = useCallback(
    async (prompt: string, inputImage?: { mimeType: string; base64: string }) => {
      if (generatingImage) return;
      setGeneratingImage(true);

      // If no inputImage provided, auto-detect the most recent image from chat history.
      // Searches backwards through ALL messages — user attachments take the same priority
      // as AI-generated images, whichever came last wins.
      let resolvedInputImage = inputImage ?? null;
      if (!resolvedInputImage) {
        const dataUriRegex = /!\[.*?\]\((data:([^;]+);base64,([A-Za-z0-9+/=]+))\)/;
        const allMessages = [...messages];
        for (let i = allMessages.length - 1; i >= 0; i--) {
          const msg = allMessages[i];

          // User message: check uploaded image attachments
          if (msg.role === "user" && msg.attachments.length > 0) {
            const imgAtt = msg.attachments.find((a) => a.mimeType.startsWith("image/"));
            if (imgAtt) {
              try {
                const src = `/${imgAtt.filePath.replace("public/", "")}`;
                const blob = await fetch(src).then((r) => r.blob());
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve((reader.result as string).split(",")[1]);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                resolvedInputImage = { mimeType: imgAtt.mimeType, base64 };
              } catch { /* skip and continue searching */ }
              break;
            }
          }

          // Assistant message: check AI-generated images (data: URIs in markdown)
          if (msg.role === "assistant") {
            const match = msg.content.match(dataUriRegex);
            if (match) {
              resolvedInputImage = { mimeType: match[2], base64: match[3] };
              break;
            }
          }
        }
      }

      // Add user message
      const tempId = `temp-img-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          role: "user",
          content: `🎨 Görsel üret: ${prompt}`,
          provider: "gemini",
          model: "gemini-3.1-flash-image-preview",
          status: "done",
          errorMessage: null,
          attachments: [],
        },
      ]);

      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, conversationId, ...(resolvedInputImage ? { inputImage: resolvedInputImage } : {}) }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error ?? "Görsel oluşturulamadı");
        }

        // Replace temp user message with DB id, add assistant message
        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === tempId
              ? { ...m, id: data.userMsgId ?? m.id }
              : m
          ),
          {
            id: data.assistantMsgId ?? `ai-img-${Date.now()}`,
            role: "assistant",
            content: data.assistantContent || "Görsel oluşturuldu.",
            provider: "gemini",
            model: "gemini-3.1-flash-image-preview",
            status: "done",
            errorMessage: null,
            attachments: [],
          },
        ]);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Görsel oluşturulamadı";
        setMessages((prev) => [
          ...prev,
          {
            id: `err-img-${Date.now()}`,
            role: "assistant",
            content: "",
            provider: "gemini",
            model: "gemini-3.1-flash-image-preview",
            status: "error",
            errorMessage: errMsg,
            attachments: [],
          },
        ]);
      } finally {
        setGeneratingImage(false);
      }
    },
    [generatingImage, messages, conversationId]
  );

  const handleEditImage = useCallback((src: string, mimeType: string) => {
    fetch(src)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          setEditImage({ mimeType, base64 });
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 brand-border-spinner rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
      {/* Conversation title bar — hidden on mobile (mobile has its own header in layout) */}
      <div className="hidden md:flex border-b border-gray-200 px-6 py-3 items-center gap-2">
        <h2 className="text-sm font-medium text-gray-800 truncate">
          {conversation?.title ?? "Sohbet"}
        </h2>
        {generatingImage && (
          <span className="text-xs text-gray-400">görsel oluşturuluyor...</span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-3 md:pl-6 md:pr-8">
        {/* Load more indicator */}
        {hasMore && (
          <div className="flex items-center justify-center py-3">
            {loadingMore ? (
              <div className="w-4 h-4 border-2 brand-border-spinner rounded-full animate-spin" />
            ) : (
              <button
                onClick={loadMoreMessages}
                className="text-xs text-gray-400 brand-link-hover transition-colors"
              >
                Önceki mesajları yükle
              </button>
            )}
          </div>
        )}
        {messages.length === 0 && !streamingContent ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Bir şeyler yazın...
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role as "user" | "assistant"}
                content={msg.content}
                model={msg.model}
                provider={msg.provider}
                status={msg.status}
                errorMessage={msg.errorMessage}
                attachments={msg.attachments}
                onEditImage={handleEditImage}
              />
            ))}
            {streamingContent ? (
              <MessageBubble
                role="assistant"
                content={streamingContent}
                model={model}
                provider={provider}
                status="streaming"
                errorMessage={null}
                isStreaming
              />
            ) : (sending || generatingImage) ? (
              // Typing indicator — shown while waiting for first chunk
              <div className="flex gap-3 py-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5" style={{ backgroundColor: "var(--brand)" }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-gray-100 text-sm text-gray-500">
                  <TextType
                    text={["Düşünüyorum", "Yanıt hazırlıyorum", "Bir saniye"]}
                    typingSpeed={70}
                    deletingSpeed={40}
                    pauseDuration={1200}
                    showCursor
                    cursorCharacter="|"
                    cursorBlinkDuration={0.5}
                    loop
                  />
                </div>
              </div>
            ) : null}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onGenerateImage={handleGenerateImage}
        disabled={sending || generatingImage}
        model={model}
        onModelChange={setModel}
        editImage={editImage}
        onClearEditImage={() => setEditImage(null)}
      />

      {/* Image edit hint banner */}
      {imageEditHint && (
        <div className="mx-4 mb-3 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2 text-xs text-purple-700">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>Görseli düzenlemek için mesaj kutusundaki <strong>🎨 Görsel Üret</strong> butonuna tıklayın ve görseli yeniden ekleyin.</span>
          <button onClick={() => setImageEditHint(false)} className="ml-auto text-purple-400 hover:text-purple-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
