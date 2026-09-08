"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenCheck,
  Database,
  Inbox,
  MapPinned,
  MessageSquareText,
  PlayCircle,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useVenues } from "@/hooks/use-venues";
import { useAuthStore, useIsAuthenticated } from "@/hooks/use-auth";
import { useCommandPalette, type PaletteRecentItem } from "@/hooks/use-command-palette";
import { useCommandPaletteData } from "@/hooks/use-command-palette-data";
import { buildNavActions, buildSwitchVenueActions } from "@/lib/command-palette-actions";
import type { PaletteItem, PaletteItemKind, PaletteQuickAction } from "@/lib/command-palette";

const KIND_ICONS: Record<PaletteItemKind, LucideIcon> = {
  asset: Database,
  operation: PlayCircle,
  skill: BookOpenCheck,
  job: ScrollText,
  hitl: Inbox,
  agent: MessageSquareText,
};

const KIND_LABELS: Record<PaletteItemKind, string> = {
  asset: "Assets",
  operation: "Operations",
  skill: "Skills",
  job: "Jobs",
  hitl: "Approvals",
  agent: "Agents",
};

const KIND_ORDER: PaletteItemKind[] = ["agent", "hitl", "operation", "job", "asset", "skill"];

export function CommandPalette() {
  const router = useRouter();
  const open = useCommandPalette((s) => s.open);
  const setOpen = useCommandPalette((s) => s.setOpen);
  const toggle = useCommandPalette((s) => s.toggle);
  const recentItems = useCommandPalette((s) => s.recentItems);
  const pushRecent = useCommandPalette((s) => s.pushRecent);

  const venues = useVenues((s) => s.venues);
  const selectVenue = useVenues((s) => s.selectVenue);
  const isAuthenticated = useIsAuthenticated();
  const authMap = useAuthStore((s) => s.authMap);

  const { items, refreshing, unreachableVenueIds } = useCommandPaletteData(open);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const navActions = useMemo(() => buildNavActions(), []);
  const switchVenueActions = useMemo(() => buildSwitchVenueActions(venues), [venues]);
  const venueNameFor = useMemo(() => {
    const byId = new Map(venues.map((v) => [v.venueId, v.metadata.name ?? v.venueId]));
    return (venueId: string) => byId.get(venueId) ?? venueId;
  }, [venues]);

  function close() {
    setOpen(false);
  }

  function goTo(href: string) {
    router.push(href);
    close();
  }

  function handleSelectItem(item: PaletteItem) {
    if (item.requiresVenueSwitch) selectVenue(item.venueId);
    pushRecent(toRecent(item));
    goTo(item.href);
  }

  function handleQuickAction(item: PaletteItem, action: PaletteQuickAction) {
    if (action.requiresVenueSwitch) selectVenue(item.venueId);
    pushRecent({
      kind: item.kind,
      id: `${item.id}:${action.id}`,
      title: action.label,
      venueId: item.venueId,
      href: action.href,
      requiresVenueSwitch: action.requiresVenueSwitch,
    });
    goTo(action.href);
  }

  function handleSelectRecent(recent: PaletteRecentItem) {
    if (recent.requiresVenueSwitch) selectVenue(recent.venueId);
    goTo(recent.href);
  }

  function handleSwitchVenue(venueId: string) {
    selectVenue(venueId);
    close();
  }

  const showRecent = query.trim() === "" && recentItems.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search assets, operations, jobs, agents, skills, and approvals across every connected venue, or run an action."
    >
      <CommandInput
        placeholder="Search everything, or run a command..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{refreshing ? "Searching…" : "No results found."}</CommandEmpty>

        {showRecent && (
          <CommandGroup heading="Recent">
            {recentItems.map((item) => {
              const Icon = KIND_ICONS[item.kind];
              return (
                <CommandItem
                  key={`recent:${item.kind}:${item.venueId}:${item.id}`}
                  value={`recent ${item.title} ${item.id}`}
                  onSelect={() => handleSelectRecent(item)}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{item.title}</span>
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    {venueNameFor(item.venueId)}
                  </Badge>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Actions">
          {navActions
            .filter((action) => !action.requiresAuth || isAuthenticated)
            .map((action) => (
              <CommandItem
                key={action.id}
                value={`go to ${action.label}`}
                onSelect={() => goTo(action.href)}
              >
                <action.icon className="size-4" />
                <span>Go to {action.label}</span>
              </CommandItem>
            ))}
          {switchVenueActions.map((action) => (
            <CommandItem
              key={action.id}
              value={`switch venue ${action.label}`}
              onSelect={() => handleSwitchVenue(action.venueId)}
            >
              <MapPinned className="size-4" />
              <span>Switch to {action.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {KIND_ORDER.map((kind) => {
          const kindItems = items.filter((item) => item.kind === kind);
          if (kindItems.length === 0) return null;
          const Icon = KIND_ICONS[kind];
          return (
            <CommandGroup key={kind} heading={KIND_LABELS[kind]}>
              {kindItems.map((item) => (
                <div key={`${item.kind}:${item.venueId}:${item.id}`}>
                  <CommandItem
                    value={`${item.title} ${item.id} ${item.venueName}`}
                    onSelect={() => handleSelectItem(item)}
                  >
                    <Icon className="size-4" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-auto shrink-0">
                      {item.venueName}
                    </Badge>
                  </CommandItem>
                  {item.quickActions
                    ?.filter((action) => !action.requiresAuth || !!authMap[item.venueId])
                    .map((action) => (
                      <CommandItem
                        key={action.id + item.id}
                        value={`${action.label} ${item.venueName}`}
                        onSelect={() => handleQuickAction(item, action)}
                      >
                        <Icon className="size-4 opacity-50" />
                        <span className="truncate text-muted-foreground">{action.label}</span>
                        <Badge variant="secondary" className="ml-auto shrink-0">
                          {item.venueName}
                        </Badge>
                      </CommandItem>
                    ))}
                </div>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
      {unreachableVenueIds.length > 0 && (
        <div className="text-muted-foreground border-t px-3 py-2 text-xs">
          {unreachableVenueIds.length} venue{unreachableVenueIds.length > 1 ? "s" : ""} unreachable
          — showing results from the rest.
        </div>
      )}
    </CommandDialog>
  );
}

function toRecent(item: PaletteItem): PaletteRecentItem {
  return {
    kind: item.kind,
    id: item.id,
    title: item.title,
    venueId: item.venueId,
    href: item.href,
    requiresVenueSwitch: item.requiresVenueSwitch,
  };
}
