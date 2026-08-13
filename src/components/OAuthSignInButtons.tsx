"use client";

import { FaGithub, FaGoogle, FaMicrosoft } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useOAuthSignInOptions } from "@/hooks/use-oauth-sign-in";
import { OAUTH_PROVIDER_LABELS, type OAuthProvider } from "@/lib/oauth";

const PROVIDER_ICONS = {
  google: FaGoogle,
  microsoft: FaMicrosoft,
  github: FaGithub,
} satisfies Record<OAuthProvider, React.ComponentType<{ className?: string }>>;

export function OAuthSignInButtons({ venueId }: { venueId?: string }) {
  const options = useOAuthSignInOptions(venueId);
  if (options.length === 0) return null;

  return (
    <div className="flex w-64 flex-col gap-2" aria-label="OAuth sign-in options">
      {options.map(({ provider, href }) => {
        const Icon = PROVIDER_ICONS[provider];
        return (
          <Button key={provider} asChild variant="outline" className="w-full justify-center gap-2">
            <a href={href}>
              <Icon className="size-4" />
              Continue with {OAUTH_PROVIDER_LABELS[provider]}
            </a>
          </Button>
        );
      })}
      <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
