"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { CONCEPT_ICONS } from "@/lib/concept-icons";

// Discovery doorway the flat composer never had — one tap into the surfaces a
// person actually works in. Static links (no data, no reads); the destinations
// gate their own auth. Kept in the shared card vocabulary of the redesigned
// Operations / Connections pages. Each glyph comes from the canonical icon
// directory (lib/concept-icons.ts) so a doorway wears the same icon as its
// destination; the tile stays a uniform primary wash (a Home-row treatment).
type Action = { href: string; label: string; blurb: string; Icon: LucideIcon };

const ACTIONS: Action[] = [
  { href: "/agents/create", label: "New agent", blurb: "Spin one up from a skill or template.", Icon: CONCEPT_ICONS.create.Icon },
  { href: "/operations", label: "Browse operations", blurb: "Run something from the catalogue.", Icon: CONCEPT_ICONS.operation.Icon },
  { href: "/connections", label: "Connect a service", blurb: "Wire up a tool your agents can use.", Icon: CONCEPT_ICONS.connection.Icon },
  { href: "/jobs", label: "View jobs", blurb: "Follow what your agents have run.", Icon: CONCEPT_ICONS.job.Icon },
];

export function QuickActions() {
  return (
    <section aria-labelledby="home-quick-actions">
      <h2
        id="home-quick-actions"
        className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Go anywhere
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACTIONS.map(({ href, label, blurb, Icon }) => (
          <Link
            key={href}
            href={href}
            data-testid="home-quick-action"
            className="group flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-accent hover:shadow-md"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon size={16} strokeWidth={2} />
            </span>
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="text-xs leading-snug text-muted-foreground">{blurb}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
