"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandWordmark } from "@/components/BrandWordmark";
import { HEADER_TAGLINE } from "@/lib/ui/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DemoHostInfo } from "@/lib/types";

export function useScrolled(threshold = 0): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => {
      const next = window.scrollY > threshold;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);
  return scrolled;
}

export function AppChrome({
  host,
  sessionLabel,
  sessionClosed,
}: {
  host: DemoHostInfo;
  sessionLabel: string;
  sessionClosed: boolean;
}) {
  const scrolled = useScrolled();
  return (
    <header className={cn("desk-header sticky top-0 z-40 w-full", scrolled && "is-scrolled")}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="min-w-0">
          <Link href="/" className="block min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Tokenized equity desk
            </p>
            <h1 className="mt-0.5 leading-none">
              <BrandWordmark />
            </h1>
          </Link>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">{HEADER_TAGLINE}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{host.label}</Badge>
          <Badge variant="secondary">Not a broker</Badge>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5",
              sessionClosed ? "bg-session/10" : "bg-discount/10",
            )}
            aria-live="polite"
          >
            <span className={cn("live-dot size-1.5 rounded-full", sessionClosed ? "bg-session" : "bg-discount")} />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{sessionLabel}</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
