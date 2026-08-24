import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CONTEXT_TIERS, SCOPE_BADGE_CLASSES, SCOPE_LABELS } from "@/lib/context-tiers";
import { CARD_GRID_CLASS } from "@/lib/grid";

// Answers "what does my agent know and where does it come from" without a
// click (#228 AC1) — always visible above the Memory tab, not gated behind
// interaction. Each card links to a real browse view (AC2); n/, c/, t/
// share their nearest honest root (g or j) since no view browses their
// exact per-agent/per-session/per-job node directly yet — see the linkLabel
// for the path to drill into from there.
export function ContextTiers() {
  return (
    <div className={CARD_GRID_CLASS} data-testid="context-tiers">
      {CONTEXT_TIERS.map((tier) => (
        <div
          key={tier.key}
          data-testid={`context-tier-${tier.key}`}
          className="flex h-full flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">{tier.label}</h3>
              <Badge variant="outline" className={SCOPE_BADGE_CLASSES[tier.scope]}>
                {SCOPE_LABELS[tier.scope]}
              </Badge>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{tier.prefix}</p>
            <p className="text-sm text-muted-foreground">{tier.description}</p>
          </div>
          <Link
            href={tier.href}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {tier.linkLabel}
            <ArrowRight size={13} />
          </Link>
        </div>
      ))}
    </div>
  );
}
