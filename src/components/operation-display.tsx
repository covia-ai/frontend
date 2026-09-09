"use client";

import {
  ArrowRight,
  Bot,
  Boxes,
  Braces,
  Brain,
  Database,
  FileText,
  FlaskConical,
  Globe,
  KeyRound,
  type LucideIcon,
  Puzzle,
  User,
} from "lucide-react";

// Shared operation-display helpers — the adapter iconography and the typed
// input→output signature — used by both the catalogue card (OperationCard)
// and the operation detail page (OperationViewer), so the two never drift.

// The adapter's visual identity — icon + brand-token classes. Keyed on the
// first segment of `operation.adapter` (e.g. "http", "langchain"). Unknown
// adapters fall back to a neutral puzzle tile so a new adapter never renders
// blank.
export function adapterLook(adapter: string | null): { Icon: LucideIcon; tile: string } {
  switch (adapter) {
    case "http":
      return { Icon: Globe, tile: "bg-secondary/15 text-secondary" };
    case "langchain":
    case "openai":
    case "llm":
      return { Icon: Brain, tile: "bg-primary/15 text-primary" };
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
