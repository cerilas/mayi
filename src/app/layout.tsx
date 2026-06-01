import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
import { SessionProvider } from "next-auth/react";
import ThemeProvider from "@/components/providers/ThemeProvider";
import CookieConsent from "@/components/layout/CookieConsent";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "MY FizyoAI",
  description: "Mahmut Yücel Fizyoterapi Kliniği - AI Asistanı",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full">
      <head>
        {/* Google Analytics Consent Mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              
              // Default ayar (reddedilmiş varsayılır, banner'da kabul edilene kadar)
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'wait_for_update': 500
              });

              // Eğer önceden izin verdiyse, anında granted yap
              if (typeof window !== 'undefined') {
                if (localStorage.getItem('cookie_consent') === 'granted') {
                  gtag('consent', 'update', {
                    'analytics_storage': 'granted'
                  });
                }
              }
            `
          }}
        />
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-MEVKFFBN57"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-MEVKFFBN57');
            `
          }}
        />
      </head>
      <body className={`${inter.className} ${montserrat.variable} h-full antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            {children}
            <CookieConsent />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

