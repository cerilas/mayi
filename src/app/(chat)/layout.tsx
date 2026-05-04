"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center" style={{ height: "100dvh", background: "var(--bg-secondary)" }}>
        <div className="w-6 h-6 border-2 brand-border-spinner rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div
      style={{
        display: "flex",
        height: "100dvh",
        overflow: "hidden",
        background: "var(--bg-primary)",
        position: "relative",
      }}
    >
      {/* ── Backdrop (mobile) ── */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "var(--overlay-bg)",
          }}
          className="md:hidden"
        />
      )}

      {/* ── Sidebar ──
          Desktop: static flex item
          Mobile: fixed slide-in panel
      ── */}
      <div
        className="hidden md:flex md:flex-col md:shrink-0"
        style={{ width: "var(--sidebar-width, 260px)" }}
      >
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "260px",
          zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 200ms ease-in-out",
        }}
      >
        <Sidebar />
      </div>

      {/* ── Main column ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Mobile top bar */}
        <div
          className="md:hidden"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0 1rem",
            height: "48px",
            flexShrink: 0,
            borderBottom: "1px solid var(--border-primary)",
            background: "var(--bg-primary)",
            zIndex: 20,
            position: "relative",
          }}
        >
          <button
            onClick={toggleSidebar}
            style={{ color: "var(--text-secondary)", padding: "6px", borderRadius: "8px", background: "transparent", border: "none", cursor: "pointer", display: "flex" }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/logo.png" alt="" style={{ width: "24px", height: "24px", borderRadius: "6px", objectFit: "contain" }} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>MY FizyoAI</span>
        </div>

        {/* Page content (ChatArea) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
