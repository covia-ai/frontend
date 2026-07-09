"use client";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tags, X } from "lucide-react";

interface TagFilterDropdownProps {
  /** Adapter names (purple badge on operation cards) — pass [] where not applicable, e.g. plain data assets. */
  adapterOptions: string[];
  /** metadata.keywords values (blue badge on both asset and operation cards). */
  keywordOptions: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export function TagFilterDropdown({ adapterOptions, keywordOptions, selected, onChange }: TagFilterDropdownProps) {
  const hasOptions = adapterOptions.length > 0 || keywordOptions.length > 0;

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="shrink-0 gap-2"
          disabled={!hasOptions}
          data-testid="tag-filter-trigger"
        >
          <Tags size={14} />
          Tags
          {selected.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{selected.length}</Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto" data-testid="tag-filter-menu">
        {selected.length > 0 && (
          <>
            <DropdownMenuCheckboxItem
              checked={false}
              onCheckedChange={() => onChange([])}
              onSelect={(e) => e.preventDefault()}
              className="text-muted-foreground pl-2"
            >
              <X size={12} /> Clear all
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        {adapterOptions.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase py-1">Adapter</DropdownMenuLabel>
            {adapterOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={`adapter-${option}`}
                checked={selected.includes(option)}
                onCheckedChange={() => toggle(option)}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="inline-block size-2 rounded-full bg-primary" />
                {option}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
        {keywordOptions.length > 0 && (
          <>
            {adapterOptions.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase py-1">Keyword</DropdownMenuLabel>
            {keywordOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={`keyword-${option}`}
                checked={selected.includes(option)}
                onCheckedChange={() => toggle(option)}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="inline-block size-2 rounded-full bg-secondary" />
                {option}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
