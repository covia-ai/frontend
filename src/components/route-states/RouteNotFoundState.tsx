import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

type RouteNotFoundStateProps = {
  title?: string;
  description?: string;
  homeHref?: string;
};

export function RouteNotFoundState({
  title = "Page not found",
  description = "The page may have moved, been deleted, or the link may be incorrect.",
  homeHref = "/",
}: RouteNotFoundStateProps) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <SearchX className="text-muted-foreground" size={24} aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Button asChild className="mt-6">
          <Link href={homeHref}>Back to home</Link>
        </Button>
      </section>
    </main>
  );
}
