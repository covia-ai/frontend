"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Asset, Venue } from "@covia/covia-sdk";
import { useRouter } from "next/navigation";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { AssetInfoSheet } from "./AssetInfoSheet";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Boxes,
  Braces,
  Database,
  FileText,
  FlaskConical,
  Globe,
  KeyRound,
  type LucideIcon,
  Puzzle,
  Sparkles,
  User,
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
// blank. Exported so the catalogue's facet chips can share the iconography.
export function adapterLook(adapter: string | null): { Icon: LucideIcon; tile: string } {
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
    case "vault":
      return { Icon: KeyRound, tile: "bg-accent/25 text-accent-foreground" };
    case "schema":
    case "json":
      return { Icon: Braces, tile: "bg-chart-2/20 text-chart-2" };
    case "data":
    case "dlfs":
      return { Icon: Database, tile: "bg-chart-3/20 text-chart-3" };
    case "file":
      return { Icon: FileText, tile: "bg-chart-1/20 text-chart-1" };
    case "mcp":
      return { Icon: Boxes, tile: "bg-chart-5/20 text-chart-5" };
    case "user":
      return { Icon: User, tile: "bg-chart-1/20 text-chart-1" };
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
  const shown = fields.slice(0, 4);
  const hidden = fields.length - shown.length;
  const bg = tone === "in" ? "bg-input-color" : "bg-output-color";
  return (
    <>
      {shown.map((f) => (
        <span
          key={f.key}
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] leading-none text-io-foreground ${bg}`}
        >
          <span className="font-medium">{f.key}</span>
          {f.required && <span className="text-red-500">*</span>}
          <span className="opacity-60">{f.type}</span>
        </span>
      ))}
      {hidden > 0 && (
        <span className="font-mono text-[11px] text-muted-foreground">+{hidden}</span>
      )}
    </>
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
  const visibleKeywords = keywords.slice(0, 4);
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
    <Card className="group flex h-full flex-col gap-0 overflow-hidden rounded-lg border bg-card p-0 shadow-sm transition-all hover:border-accent hover:shadow-md">
      {/* Header: adapter identity + name + info sheet */}
      <div className="flex flex-row items-center gap-3 border-b bg-card-banner px-4 py-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tile}`}>
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <button
          type="button"
          data-testid="asset-header"
          onClick={handleClick}
          className="min-w-0 flex-1 text-left"
        >
          <div className="truncate text-base font-semibold leading-tight text-foreground">
            {asset.metadata.name || "Unnamed Asset"}
          </div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{asset.id}</div>
        </button>
        {venue && <AssetInfoSheet asset={asset} venueId={venue.venueId} />}
      </div>

      {/* Body: description, signature, tags */}
      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        <div
          data-testid="asset-description"
          className="line-clamp-2 cursor-pointer text-sm text-card-foreground"
          onClick={handleClick}
        >
          {asset.metadata.description || "No description available"}
        </div>

        {hasSignature && (
          <div
            data-testid="operation-signature"
            className="rounded-md border bg-muted/40 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                in
              </span>
              {inputFields.length > 0 ? (
                <FieldChips fields={inputFields} tone="in" />
              ) : (
                <span className="font-mono text-xs text-muted-foreground">—</span>
              )}
              <ArrowRight size={14} className="mx-0.5 text-primary" strokeWidth={2.4} />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                out
              </span>
              {outputFields.length > 0 ? (
                <FieldChips fields={outputFields} tone="out" />
              ) : (
                <span className="font-mono text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <div data-testid="asset-tags" className="flex flex-1 flex-wrap items-center gap-1">
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
          <button
            type="button"
            data-testid="operation-open"
            onClick={handleClick}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
          >
            Open <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </Card>
  );
}
