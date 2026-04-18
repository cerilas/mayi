import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giris",
  description: "MY FizyoAI kullanici giris sayfasi",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
