import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemePreference } from "@/lib/ui/ThemePreference";
import { cn } from "@/lib/utils";
import "./globals.css";

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-peglens-display",
  display: "swap",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-peglens-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-peglens-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "PegLens — broker vs chain",
  description:
    "Live premium/discount board for tokenized stocks. Equity vs xStock vs Ondo, with an honest cheapest-venue CTA when quotes compare.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#111114" },
    { media: "(prefers-color-scheme: light)", color: "#f6f1e8" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(display.variable, sans.variable, mono.variable, sans.className)}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: ThemePreference.blockingScript(),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
