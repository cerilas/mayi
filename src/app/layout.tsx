import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
import { SessionProvider } from "next-auth/react";
import ThemeProvider from "@/components/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXTAUTH_URL || "https://myfizyopilates.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gaziantep Fizyoterapi ve Yapay Zeka | MY FizyoAI",
    template: "%s | MY FizyoAI",
  },
  description:
    "Gaziantep fizyoterapi ve yapay zeka destekli dijital rehabilitasyon deneyimi. Egzersiz takibi, sohbet destekli bilgilendirme ve modern fizyoterapi yaklaşımı.",
  keywords: [
    "Gaziantep Fizyoterapi",
    "Gaziantep Fizyoterapi ve Yapay Zeka",
    "Fizyoterapi Yapay Zeka",
    "Gaziantep Rehabilitasyon",
    "MY FizyoAI",
    "Mahmut Yucel Fizyoterapist",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: "MY FizyoAI",
    title: "Gaziantep Fizyoterapi ve Yapay Zeka | MY FizyoAI",
    description:
      "Gaziantep'te fizyoterapiyi yapay zeka ile birlestiren yeni nesil dijital hasta deneyimi.",
    images: [
      {
        url: "/myfizioteamimage.jpg",
        width: 1200,
        height: 630,
        alt: "Gaziantep Fizyoterapi ve Yapay Zeka - MY FizyoAI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gaziantep Fizyoterapi ve Yapay Zeka | MY FizyoAI",
    description:
      "Gaziantep'te fizyoterapiyi yapay zeka ile birlestiren dijital platform.",
    images: ["/myfizioteamimage.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  category: "health",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full">
      <body className={`${inter.className} ${montserrat.variable} h-full antialiased`}>
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

