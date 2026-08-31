"use client";

import dynamic from "next/dynamic";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JSON_EDITOR_DIALOG_CLASS, JSON_EDITOR_MAX_WIDTH } from "@/lib/dialog-sizes";
import { cn } from "@/lib/utils";

const ThemedJsonEditor = dynamic(
  () => import("@/components/ThemedJsonEditor").then((module) => module.ThemedJsonEditor),
  { ssr: false },
);

// Same "small control opens a dialog with the raw schema" shape as
// OperationInputForm's ViewSchemaButton — the venue enforced this result
// against `schema` (strict mode), so unlike a normal schema-viewer this one
// is a claim of verification, not just documentation.
export function StrictValidatedBadge({ schema }: { schema: unknown }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="strict-validated-badge"
          className="gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-600/40"
        >
          <BadgeCheck size={14} />
          Validated against schema
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(JSON_EDITOR_DIALOG_CLASS, "content-start overflow-y-auto")}>
        <DialogTitle>Response Schema</DialogTitle>
        <ThemedJsonEditor data={schema} rootName="responseSchema" maxWidth={JSON_EDITOR_MAX_WIDTH} />
      </DialogContent>
    </Dialog>
  );
}
