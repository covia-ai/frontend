"use client";

import { useMemo } from "react";
import { didFromPublicKey } from "@covia/covia-sdk";
import { Identicon } from "@/components/Identicon";
import { isDidKey } from "@/lib/identicon";
import { abbreviateDid, cn, writeTextToClipboard } from "@/lib/utils";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type DidDisplayAction = { label: string; onSelect: () => void };

interface DidDisplayProps {
  /** A DID (did:key, did:web, …) or a raw 64-char hex public key. */
  value: string;
  /** Leading characters kept before the middle elision — the last 4 are always
   *  kept, since the tail is what humans compare. Pass "full" to not elide. */
  chars?: number | "full";
  identicon?: boolean;
  iconSize?: number;
  /** Extra menu entries appended after the built-in Copy. */
  actions?: DidDisplayAction[];
  className?: string;
}

const HEX_KEY = /^(0x)?[0-9a-fA-F]{64}$/;

// The identicon identity for a value: did:key as-is; a raw public key maps to
// its did:key so a key renders the SAME mark whether shown as DID or hex.
// Anything else (did:web, tokens) has no key bytes to draw from.
function identiconDidFor(value: string): string | null {
  if (isDidKey(value)) return value;
  if (HEX_KEY.test(value)) {
    try {
      const hex = value.replace(/^0x/, "");
      const bytes = Uint8Array.from(hex.match(/../g)!.map((pair) => parseInt(pair, 16)));
      return didFromPublicKey(bytes);
    } catch {
      return null;
    }
  }
  return null;
}

// The standard rendering for DIDs and public keys: Convex-standard identicon
// (7x7 — see lib/identicon.ts), monospace middle-elided text, full value on
// hover, and a click menu with Copy plus any caller-supplied actions.
export function DidDisplay({
  value,
  chars = 16,
  identicon = true,
  iconSize = 16,
  actions = [],
  className,
}: DidDisplayProps) {
  const iconDid = useMemo(
    () => (identicon ? identiconDidFor(value) : null),
    [identicon, value],
  );
  const full = chars === "full";
  const text = full ? value : abbreviateDid(value, chars);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-testid="did-display"
              data-value={value}
              className={cn(
                "inline-flex items-center gap-1.5 font-mono text-xs text-left min-w-0 rounded px-1 py-0.5 -mx-1 hover:bg-muted cursor-pointer",
                className,
              )}
            >
              {iconDid && <Identicon did={iconDid} size={iconSize} />}
              <span className={full ? "break-all" : "truncate"}>{text}</span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent className="max-w-96">
          <span className="font-mono text-xs break-all">{value}</span>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          data-testid="did-copy"
          onSelect={() => {
            void writeTextToClipboard(value)
              .then(() => notifySuccess("Copied to clipboard", { description: abbreviateDid(value) }))
              .catch((error: unknown) => notifyError("Unable to copy identifier", error));
          }}
        >
          Copy
        </DropdownMenuItem>
        {actions.map((action) => (
          <DropdownMenuItem key={action.label} onSelect={action.onSelect}>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
