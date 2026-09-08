"use client";

import dynamic from "next/dynamic";
import { ConfigFields } from "@/components/agent-explorer/ConfigFields";
import { classifyResponseShape } from "@/lib/response-schema";
import { StrictValidatedBadge } from "@/components/typed-result/StrictValidatedBadge";
import { TypedResultTable } from "@/components/typed-result/TypedResultTable";

const ThemedJsonEditor = dynamic(
  () => import("@/components/ThemedJsonEditor").then((module) => module.ThemedJsonEditor),
  { ssr: false },
);

// The registry: picks a renderer by the result's declared JSON Schema shape
// rather than hand-checking Array.isArray/typeof at each call site. Reusable
// wherever a schema-declared result needs to render — job/task output today,
// chat transcripts and Rehearse (#233) once their own data flows carry the
// schema through to render time.
export function TypedResultRenderer({
  value,
  schema,
  strict = false,
}: {
  value: unknown;
  schema: unknown;
  strict?: boolean;
}) {
  const shape = classifyResponseShape(schema);

  let body: React.ReactNode;
  if (shape === "table" && Array.isArray(value)) {
    body = <TypedResultTable value={value} schema={schema} />;
  } else if (shape === "card" && typeof value === "object" && value !== null) {
    body = <ConfigFields data={value as Record<string, unknown>} />;
  } else {
    body = <ThemedJsonEditor data={value} rootName="result" collapse={2} />;
  }

  return (
    <div className="space-y-2">
      {body}
      {strict && shape !== "unknown" && <StrictValidatedBadge schema={schema} />}
    </div>
  );
}
