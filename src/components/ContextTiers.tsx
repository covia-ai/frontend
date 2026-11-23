import Link from "next/link";
import { ArrowRight, Bot, Brain, Building2, FolderTree, History, ScrollText, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TypeTile } from "@/components/TypeTile";
import { cn } from "@/lib/utils";
import { CONTEXT_TIERS, SCOPE_LABELS, SCOPE_TILE } from "@/lib/context-tiers";
import { CARD_GRID_CLASS } from "@/lib/grid";

// One glyph per tier so the six sources are distinguishable at a glance; the
// tile colour comes from the tier's scope (SCOPE_TILE), so the icon names the
// tier and the colour encodes the scope.
const TIER_ICONS: Record<string, LucideIcon> = {
  memory: Brain,
  workspace: FolderTree,
  agent: Bot,
  session: History,
  job: ScrollText,
  venue: Building2,
};

// Answers "what does my agent know and where does it come from" without a
// click (#228 AC1) — always visible above the Memory section, not gated behind
// interaction. Each card links to a real browse view (AC2); n/, c/, t/
// share their nearest honest root (g or j) since no view browses their
// exact per-agent/per-session/per-job node directly yet — see the linkLabel
// for the path to drill into from there.
export function ContextTiers() {
  return (
    <div className={CARD_GRID_CLASS} data-testid="context-tiers">
      {CONTEXT_TIERS.map((tier) => {
        const Icon = TIER_ICONS[tier.key] ?? Brain;
        return (
          <Card
            key={tier.key}
            data-testid={`context-tier-${tier.key}`}
            className="flex h-full flex-col justify-between gap-3 p-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <TypeTile Icon={Icon} tile={SCOPE_TILE[tier.scope]} className="size-9" iconSize={18} title={tier.label} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{tier.label}</h3>
                    <Badge className={cn("border-transparent font-normal", SCOPE_TILE[tier.scope])}>
                      {SCOPE_LABELS[tier.scope]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{tier.prefix}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            </div>
            <Link
              href={tier.href}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {tier.linkLabel}
              <ArrowRight size={13} />
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
