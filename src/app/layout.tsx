// =======================================
// app/layout.tsx — Versão Premium Pedraum
// =======================================

import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsappFloatButton from "@/components/ui/WhatsappFloatButton";
import MaintenanceScreen from "@/components/layout/MaintenanceScreen";

// =========================
// CHAVE GLOBAL DE MANUTENÇÃO
// =========================
// Mude para 'false' quando o problema for resolvido e o site volta ao normal na hora!
const IS_MAINTENANCE_MODE = true;

// =========================
// Fonte global
// =========================
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// =========================
// SEO + Metadados
// =========================
export const metadata: Metadata = {
  title: "Pedraum Brasil — Plataforma de Demandas de Mineração",
  description: "A maior plataforma de demandas de mineração e britagem do Brasil. Publique, encontre e negocie soluções reais.",
  metadataBase: new URL("https://pedraum.com.br"),
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Pedraum Brasil",
    description: "A plataforma nº 1 para demandas reais de mineração e britagem.",
    url: "https://pedraum.com.br",
    siteName: "Pedraum Brasil",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Pedraum Brasil" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pedraum Brasil",
    description: "Publique e encontre demandas reais de mineração e britagem.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning style={{ touchAction: "manipulation", overscrollBehaviorY: "none" }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="320" />
      </head>

      <body className={`${inter.className} bg-[#F6F9FA] text-[#023047] antialiased`}>

        {/* A MÁGICA ACONTECE AQUI */}
        {IS_MAINTENANCE_MODE ? (
          <MaintenanceScreen />
        ) : (
          <>
            <Header />
            <main className="min-h-screen w-full mx-auto">
              {children}
            </main>
            <WhatsappFloatButton />
            <Footer />
          </>
        )}

      </body>
    </html>
  );
}