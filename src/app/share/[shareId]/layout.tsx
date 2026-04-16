import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paylaşılan Sohbet — MY FizyoAI",
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
