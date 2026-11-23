import { MENU_LIST } from "@/lib/menu-list";
import type { IconCmp } from "@/lib/file-type-look";
import type { VenueDescriptor } from "@/hooks/use-venues";

export type PaletteNavAction = {
  id: string;
  label: string;
  href: string;
  icon: IconCmp;
  requiresAuth?: boolean;
};

export type PaletteVenueAction = {
  id: string;
  label: string;
  venueId: string;
};

// Flattens the sidebar's MENU_LIST into a single "go to page" action list —
// same source of truth the sidebar itself renders, so the palette never
// drifts out of sync with what pages actually exist.
export function buildNavActions(): PaletteNavAction[] {
  const actions: PaletteNavAction[] = [];
  for (const group of MENU_LIST) {
    for (const item of group.menus) {
      actions.push({
        id: `nav:${item.href}`,
        label: item.label,
        href: item.href,
        icon: item.icon,
        requiresAuth: item.requiresAuth,
      });
      for (const child of item.children ?? []) {
        actions.push({
          id: `nav:${child.href}`,
          label: child.label,
          href: child.href,
          icon: child.icon,
          requiresAuth: child.requiresAuth,
        });
      }
    }
  }
  return actions;
}

export function buildSwitchVenueActions(venues: VenueDescriptor[]): PaletteVenueAction[] {
  return venues.map((venue) => ({
    id: `switch-venue:${venue.venueId}`,
    label: venue.metadata.name ?? venue.venueId,
    venueId: venue.venueId,
  }));
}
