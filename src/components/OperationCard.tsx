"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Asset, Venue } from "@covia/covia-sdk";
import { useRouter } from "next/navigation";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { AssetInfoSheet } from "./AssetInfoSheet";
import {
  ArrowRight,
  Bot,
  Braces,
  Database,
  FlaskConical,
  Globe,
  KeyRound,
  type LucideIcon,
  Puzzle,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface OperationCardProps {
  asset: Asset;
  venue?: Venue;
  /** False outside a /venues/[slug] route — see AssetCard for the rationale. */
  scoped?: boolean;
}

// Abbreviate a JSON-schema type for a compact chip. Unknown/edge types keep
// their own label rather than being dropped, so nothing in the schema hides.
const TYPE_ABBR: Record<string, string> = {
  string: "str",
  number: "num",
  integer: "int",
  boolean: "bool",
  object: "obj",
  array: "arr",
  any: "any",
  asset: "asset",
  null: "null",
};
function abbrevType(t: unknown): string {
  if (typeof t === "string") return TYPE_ABBR[t] ?? t;
  if (Array.isArray(t)) return t.map(abbrevType).join("|");
  return "any";
}

// The adapter's visual identity — icon + brand-token classes. Keyed on the
// first segment of `operation.adapter` (e.g. "http", "langchain"). Unknown
// adapters fall back to a neutral puzzle tile so a new adapter never renders
// blank.
function adapterLook(adapter: string | null): { Icon: LucideIcon; tile: string } {
  switch (adapter) {
    case "http":
      return { Icon: Globe, tile: "bg-secondary/15 text-secondary" };
    case "langchain":
    case "openai":
    case "llm":
      return { Icon: Sparkles, tile: "bg-primary/15 text-primary" };
    case "a2a":
    case "agent":
      return { Icon: Bot, tile: "bg-primary/15 text-primary" };
    case "secret":
      return { Icon: KeyRound, tile: "bg-accent/25 text-accent-foreground" };
    case "schema":
    case "json":
      return { Icon: Braces, tile: "bg-chart-2/20 text-chart-2" };
    case "data":
    case "dlfs":
      return { Icon: Database, tile: "bg-chart-3/20 text-chart-3" };
    case "test":
      return { Icon: FlaskConical, tile: "bg-muted text-muted-foreground" };
    default:
      return { Icon: Puzzle, tile: "bg-muted text-muted-foreground" };
  }
}

interface SchemaField {
  key: string;
  type: string;
  required: boolean;
}
function fieldsFrom(schema: any): SchemaField[] {
  const props = schema?.properties;
  if (!props || typeof props !== "object") return [];
  const required: string[] = Array.isArray(schema?.required) ? schema.required : [];
  return Object.keys(props).map((key) => ({
    key,
    type: abbrevType(props[key]?.type),
    required: required.includes(key),
  }));
}

function FieldChips({ fields, tone }: { fields: SchemaField[]; tone: "in" | "out" }) {
  const shown = fields.slice(0, 3);
  const hidden = fields.length - shown.length;
  const bg = tone === "in" ? "bg-input-color" : "bg-output-color";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((f) => (
        <span
          key={f.key}
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] leading-none text-io-foreground ${bg}`}
        >
          <span className="font-medium">{f.key}</span>
          {f.required && <span className="text-red-500">*</span>}
          <span className="opacity-60">{f.type}</span>
        </span>
      ))}
      {hidden > 0 && (
        <span className="font-mono text-[10px] text-muted-foreground">+{hidden}</span>
      )}
    </div>
  );
}

export function OperationCard({ asset, venue: venueProp, scoped = true }: OperationCardProps) {
  const fallbackVenue = useAuthenticatedVenue();
  const venue = venueProp ?? fallbackVenue;
  const router = useRouter();

  const op = asset.metadata?.operation as any;
  const adapterFull = (op?.adapter as string | undefined) ?? null;
  const adapter = adapterFull?.split(":")[0] ?? null;
  const { Icon, tile } = adapterLook(adapter);

  const inputFields = fieldsFrom(op?.input);
  const outputFields = fieldsFrom(op?.output);
  const hasSignature = inputFields.length > 0 || outputFields.length > 0;
  const stepCount = Array.isArray(op?.steps) ? op.steps.length : 0;

  const keywords: string[] = Array.isArray(asset.metadata?.keywords) ? asset.metadata.keywords : [];
  const visibleKeywords = keywords.slice(0, 3);
  const hiddenKeywordCount = keywords.length - visibleKeywords.length;

  // Preserve AssetCard's exact navigation: unscoped lists route to the
  // venue-less /operation/<path>, scoped lists to /venues/<id>/operations/<path>.
  const handleClick = () => {
    if (!scoped) {
      router.push("/operation/" + asset.id);
      return;
    }
    if (!venue) return;
    router.push("/venues/" + encodeURIComponent(venue.venueId) + "/operations/" + asset.id);
  };

  return (
    <Card className="group flex h-full flex-col gap-0 overflow-hidden rounded-md border-2 border-muted bg-card p-0 shadow-md transition-colors hover:border-accent">
      {/* Header: adapter identity + name + info sheet */}
      <div className="flex flex-row items-center gap-2 border-b bg-card-banner p-2.5">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${tile}`}>
          <Icon size={16} strokeWidth={1.9} />
        </span>
        <button
          type="button"
          data-testid="asset-header"
          onClick={handleClick}
          className="min-w-0 flex-1 text-left"
        >
          <div className="truncate text-sm font-semibold text-foreground">
            {asset.metadata.name || "Unnamed Asset"}
          </div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">{asset.id}</div>
        </button>
        {venue && <AssetInfoSheet asset={asset} venueId={venue.venueId} />}
      </div>

      {/* Body: description, signature, tags */}
      <div className="flex flex-1 cursor-pointer flex-col gap-2 p-2.5" onClick={handleClick}>
        <div
          data-testid="asset-description"
          className="line-clamp-2 text-xs text-card-foreground"
        >
          {asset.metadata.description || "No description available"}
        </div>

        {hasSignature && (
          <div
            data-testid="operation-signature"
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1"
          >
            <span className="font-mono text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              in
            </span>
            {inputFields.length > 0 ? (
              <FieldChips fields={inputFields} tone="in" />
            ) : (
              <span className="font-mono text-[10px] text-muted-foreground">—</span>
            )}
            <ArrowRight size={12} className="text-primary" strokeWidth={2.4} />
            <span className="font-mono text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              out
            </span>
            {outputFields.length > 0 ? (
              <FieldChips fields={outputFields} tone="out" />
            ) : (
              <span className="font-mono text-[10px] text-muted-foreground">—</span>
            )}
          </div>
        )}

        <div data-testid="asset-tags" className="mt-auto flex flex-wrap items-center gap-1 pt-0.5">
          {adapter && (
            <Badge
              variant="outline"
              className="w-fit px-1.5 py-0 font-mono text-[10px] text-muted-foreground"
            >
              {adapter}
            </Badge>
          )}
          {stepCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="flex w-fit items-center gap-1 border-chart-4/40 px-1.5 py-0 text-[10px] text-chart-4"
                >
                  <Workflow size={10} /> {stepCount} steps
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Composite operation — {stepCount} steps</TooltipContent>
            </Tooltip>
          )}
          {visibleKeywords.length > 0 && (
            <div data-testid="asset-keywords" className="flex flex-wrap items-center gap-1">
              {visibleKeywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="secondary"
                  className="w-fit px-1.5 py-0 text-[10px] text-secondary-foreground"
                >
                  {keyword}
                </Badge>
              ))}
              {hiddenKeywordCount > 0 && (
                <Badge
                  variant="outline"
                  className="w-fit px-1.5 py-0 text-[10px] text-muted-foreground"
                >
                  +{hiddenKeywordCount}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
