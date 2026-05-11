"use client";

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import { useSession } from "next-auth/react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TextType from "./TextType";
import { appConfig } from "@/lib/config";
import AssistantAvatar from "./AssistantAvatar";

function ShareButton({ conversationId }: { conversationId: string }) {
  const [shared, setShared] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Fetch current share status
  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/share`)
      .then((r) => r.json())
      .then((data) => {
        setShared(!!data.shared);
        setShareId(data.shareId ?? null);
      })
      .catch(() => {});
  }, [conversationId]);

  const toggleShare = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/share`, {
        method: "POST",
      });
      const data = await res.json();
      setShared(!!data.shared);
      setShareId(data.shareId ?? null);
      setCopied(false);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!shareId) return;
    const url = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: "var(--text-tertiary)" }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        title="Paylaş"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-lg p-4 w-72" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Sohbeti Paylaş</h3>

            {shared && shareId ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Bu sohbet herkese açık bir link ile paylaşılıyor.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareId}`}
                    className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 truncate text-gray-600"
                  />
                  <button
                    onClick={copyLink}
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    {copied ? "Kopyalandı!" : "Kopyala"}
                  </button>
                </div>
                <button
                  onClick={toggleShare}
                  disabled={loading}
                  className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg py-1.5 transition-colors disabled:opacity-50"
                >
                  {loading ? "İşleniyor..." : "Paylaşımı Kaldır"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Bir link oluşturun, herkes giriş yapmadan sohbeti görüntüleyebilsin.
                </p>
                <button
                  onClick={toggleShare}
                  disabled={loading}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "İşleniyor..." : "Paylaşım Linki Oluştur"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

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
  const { data: session } = useSession();
  const isPatient = session?.user?.role === "patient";
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

  // Fetch patient default model from admin settings
  useEffect(() => {
    if (isPatient) {
      fetch("/api/settings/patient-model")
        .then(r => r.json())
        .then(data => {
          if (data.model) setModel(data.model);
        })
        .catch(() => {});
    }
  }, [isPatient]);

  // Fetch conversation on mount
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setStreamingContent("");
    initialLoadRef.current = true; // Reset so we scroll to bottom on new conversation

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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "instant") => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    } else {
      bottomRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  // Scroll to bottom when sending starts (user message appeared) or streaming begins
  useEffect(() => {
    if (sending || generatingImage) {
      scrollToBottom("smooth");
    }
  }, [sending, generatingImage, scrollToBottom]);

  // Keep scrolled to bottom while streaming content grows
  useEffect(() => {
    if (streamingContent) {
      scrollToBottom("instant");
    }
  }, [streamingContent, scrollToBottom]);

  // Scroll to bottom on first load of each conversation
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (initialLoadRef.current && messages.length > 0) {
      initialLoadRef.current = false;
      // Use rAF to ensure DOM has rendered before scrolling
      requestAnimationFrame(() => scrollToBottom("instant"));
    }
  }, [messages, scrollToBottom]);

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
        const hasImage = pendingAttachments.some((a) => a.mimeType.startsWith("image/"));
        const hasHeavyAttachment = hasPdf || hasImage;
        const totalTimeoutMs = hasHeavyAttachment ? 200000 : 120000;
        const firstChunkMs = hasHeavyAttachment ? 60000 : 30000;

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
            attachmentIds: pendingAttachments.map(a => a.id),
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
        let finalText = accumulated
          .replace(/__KEEPALIVE__/g, "")
          .replace(/\n\n__TITLE_B64__[A-Za-z0-9+/=]+/g, "")
          .replace(/\n\n__ERROR_B64__[A-Za-z0-9+/=]+/g, "");

        // If stream completed but client couldn't parse text, fetch from DB as fallback
        if (!finalText.trim()) {
          try {
            const fallback = await fetch(`/api/conversations/${conversationId}?limit=1`);
            if (fallback.ok) {
              const fbData = await fallback.json();
              const lastMsg = (fbData.messages ?? []).findLast((m: Message) => m.role === "assistant" && m.status === "done");
              if (lastMsg?.content) finalText = lastMsg.content;
            }
          } catch { /* ignore */ }
        }

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
        requestAnimationFrame(() => scrollToBottom("smooth"));

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
                const src = `/api/files/${imgAtt.filePath}`;
                const r = await fetch(src);
                if (!r.ok) throw new Error("Görsel yüklenemedi");
                const blob = await r.blob();
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
      <div className="hidden md:flex px-6 py-3 items-center gap-2 shrink-0" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <h2 className="text-sm font-medium truncate flex-1" style={{ color: "var(--text-primary)" }}>
          {conversation?.title ?? "Sohbet"}
        </h2>
        {generatingImage && (
          <span className="text-xs text-gray-400">görsel oluşturuluyor...</span>
        )}
        <ShareButton conversationId={conversationId} />
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-3 md:pl-6 md:pr-8 relative">
        {/* Watermark — centered & fixed in chat viewport */}
        <div className="pointer-events-none sticky top-0 left-0 w-full h-0 z-0 flex items-center justify-center">
          <div className="absolute top-[40vh] -translate-y-1/2">
            <img src="/watermark-logo.png" alt="" className="w-48 md:w-64 opacity-100" draggable={false} />
          </div>
        </div>
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
          <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--text-tertiary)" }}>
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
                <AssistantAvatar />
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm" style={{ background: "var(--bubble-assistant)", color: "var(--text-secondary)" }}>
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
            <div ref={bottomRef} className="h-1" />
          </>
        )}
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
        isPatient={isPatient}
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
