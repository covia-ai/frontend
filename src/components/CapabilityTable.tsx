"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HitlCap } from "@/lib/hitl";

export type CapRow = HitlCap & { included?: boolean };

interface CapabilityTableProps {
  // edit   — freely edit {with, can} rows: the self-sovereign token case, where
  //          the user signs with their own authority and may raise or lower.
  // select — include/exclude read-only offered rows: the venue-minted grant
  //          case, where the venue only mints what was offered, so narrow-only.
  mode: "edit" | "select";
  rows: CapRow[];
  onChange: (rows: CapRow[]) => void;
  disabled?: boolean;
}

function formatExp(exp?: number): string {
  if (!exp) return "";
  // Offered grant exps are absolute Unix seconds.
  return new Date(exp * 1000).toLocaleString();
}

// The shared capability grid behind both HITL granting surfaces, so an access
// token (COG-19) and a capability grant (COG-17) read as the same thing: a
// resource, an ability, one row each.
export function CapabilityTable({ mode, rows, onChange, disabled }: CapabilityTableProps) {
  const update = (i: number, patch: Partial<CapRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const add = () => onChange([...rows, { with: "", can: "", included: true }]);

  return (
    <div className="flex flex-col gap-2" data-testid="capability-table">
      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="w-4" />
        <span>Resource (with)</span>
        <span>Ability (can)</span>
        <span className="w-6" />
      </div>

      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center" data-testid="capability-row">
          {mode === "select" ? (
            <Checkbox
              checked={row.included !== false}
              disabled={disabled}
              aria-label={`Include ${row.with} ${row.can}`}
              onCheckedChange={(c) => update(i, { included: !!c })}
            />
          ) : (
            <span className="w-4" />
          )}

          {mode === "edit" ? (
            <>
              <Input
                value={row.with}
                disabled={disabled}
                placeholder="w/reports/"
                className="h-8 font-mono text-xs"
                onChange={(e) => update(i, { with: e.target.value })}
              />
              <Input
                value={row.can}
                disabled={disabled}
                placeholder="crud/read"
                className="h-8 font-mono text-xs"
                onChange={(e) => update(i, { can: e.target.value })}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    aria-label="Remove capability" disabled={disabled}
                    onClick={() => remove(i)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove capability</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <span className="font-mono text-xs truncate" title={row.with}>{row.with}</span>
              <span className="font-mono text-xs truncate" title={row.can}>
                {row.can}
                {row.exp && <span className="ml-2 text-muted-foreground">· expires {formatExp(row.exp)}</span>}
              </span>
              <span className="w-6" />
            </>
          )}
        </div>
      ))}

      {mode === "edit" && (
        <div>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={add} data-testid="capability-add">
            <Plus size={14} className="mr-1" /> Add capability
          </Button>
        </div>
      )}

      {mode === "select" && rows.length === 0 && (
        <Label className="text-xs text-muted-foreground">No capabilities offered.</Label>
      )}
    </div>
  );
}
