"use client";

import Link from "next/link";
import type { Venue } from "@covia/covia-sdk";
import { ExternalLink, Scale } from "lucide-react";
import { AdaptiveRiskAddresses } from "./fixtures";

// The policy that refused the invocation is not hidden inside the runtime:
// it is an ordinary operation with its own record on the venue. Link to both
// the gate and the content-addressed policy it runs, so a viewer can read the
// rule that stopped the write.
//
// The operations route takes a namespace-explicit address as path segments
// (`w/ops/…`, `a/<hash>`), so addresses are passed through unencoded per
// segment — see venues/[slug]/operations/[...id].
export function PolicyLinks({
  venue,
  addresses,
}: {
  venue: Venue | null;
  addresses: AdaptiveRiskAddresses;
}) {
  if (!venue) return null;
  const base = `/venues/${encodeURIComponent(venue.venueId)}/operations`;
  const opHref = (address: string) =>
    `${base}/${address.split("/").map(encodeURIComponent).join("/")}`;

  const policyAddress = addresses.policyAsset
    ? `a/${addresses.policyAsset}`
    : null;

  return (
    <div className="rounded border p-3 flex flex-col gap-1" data-testid="ar-policy-links">
      <p className="text-sm font-medium flex items-center gap-2">
        <Scale className="size-4 text-primary" aria-hidden="true" />
        The rule that refused it
      </p>
      <p className="text-xs text-muted-foreground">
        The gate is an ordinary operation, and the policy it applies is
        content-addressed — both have their own records on this venue.
      </p>
      <Link
        href={opHref(addresses.limitGate)}
        data-testid="ar-gate-link"
        className="text-xs font-mono underline underline-offset-2 inline-flex items-center gap-1"
      >
        {addresses.limitGate} <ExternalLink className="size-3" />
      </Link>
      {policyAddress && (
        <Link
          href={opHref(policyAddress)}
          data-testid="ar-policy-link"
          className="text-xs font-mono underline underline-offset-2 inline-flex items-center gap-1 break-all"
        >
          {policyAddress} <ExternalLink className="size-3" />
        </Link>
      )}
    </div>
  );
}
