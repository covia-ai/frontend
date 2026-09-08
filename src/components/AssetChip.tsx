"use client";

import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { abbreviateDid, cn, writeTextToClipboard } from "@/lib/utils";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AssetChipProps {
  /** Content-addressed asset id — a hash, not a public key, so no identicon. */
  assetId: string;
  venueId: string;
  /** Leading characters kept before the middle elision — see abbreviateDid. */
  chars?: number | "full";
  className?: string;
}

// Same truncation/copy/tooltip convention as DidDisplay.tsx, minus the
// identicon (a content hash carries no key bytes to draw one from) and with
// an "Open asset" link in place of DidDisplay's caller-supplied actions.
export function AssetChip({ assetId, venueId, chars = 16, className }: AssetChipProps) {
  const full = chars === "full";
  const text = full ? assetId : abbreviateDid(assetId, chars);
  const href = `/venues/${encodeURIComponent(venueId)}/assets/${encodeURIComponent(assetId)}`;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-testid="asset-chip"
              data-value={assetId}
              className={cn(
                "inline-flex items-center gap-1.5 font-mono text-xs text-left min-w-0 rounded-full border px-2 py-0.5 hover:bg-muted cursor-pointer",
                className,
              )}
            >
              <span className={full ? "break-all" : "truncate"}>{text}</span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent className="max-w-96">
          <span className="font-mono text-xs break-all">{assetId}</span>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild data-testid="asset-chip-open">
          <Link href={href}>
            <ExternalLink size={13} className="mr-1" /> Open asset
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="asset-chip-copy"
          onSelect={() => {
            void writeTextToClipboard(assetId)
              .then(() => notifySuccess("Copied to clipboard", { description: abbreviateDid(assetId) }))
              .catch((error: unknown) => notifyError("Unable to copy asset id", error));
          }}
        >
          <Copy size={13} className="mr-1" /> Copy
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
