"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, Search, X } from "lucide-react";

interface FilterGroup {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}

interface SearchFilter {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface FiltersSheetProps {
  title?: string;
  description?: string;
  search?: SearchFilter;
  groups: FilterGroup[];
}

// Side-panel filter form (mirrors studio.lyzr.ai's "Filter Traces" sheet):
// edits are staged locally and only take effect on "Apply Filters", so
// toggling several checkboxes doesn't fire a fetch per click. "Clear All"
// resets and commits immediately.
export function FiltersSheet({
  title = "Filter Jobs",
  description = "Apply filters to narrow down your job results",
  search,
  groups,
}: FiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState(search?.value ?? "");
  const [draftGroups, setDraftGroups] = useState<string[][]>(() => groups.map((g) => g.selected));

  useEffect(() => {
    if (!open) return;
    setDraftSearch(search?.value ?? "");
    setDraftGroups(groups.map((g) => g.selected));
    // Re-sync drafts only when the sheet opens, not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const activeCount = groups.reduce((sum, g) => sum + g.selected.length, 0) + (search?.value.trim() ? 1 : 0);

  const toggleDraft = (groupIndex: number, value: string) => {
    setDraftGroups((prev) =>
      prev.map((selected, i) =>
        i === groupIndex
          ? selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
          : selected
      )
    );
  };

  const applyFilters = () => {
    search?.onChange(draftSearch);
    groups.forEach((g, i) => g.onChange(draftGroups[i] ?? []));
    setOpen(false);
  };

  const clearAll = () => {
    setDraftSearch("");
    setDraftGroups(groups.map(() => []));
    search?.onChange("");
    groups.forEach((g) => g.onChange([]));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="shrink-0 gap-2" data-testid="filters-trigger">
          <Filter size={14} />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{activeCount}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent data-testid="filters-sheet" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-6">
          {search && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={search.placeholder ?? "Search..."}
                  className="pl-8"
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                />
              </div>
            </div>
          )}

          {groups.map((group, i) => (
            <div key={group.label} className="flex flex-col gap-2">
              <label className="text-sm font-medium">{group.label}</label>
              <div className="flex flex-col gap-2">
                {group.options.map((option) => {
                  const checked = draftGroups[i]?.includes(option.value) ?? false;
                  return (
                    <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={() => toggleDraft(i, option.value)} />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={clearAll} className="gap-1">
            <X size={14} /> Clear All
          </Button>
          <Button onClick={applyFilters}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
