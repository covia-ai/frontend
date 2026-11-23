"use client";

import { ArrowRight } from "lucide-react";
import { adapterLookup, type AdapterLook } from "@/lib/adapter-icons";

// Shared operation-display helpers — the adapter iconography and the typed
// input→output signature — used by both the catalogue card (OperationCard)
// and the operation detail page (OperationViewer), so the two never drift.

export type { AdapterLook };

// The adapter's visual identity — icon + brand-token classes. Keyed on the
// first segment of `operation.adapter` (e.g. "http", "langchain"). Sourced from
// the single adapter directory (lib/adapter-icons.ts), the same source the Jobs
// list uses, so Operations can never drift from it.
export function adapterLook(adapter: string | null): AdapterLook {
  return adapterLookup(adapter);
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
  /** Empty for a top-level (unnamed) value — the chip then shows type only. */
  key: string;
  type: string;
  required: boolean;
}
function fieldsFrom(schema: any): SchemaField[] {
  if (!schema || typeof schema !== "object") return [];
  const props = schema.properties;
  // A schema without `properties` is a single top-level value, not an empty
  // one: OperationInputForm renders exactly one editor for it under
  // TOP_LEVEL_INPUT_KEY. Reporting no fields here would show "in —" beside a
  // Run tab that asks for a value, and would blank the signature entirely for
  // an operation whose input and output are both top-level.
  if (!props || typeof props !== "object") {
    return [{ key: "", type: abbrevType(schema.type ?? "any"), required: false }];
  }
  const required: string[] = Array.isArray(schema.required) ? schema.required : [];
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
      {shown.map((f, index) => (
        <span
          key={f.key || `top-${index}`}
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] leading-none text-io-foreground ${bg}`}
        >
          {f.key && <span className="font-medium">{f.key}</span>}
          {f.required && <span className="text-destructive">*</span>}
          <span className={f.key ? "opacity-60" : "font-medium"}>{f.type}</span>
        </span>
      ))}
      {hidden > 0 && <span className="font-mono text-[11px] text-muted-foreground">+{hidden}</span>}
    </>
  );
}

/**
 * The typed input→output signature of an operation, rendered as a bordered
 * block of field chips. Returns null when the operation declares neither an
 * input nor an output schema at all, so callers can include it
 * unconditionally.
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
