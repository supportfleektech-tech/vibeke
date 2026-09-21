import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "KINARA — The Sovereign African Digital Platform",
  description:
    "The first premium African-designed digital ecosystem. Blending Apple polish, Linear speed, Notion organization, Discord communities, and Google Maps local discovery with high-trust sovereign commerce.",
  keywords: ["Kinara", "African Tech", "Silicon Savannah", "Nairobi", "Lagos", "Kigali", "Sovereign Platform", "Modular Social"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${GeistSans.className} bg-[#060b0b] text-[#f1f5f9] antialiased min-h-screen selection:bg-emerald-600 selection:text-white`}>
        {children}
        <Toaster position="top-right" richColors closeButton theme="dark" />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] bg-emerald-600 text-black px-4 py-2 rounded-xl text-sm font-bold">
          Skip to content
        </a>
      </body>
    </html>
  );
}
