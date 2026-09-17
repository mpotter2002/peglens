"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorView({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Desk error</p>
          <CardTitle className="font-display text-3xl font-normal">PegLens could not render</CardTitle>
          <CardDescription className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            The board failed before any marks were shown. Nothing on this page is a price, a fill, or an estimate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={reset}>
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
