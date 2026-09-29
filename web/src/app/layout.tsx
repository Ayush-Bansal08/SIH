import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AskDrawer } from "@/components/ask/AskDrawer";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AS_OF_LABEL, REPORT_LABEL, portfolio } from "@/lib/data";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: "PAIMANA-PRISM — Predictive Risk Intelligence", template: "%s · PAIMANA-PRISM" },
  description:
    "Prototype intelligence layer on PAIMANA project-monitoring data: early-warning risk scores, plain-language drivers and same-ministry budget scenarios.",
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${serif.variable}`}>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <SiteHeader asOf={AS_OF_LABEL} report={REPORT_LABEL} />
        <main id="main" className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6">
          {children}
        </main>
        <SiteFooter report={REPORT_LABEL} asOf={AS_OF_LABEL} origin={portfolio.report.origin} />
        <AskDrawer />
      </body>
    </html>
  );
}
