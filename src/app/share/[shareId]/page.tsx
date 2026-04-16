"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import MessageBubble from "@/components/chat/MessageBubble";

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
  createdAt: string;
  attachments: Attachment[];
}

interface SharedConversation {
  id: string;
  title: string;
  aiProvider: string;
  aiModel: string;
  createdAt: string;
  userName: string;
  messages: Message[];
}

function stripMarkdown(md: string): string {
  return md
    .replace(/!\[.*?\]\(data:[^)]+\)/g, "[Görsel]")
    .replace(/!\[.*?\]\([^)]+\)/g, "[Görsel]")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ""))
    .replace(/^[-*+]\s+/gm, "• ")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeFileName(name: string, fallback: string): string {
  const normalized = (name || fallback).trim();
  const safe = normalized
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120)
    .trim();
  return safe || fallback;
}

export default function SharedChatPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<SharedConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/share/${shareId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Paylaşılan sohbet bulunamadı");
        return r.json();
      })
      .then((d: SharedConversation) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [shareId]);

  const exportPDF = useCallback(async () => {
    if (!data || !messagesRef.current || exporting) return;
    setExporting("pdf");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;
      const marginY = 10;
      const footerSpace = 8;
      const renderWidth = pageWidth - marginX * 2;
      const renderHeight = pageHeight - marginY * 2 - footerSpace;

      // Cover page: color logo + portal label + year
      const coverCanvas = document.createElement("canvas");
      coverCanvas.width = 1200;
      coverCanvas.height = 1697; // A4 ratio
      const coverCtx = coverCanvas.getContext("2d");
      if (!coverCtx) throw new Error("Kapak canvas oluşturulamadı");

      coverCtx.fillStyle = "#f9fafb";
      coverCtx.fillRect(0, 0, coverCanvas.width, coverCanvas.height);

      try {
        const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = "/logo.png";
        });

        const logoMaxWidth = Math.floor(coverCanvas.width * 0.42);
        const logoWidth = Math.max(220, Math.min(logoMaxWidth, logoImg.width));
        const logoHeight = Math.floor(logoWidth * (logoImg.height / logoImg.width));
        const logoX = Math.floor((coverCanvas.width - logoWidth) / 2);
        const logoY = Math.floor(coverCanvas.height * 0.22);
        coverCtx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
      } catch {
        // Keep PDF export functional even if logo fails to load.
      }

      coverCtx.textAlign = "center";
      coverCtx.fillStyle = "#0f172a";
      coverCtx.font = "700 58px Arial";
      coverCtx.fillText("My Fizio AI portalı", coverCanvas.width / 2, Math.floor(coverCanvas.height * 0.58));
      coverCtx.fillStyle = "#475569";
      coverCtx.font = "500 42px Arial";
      coverCtx.fillText("2026", coverCanvas.width / 2, Math.floor(coverCanvas.height * 0.64));

      pdf.addImage(
        coverCanvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageWidth,
        pageHeight
      );

      const scale = Math.min(2, window.devicePixelRatio || 1.5);
      const messageNodes = Array.from(messagesRef.current.children) as HTMLElement[];
      let currentY = marginY;

      if (messageNodes.length > 0) {
        pdf.addPage();
      }

      for (const node of messageNodes) {
        const canvas = await html2canvas(node, {
          scale,
          useCORS: true,
          backgroundColor: "#f9fafb",
          logging: false,
        });

        const pxPerMm = canvas.width / renderWidth;
        const messageHeightMm = canvas.height / pxPerMm;

        // Prefer page breaks between messages so bubbles are not cut in half.
        if (messageHeightMm <= renderHeight && currentY + messageHeightMm > marginY + renderHeight) {
          pdf.addPage();
          currentY = marginY;
        }

        if (messageHeightMm <= renderHeight) {
          const imageData = canvas.toDataURL("image/jpeg", 0.92);
          pdf.addImage(imageData, "JPEG", marginX, currentY, renderWidth, messageHeightMm);
          currentY += messageHeightMm + 2;
          continue;
        }

        // If a single message is taller than a page, split only that message.
        let offsetY = 0;
        const sliceHeightPx = Math.max(1, Math.floor(renderHeight * pxPerMm));
        while (offsetY < canvas.height) {
          if (currentY !== marginY) {
            pdf.addPage();
            currentY = marginY;
          }

          const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - offsetY);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = currentSliceHeight;

          const ctx = sliceCanvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context oluşturulamadı");

          ctx.fillStyle = "#f9fafb";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            offsetY,
            canvas.width,
            currentSliceHeight,
            0,
            0,
            canvas.width,
            currentSliceHeight
          );

          const renderedSliceHeight = currentSliceHeight / pxPerMm;
          const imageData = sliceCanvas.toDataURL("image/jpeg", 0.92);
          pdf.addImage(imageData, "JPEG", marginX, currentY, renderWidth, renderedSliceHeight);
          offsetY += currentSliceHeight;
        }

        currentY = marginY + 2;
      }

      const pageCount = pdf.getNumberOfPages();
      for (let page = 1; page <= pageCount; page++) {
        pdf.setPage(page);
        pdf.setFontSize(9);
        pdf.setTextColor(120);
        pdf.text(`Sayfa ${page}/${pageCount}`, pageWidth - marginX, pageHeight - 3, { align: "right" });
      }

      const fileName = sanitizeFileName(data.title, "sohbet");
      pdf.save(`${fileName}.pdf`);
    } catch {
      alert("PDF oluşturulurken bir hata oluştu.");
    } finally {
      setExporting(null);
    }
  }, [data, exporting]);

  const exportExcel = useCallback(async () => {
    if (!data || exporting) return;
    setExporting("excel");
    try {
      const XLSX = await import("xlsx");
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      const rows = data.messages.map((msg) => {
        const attachmentNames = msg.attachments.map((a) => {
          if (a.mimeType.startsWith("image/")) return `[Görsel: ${a.fileName}]`;
          if (a.mimeType === "application/pdf") return `[PDF: ${a.fileName}]`;
          return `[Dosya: ${a.fileName}]`;
        });

        const imageUrls = msg.attachments
          .filter((a) => a.mimeType.startsWith("image/"))
          .map((a) => {
            const fileName = encodeURIComponent(a.filePath.split("/").pop() || "");
            return `${origin}/api/files/${fileName}`;
          });

        const content = stripMarkdown(msg.content);
        const fullContent = attachmentNames.length
          ? `${attachmentNames.join(", ")}\n${content}`
          : content;

        return {
          Rol: msg.role === "user" ? "Kullanıcı" : "Asistan",
          Mesaj: fullContent,
          Model: msg.model || "-",
          Tarih: msg.createdAt
            ? new Date(msg.createdAt).toLocaleString("tr-TR")
            : "-",
          "Görsel URL": imageUrls[0] || "-",
          "Görsel URL'leri": imageUrls.length ? imageUrls.join("\n") : "-",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // Column widths
      ws["!cols"] = [
        { wch: 12 },
        { wch: 80 },
        { wch: 25 },
        { wch: 20 },
        { wch: 60 },
        { wch: 90 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sohbet");
      const fileName = sanitizeFileName(data.title, "sohbet");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } catch {
      alert("Excel oluşturulurken bir hata oluştu.");
    } finally {
      setExporting(null);
    }
  }, [data, exporting]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Sohbet bulunamadı</h1>
          <p className="text-sm text-gray-500">
            Bu paylaşım linki geçersiz veya sohbet artık paylaşılmıyor.
          </p>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(data.createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Watermark */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
        <img src="/my-bg-wm.svg" alt="" className="w-48 md:w-64" draggable={false} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="MY Fizyoterapi" className="w-8 h-8 rounded-xl object-contain" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-gray-800 truncate">{data.title}</h1>
            <p className="text-xs text-gray-400">
              {data.userName} tarafından paylaşıldı · {formattedDate}
            </p>
          </div>
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-[11px] text-gray-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
            </svg>
            Paylaşılan sohbet
          </span>

          {/* Download buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportPDF}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              title="PDF olarak indir"
            >
              {exporting === "pdf" ? (
                <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9.3 15.5c-.1.4-.4.7-.8.8-.2.1-.4.1-.6.1-.5 0-.9-.2-1.2-.5-.5-.5-.5-1.3 0-1.8.3-.3.7-.5 1.2-.5.2 0 .4 0 .6.1.4.1.7.4.8.8H8.1c-.1-.2-.3-.3-.6-.3-.4 0-.7.3-.7.7s.3.7.7.7c.3 0 .5-.1.6-.3h1.2zm2.2.9h-1.1v-3h1.8c.5 0 .9.4.9.9v.2c0 .5-.4.9-.9.9h-.7v1zm0-1.8v.8h.6c.2 0 .3-.1.3-.3v-.2c0-.2-.1-.3-.3-.3h-.6zm4.4 1.8H14v-3h1.9c.5 0 .9.4.9.9v1.2c0 .5-.4.9-.9.9zm-.9-.9h.8c.2 0 .3-.1.3-.3v-1c0-.2-.1-.3-.3-.3H15v1.6z"/>
                </svg>
              )}
              PDF
            </button>
            <button
              onClick={exportExcel}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
              title="Excel olarak indir"
            >
              {exporting === "excel" ? (
                <div className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h2.5l1.5 2.5L13.5 13H16l-2.5 3.5L16 20h-2.5L12 17.5 10.5 20H8l2.5-3.5L8 13z"/>
                </svg>
              )}
              Excel
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="max-w-3xl mx-auto px-4 py-6 relative z-10 min-h-[60vh]">
        <div ref={messagesRef} className="relative z-10">
          {data.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role as "user" | "assistant"}
              content={msg.content}
              model={msg.model}
              provider={msg.provider}
              status={msg.status}
              errorMessage={msg.errorMessage}
              attachments={msg.attachments}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="MY Fizyoterapi" className="w-10 h-10 mx-auto rounded-xl object-contain" />
          <p className="text-xs text-gray-400">
            Bu sohbet{" "}
            <a href="https://my.cerilas.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">
              MyFizioAI
            </a>
            {" "}ile oluşturulmuş ve paylaşılmıştır.
          </p>
        </div>
      </main>
    </div>
  );
}
