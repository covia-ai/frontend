"use client";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ComponentType } from "react";

interface MultiSelectFilterDropdownProps {
  label: string;
  icon: ComponentType<{ size?: number }>;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export function MultiSelectFilterDropdown({ label, icon: Icon, options, selected, onChange }: MultiSelectFilterDropdownProps) {
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="shrink-0 gap-2" data-testid={`${label.toLowerCase()}-filter-trigger`}>
          <Icon size={14} />
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{selected.length}</Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto" data-testid={`${label.toLowerCase()}-filter-menu`}>
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
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => toggle(option.value)}
            onSelect={(e) => e.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
