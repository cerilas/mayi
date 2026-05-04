"use client";

import { useEffect } from "react";
import { applyTheme, applyColorMode, loadSavedTheme, loadSavedColorMode } from "@/lib/theme";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply color mode first (adds/removes .dark on <html>)
    applyColorMode(loadSavedColorMode());
    // Then apply brand color (reads .dark for brand-light)
    applyTheme(loadSavedTheme());
  }, []);

  return <>{children}</>;
}
