"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Venue } from "@covia/covia-sdk";
import { Plug, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CONNECTIONS, type ConnectionService } from "@/config/connections";
import { useToolSkillPickerData } from "@/hooks/use-tool-skill-picker-data";
import type { SkillSummary } from "@/lib/skills";

type Props = {
  venue: Venue | null | undefined;
  /** The agent's currently-attached skill identifiers (aliases). */
  attachedSkills: string[];
  onToggleSkill: (skill: SkillSummary, attached: boolean) => void;
};

/** Canonical asset path the venue installs a connection skill at. */
const skillPath = (id: string) => `v/skills/connections/${id}`;

/**
 * "Which of your connected services may this agent use." Grants a connection by
 * attaching its `connections/<id>` skill to the agent, using the same skill
 * machinery as the tool/skill picker. Only services you've connected (their
 * secret is present) appear here.
 */
export function AgentConnectionsPicker({ venue, attachedSkills, onToggleSkill }: Props) {
  const { skills } = useToolSkillPickerData(venue, true);
  const [connectedSecrets, setConnectedSecrets] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!venue) return;
    let cancelled = false;
    venue.secrets
      .list()
      .then((names) => {
        if (!cancelled) setConnectedSecrets(new Set(Array.isArray(names) ? names : []));
      })
      .catch(() => {
        if (!cancelled) setConnectedSecrets(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [venue]);

  /** Real SkillSummary if the venue has it installed, else a synthetic one that
   *  still references the canonical path (works before the skill PR merges). */
  const summaryFor = useCallback(
    (service: ConnectionService): SkillSummary => {
      const path = skillPath(service.id);
      const found = skills.find(
        (s) => s.path === path || s.path.endsWith(`connections/${service.id}`),
      );
      return (
        found ?? {
          key: service.id,
          name: service.id,
          description: service.blurb,
          path,
          source: "venue",
          body: null,
          tools: ["v/ops/http/get", "v/ops/http/post", "v/ops/jvm/url-encode"],
          reference: null,
          hasContent: false,
        }
      );
    },
    [skills],
  );

  const isAttached = useCallback(
    (service: ConnectionService) => {
      const s = summaryFor(service);
      const aliases = [s.path, s.reference, s.name, s.key].filter(Boolean) as string[];
      return aliases.some((a) => attachedSkills.includes(a));
    },
    [attachedSkills, summaryFor],
  );

  const connectedServices = useMemo(
    () => CONNECTIONS.filter((s) => connectedSecrets.has(s.secretName)),
    [connectedSecrets],
  );

  return (
    <div className="space-y-2 rounded-md border p-3" data-testid="agent-connections-picker">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Plug size={14} /> Connections
        </p>
        <Link
          href="/connections"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Manage <ExternalLink size={11} />
        </Link>
      </div>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : connectedServices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No services connected yet.{" "}
          <Link href="/connections" className="font-medium text-primary hover:underline">
            Connect one
          </Link>{" "}
          to let this agent use it.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Grant this agent access to services you&apos;ve connected.
          </p>
          <div className="space-y-1.5 pt-1">
            {connectedServices.map((service) => {
              const attached = isAttached(service);
              return (
                <label
                  key={service.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-muted/60"
                >
                  <Checkbox
                    checked={attached}
                    onCheckedChange={(next) =>
                      onToggleSkill(summaryFor(service), next === true)
                    }
                  />
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: service.color }}
                    aria-hidden
                  >
                    {service.initials}
                  </span>
                  <span className="text-sm font-medium">{service.name}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">
                    {service.blurb}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
