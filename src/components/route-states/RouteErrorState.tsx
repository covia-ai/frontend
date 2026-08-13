"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorDisplay } from "@/components/ErrorDisplay";

type RouteErrorStateProps = {
  title?: string;
  description?: string;
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
};

export function RouteErrorState({
  title = "This page could not be loaded",
  description = "Try loading it again. If the problem continues, return to the home page.",
  error,
  reset,
  homeHref = "/",
}: RouteErrorStateProps) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="text-destructive" size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <ErrorDisplay
          error={error.message || "An unexpected error occurred"}
          className="mt-5 rounded-md bg-muted/40 p-3 text-left"
        />
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset} className="gap-2">
            <RotateCcw size={15} aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href={homeHref}>Back to home</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
