export interface ThemeColor {
  id: string;
  label: string;
  hex: string;        // primary button/avatar color
  hexLight: string;   // light bg (hover states, sidebar button)
  hexDark: string;    // darker shade for text
  tailwindName: string;
}

export const THEME_COLORS: ThemeColor[] = [
  { id: "blue",   label: "Mavi",   hex: "#2563eb", hexLight: "#eff6ff", hexDark: "#1d4ed8", tailwindName: "blue" },
  { id: "teal",   label: "Teal",   hex: "#0d9488", hexLight: "#f0fdfa", hexDark: "#0f766e", tailwindName: "teal" },
  { id: "purple", label: "Mor",    hex: "#7c3aed", hexLight: "#f5f3ff", hexDark: "#6d28d9", tailwindName: "purple" },
  { id: "green",  label: "Yeşil",  hex: "#16a34a", hexLight: "#f0fdf4", hexDark: "#15803d", tailwindName: "green" },
  { id: "orange", label: "Turuncu",hex: "#ea580c", hexLight: "#fff7ed", hexDark: "#c2410c", tailwindName: "orange" },
  { id: "rose",   label: "Pembe",  hex: "#e11d48", hexLight: "#fff1f2", hexDark: "#be123c", tailwindName: "rose" },
  { id: "slate",  label: "Gri",    hex: "#475569", hexLight: "#f8fafc", hexDark: "#334155", tailwindName: "slate" },
];

export const DEFAULT_THEME_ID = "blue";

export type ColorMode = "light" | "dark";

export function getTheme(id: string): ThemeColor {
  return THEME_COLORS.find((t) => t.id === id) ?? THEME_COLORS[0];
}

export function applyTheme(id: string) {
  const theme = getTheme(id);
  const root = document.documentElement;
  root.style.setProperty("--brand", theme.hex);
  root.style.setProperty("--brand-dark", theme.hexDark);

  // In dark mode, use a subtle semi-transparent brand-light
  const isDark = root.classList.contains("dark");
  root.style.setProperty(
    "--brand-light",
    isDark ? hexToRgba(theme.hex, 0.15) : theme.hexLight
  );

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("theme", id);
  }
}

export function applyColorMode(mode: ColorMode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("colorMode", mode);
  }
  // Re-apply brand theme so brand-light adapts
  applyTheme(loadSavedTheme());
}

export function loadSavedTheme(): string {
  if (typeof localStorage === "undefined") return DEFAULT_THEME_ID;
  return localStorage.getItem("theme") ?? DEFAULT_THEME_ID;
}

export function loadSavedColorMode(): ColorMode {
  if (typeof localStorage === "undefined") return "light";
  const saved = localStorage.getItem("colorMode");
  if (saved === "dark" || saved === "light") return saved;
  // Fallback to system preference
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
