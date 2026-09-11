"use client";

import { ArrowRight, Brain, Database, FileText, Globe, type LucideIcon, Puzzle } from "lucide-react";
import { CONCEPT_ICONS, fieldLook, type Concept } from "@/lib/concept-icons";

// Shared operation-display helpers — the adapter iconography and the typed
// input→output signature — used by both the catalogue card (OperationCard)
// and the operation detail page (OperationViewer), so the two never drift.

type AdapterLook = { Icon: LucideIcon; tile: string };

// Where an adapter maps onto a concept in the canonical icon directory
// (lib/concept-icons.ts), reuse the directory's look so Operations can't drift
// from the rest of the app. Only the Icon + tile are needed here (no label).
function conceptAdapterLook(concept: Concept): AdapterLook {
  const { Icon, tile } = CONCEPT_ICONS[concept];
  return { Icon, tile };
}

// The adapter's visual identity — icon + brand-token classes. Keyed on the
// first segment of `operation.adapter` (e.g. "http", "langchain"). Concept-
// backed adapters (agent, secret, operation, user, test, schema) come straight
// from the directory; the rest are adapter-specific flavours the directory
// doesn't model (a web endpoint, an LLM, a data store, a document). Unknown
// adapters fall back to a neutral puzzle tile so a new adapter never renders
// blank.
export function adapterLook(adapter: string | null): AdapterLook {
  switch (adapter) {
    case "http":
      return { Icon: Globe, tile: "bg-secondary/15 text-secondary" }; // a web endpoint
    case "langchain":
    case "openai":
    case "llm":
      return { Icon: Brain, tile: "bg-primary/15 text-primary" }; // an LLM-backed op
    case "a2a":
    case "agent":
      return conceptAdapterLook("agent");
    case "secret":
    case "vault":
      return conceptAdapterLook("secret");
    case "schema":
    case "json": {
      const { Icon, tile } = fieldLook("schema")!;
      return { Icon, tile };
    }
    case "data":
    case "dlfs":
      return { Icon: Database, tile: "bg-chart-3/20 text-chart-3" }; // a data store
    case "file":
      return { Icon: FileText, tile: "bg-chart-1/20 text-chart-1" }; // a document
    case "mcp":
      return conceptAdapterLook("operation");
    case "user":
      return conceptAdapterLook("user");
    case "test":
      return conceptAdapterLook("test");
    default:
      return { Icon: Puzzle, tile: "bg-muted text-muted-foreground" };
  }
}

export function adapterOfMetadata(operation: any): string | null {
  return (operation?.adapter as string | undefined)?.split(":")[0] ?? null;
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

function FieldChips({ fields, tone, max }: { fields: SchemaField[]; tone: "in" | "out"; max: number }) {
  const shown = fields.slice(0, max);
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
      {hidden > 0 && <span className="font-mono text-[11px] text-muted-foreground">+{hidden}</span>}
    </>
  );
}

/**
 * The typed input→output signature of an operation, rendered as a bordered
 * block of field chips. Returns null when the operation declares neither
 * inputs nor outputs, so callers can include it unconditionally.
 *
 * `max` caps chips per side (cards stay tight; the detail page shows more).
 */
export function OperationSignature({
  operation,
  max = 4,
  className = "",
}: {
  operation: any;
  max?: number;
  className?: string;
}) {
  const inputFields = fieldsFrom(operation?.input);
  const outputFields = fieldsFrom(operation?.output);
  if (inputFields.length === 0 && outputFields.length === 0) return null;

  return (
    <div
      data-testid="operation-signature"
      className={`rounded-md border bg-muted/40 px-3 py-2 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          in
        </span>
        {inputFields.length > 0 ? (
          <FieldChips fields={inputFields} tone="in" max={max} />
        ) : (
          <span className="font-mono text-xs text-muted-foreground">—</span>
        )}
        <ArrowRight size={14} className="mx-0.5 text-primary" strokeWidth={2.4} />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          out
        </span>
        {outputFields.length > 0 ? (
          <FieldChips fields={outputFields} tone="out" max={max} />
        ) : (
          <span className="font-mono text-xs text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}
