"use client";

import { useEffect } from "react";
import { applyTheme, loadSavedTheme } from "@/lib/theme";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(loadSavedTheme());
  }, []);

  return <>{children}</>;
}
