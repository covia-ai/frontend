import { Badge } from "@/components/ui/badge";

// Acronyms that should stay upper-case rather than title-cased.
const ACRONYMS = new Set(["llm", "id", "url", "api", "ucan", "did", "mcp"]);

function humanizeKey(key: string): string {
  return key
    // camelCase / PascalCase -> spaced words
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      return ACRONYMS.has(lower)
        ? lower.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

const isPrimitive = (value: unknown): value is string | number | boolean =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

function FieldValue({ value }: { value: unknown }) {
  if (value == null) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">None</span>;
    }
    if (value.every(isPrimitive)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, index) => (
            <Badge key={index} variant="outline" className="font-mono text-[11px]">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }
    return (
      <pre className="font-mono text-[11px] bg-muted rounded px-2 py-2 overflow-x-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (typeof value === "boolean") {
    return <span className="font-mono text-[11px]">{value ? "True" : "False"}</span>;
  }

  if (typeof value === "number") {
    return <span className="font-mono text-[11px]">{value}</span>;
  }

  if (typeof value === "string") {
    const isLong = value.length > 100 || value.includes("\n");
    return (
      <p
        className={
          isLong
            ? "whitespace-pre-wrap text-xs leading-relaxed"
            : "font-mono text-[11px] break-all"
        }
      >
        {value}
      </p>
    );
  }

  // Nested object — one level of fallback JSON rather than recursing forever.
  return (
    <pre className="font-mono text-[11px] bg-muted rounded px-2 py-2 overflow-x-auto">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

// Renders an agent config/stateConfig record as labeled fields instead of a
// raw JSON dump — skills/tools as chips, prompts as readable paragraphs,
// everything else as plain labeled values, falling back to pretty JSON only
// for shapes with no clean human rendering (nested objects, mixed arrays).
export function ConfigFields({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, value]) => value != null);
  if (entries.length === 0) {
    return <p className="text-muted-foreground italic text-xs">Empty</p>;
  }
  return (
    <dl className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {humanizeKey(key)}
          </dt>
          <dd>
            <FieldValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
