"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";

const MOBILE_HEADER_H = 48; // px

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

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
        <div className="w-6 h-6 border-2 brand-border-spinner rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <>
      {/* ═══════════════════════════════════════════
          DESKTOP: classic flex layout, full height
          ═══════════════════════════════════════════ */}
      <div
        className="hidden md:flex"
        style={{ height: "100dvh", overflow: "hidden", background: "var(--bg-primary)" }}
      >
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE: fixed header + fixed content area
          ═══════════════════════════════════════════ */}

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "var(--overlay-bg)" }}
          onClick={closeSidebar}
        />
      )}

      {/* Mobile sidebar (slides in from left) */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-65 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* Mobile fixed header */}
      <header
        className="md:hidden"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: MOBILE_HEADER_H,
          zIndex: 45,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0 1rem",
          borderBottom: "1px solid var(--border-primary)",
          background: "var(--bg-primary)",
        }}
      >
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img src="/logo.png" alt="" className="w-6 h-6 rounded object-contain" />
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>MY FizyoAI</span>
      </header>

      {/* Mobile content area — fixed, below the header */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          top: MOBILE_HEADER_H,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
        }}
      >
        {children}
      </div>
    </>
  );
}
