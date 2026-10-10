"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

export type ResolvedTheme = "light" | "dark";

// Hydration is a one-way transition, so there is nothing to subscribe to:
// useSyncExternalStore renders the server snapshot while hydrating and the
// client snapshot from then on.
const subscribeToNothing = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * The theme actually painted, for code that needs it as a value: a
 * third-party component's theme prop, or colours handed to a chart.
 *
 * Undefined on the server and while hydrating. The server can't know the
 * theme, and next-themes reads it from localStorage on the client's first
 * render, so using `useTheme()` there renders different markup on each side.
 * This hook keeps the first client render the same as the server's and
 * supplies the real theme straight after. It also never returns "system":
 * `resolvedTheme` is what that setting resolves to.
 *
 * Appearance alone never needs this. Use the `dark:` variant: the class
 * next-themes puts on <html> before first paint drives it, so the markup is
 * the same everywhere and CSS picks what shows.
 */
export function useResolvedTheme(): ResolvedTheme | undefined {
  const { resolvedTheme } = useTheme();
  const hydrated = useSyncExternalStore(subscribeToNothing, onClient, onServer);
  if (!hydrated) return undefined;
  return resolvedTheme === "dark" || resolvedTheme === "light" ? resolvedTheme : undefined;
}
