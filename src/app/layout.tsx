import type { Metadata } from "next";
import type { ReactNode } from "react";
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
      <body className="bg-[#060b0b] text-[#f1f5f9] antialiased min-h-screen selection:bg-emerald-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
