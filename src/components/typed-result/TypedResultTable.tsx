"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { humanizeKey } from "@/components/agent-explorer/ConfigFields";
import { getTableColumns } from "@/lib/response-schema";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Sortable table for the "array of objects" response shape — same
// {col, dir}/toggleSort pattern as JobList.tsx, but columns are derived at
// render time from the schema (or the data itself) instead of fixed.
export function TypedResultTable({ value, schema }: { value: unknown[]; schema: unknown }) {
  const columns = useMemo(() => getTableColumns(schema, value), [schema, value]);
  const [sort, setSort] = useState<{ col: string | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" });

  const toggleSort = (col: string) =>
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));

  const rows = useMemo(() => {
    if (!sort.col) return value;
    const col = sort.col;
    return [...value].sort((a, b) => {
      const av = a && typeof a === "object" ? (a as Record<string, unknown>)[col] : undefined;
      const bv = b && typeof b === "object" ? (b as Record<string, unknown>)[col] : undefined;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : formatCell(av).localeCompare(formatCell(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [value, sort]);

  if (columns.length === 0) {
    return <p className="text-muted-foreground italic text-xs">No rows</p>;
  }

  return (
    <Table className="border border-border rounded-md">
      <TableHeader>
        <TableRow className="bg-secondary-light text-secondary-foreground">
          {columns.map((col) => (
            <TableHead key={col}>
              <button
                type="button"
                onClick={() => toggleSort(col)}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {humanizeKey(col)}
                {sort.col === col ? (
                  sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                ) : (
                  <ArrowUpDown size={12} />
                )}
              </button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index}>
            {columns.map((col) => (
              <TableCell key={col} className="font-mono text-xs break-words">
                {formatCell(row && typeof row === "object" ? (row as Record<string, unknown>)[col] : undefined)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
