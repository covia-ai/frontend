"use client";

import { KeyRound } from "lucide-react";
import { ConnectionLogo } from "@/components/ConnectionLogo";
import type { CredentialUse } from "@/lib/credential-refs";
import { cn } from "@/lib/utils";

// The connections a call used, one badge each: the service's logo and name,
// with the exact references on hover. A reference that matches no known
// connection shows as itself. Never shows a value; inputs only hold references.
export function CredentialBadges({
  uses,
  size = "md",
  className,
}: {
  uses: CredentialUse[];
  size?: "sm" | "md";
  className?: string;
}) {
  if (uses.length === 0) return null;
  const small = size === "sm";
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)} data-testid="credential-badges">
      {uses.map((use) => {
        const refs = use.refs.map((r) => r.ref).join(", ");
        const oauth = use.refs.every((r) => r.kind === "oauth");
        return (
          <span
            key={use.connection?.id ?? use.label}
            title={`Credential: ${refs}`}
            data-testid="credential-badge"
            className={cn(
              "inline-flex items-center gap-1 rounded-md border bg-muted/40 font-medium text-foreground",
              small ? "px-1 py-0 text-[11px]" : "px-1.5 py-0.5 text-xs",
            )}
          >
            {use.connection ? (
              <ConnectionLogo service={use.connection} size={small ? 12 : 16} />
            ) : (
              <KeyRound size={small ? 11 : 13} className="text-muted-foreground" aria-hidden />
            )}
            <span className={cn(!use.connection && "font-mono")}>{use.label}</span>
            {oauth && <span className="text-muted-foreground">· OAuth</span>}
          </span>
        );
      })}
    </span>
  );
}
