"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Venue } from "@covia/covia-sdk";
import { ExternalLink, Lock, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import { ChromeSignInButton } from "@/components/admin-panel/signin-button";
import { useVenueAccess } from "@/hooks/use-venue-access";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { useToolSkillPickerData } from "@/hooks/use-tool-skill-picker-data";
import { adapterOf, type CatalogOp } from "@/lib/operations-catalog";
import { agentUsesSkill, type SkillSummary } from "@/lib/skills";

type ToolSkillPickerProps = {
  venue: Venue | null;
  attachedTools: string[];
  attachedSkills: string[];
  onToggleTool: (op: CatalogOp, attached: boolean) => void;
  onToggleSkill: (skill: SkillSummary, attached: boolean) => void;
  trigger: React.ReactNode;
  /** Blocks further toggles while a caller's own save is in flight — a toggle
   * always sends the complete next array computed from the last-known
   * attached list, so two overlapping toggles would race and lose one. */
  disabled?: boolean;
};

// Shared by AddNewAgent (pre-creation: toggles stage local state) and
// AgentSettings' Capabilities tab (post-creation: toggles persist via
// agent:update immediately) — this component only knows "what's attached" +
// "toggle callback"; each caller decides what a toggle actually does.
export function ToolSkillPicker({
  venue,
  attachedTools,
  attachedSkills,
  onToggleTool,
  onToggleSkill,
  trigger,
  disabled = false,
}: ToolSkillPickerProps) {
  const [open, setOpen] = useState(false);
  const isAuthenticated = useIsAuthenticated();
  const access = useVenueAccess(venue?.baseUrl, venue?.venueId);
  const needsAuth =
    access.state === "signed-out" || access.state === "auth-rejected" || access.state === "auth-unverified";

  const { ops, skills, loading } = useToolSkillPickerData(venue, open && !needsAuth, isAuthenticated);

  const [toolSearch, setToolSearch] = useState("");
  const [toolAdapter, setToolAdapter] = useState("");
  const [skillSearch, setSkillSearch] = useState("");

  const adapters = useMemo(
    () => Array.from(new Set(ops.map((op) => adapterOf(op.path)))).sort(),
    [ops],
  );

  const filteredOps = useMemo(() => {
    const term = toolSearch.toLowerCase();
    return ops.filter((op) => {
      const matchSearch =
        !term ||
        op.path.toLowerCase().includes(term) ||
        (op.metadata?.name ?? "").toLowerCase().includes(term) ||
        (op.metadata?.description ?? "").toLowerCase().includes(term);
      const matchAdapter = !toolAdapter || adapterOf(op.path) === toolAdapter;
      return matchSearch && matchAdapter;
    });
  }, [ops, toolSearch, toolAdapter]);

  const groupedOps = useMemo(() => {
    const map = new Map<string, CatalogOp[]>();
    for (const op of filteredOps) {
      const adapter = adapterOf(op.path);
      if (!map.has(adapter)) map.set(adapter, []);
      map.get(adapter)!.push(op);
    }
    for (const list of map.values()) list.sort((a, b) => a.path.localeCompare(b.path));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredOps]);

  const filteredSkills = useMemo(() => {
    const term = skillSearch.toLowerCase();
    if (!term) return skills;
    return skills.filter((skill) =>
      `${skill.name} ${skill.description} ${skill.path}`.toLowerCase().includes(term),
    );
  }, [skills, skillSearch]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        className="flex flex-col gap-0 overflow-hidden sm:max-w-xl"
        data-testid="tool-skill-picker"
      >
        <SheetHeader>
          <SheetTitle>Tools &amp; skills</SheetTitle>
          <SheetDescription>
            Browse this venue&apos;s catalog and attach what the agent should use.
          </SheetDescription>
        </SheetHeader>

        {venue && needsAuth ? (
          <div
            className="mx-4 flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-8 text-center"
            data-testid="tool-skill-picker-auth-required"
          >
            <Lock size={32} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold">Sign in to browse and attach</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This venue doesn&apos;t allow anonymous reads. Sign in with an account this venue admits to browse its catalog.
              </p>
            </div>
            <ChromeSignInButton venueId={venue.venueId} />
          </div>
        ) : (
          <Tabs defaultValue="tools" className="flex min-h-0 flex-1 flex-col gap-0 px-4 pb-4">
            <TabsList>
              <TabsTrigger value="tools" data-testid="picker-tab-tools">
                Tools
                {attachedTools.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 px-1.5">{attachedTools.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="skills" data-testid="picker-tab-skills">
                Skills
                {attachedSkills.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 px-1.5">{attachedSkills.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tools" className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search tools…"
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={toolAdapter || "_all_"} onValueChange={(v) => setToolAdapter(v === "_all_" ? "" : v)}>
                  <SelectTrigger className="w-36 shrink-0">
                    <SelectValue placeholder="All adapters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all_">All adapters</SelectItem>
                    {adapters.map((a) => (
                      <SelectItem key={a} value={a} className="font-mono">{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner variant="ellipsis" className="text-primary" size={36} />
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <Accordion type="multiple" key={toolAdapter} defaultValue={toolAdapter ? [toolAdapter] : []} className="flex flex-col gap-2">
                    {groupedOps.map(([adapter, adapterOps]) => (
                      <AccordionItem key={adapter} value={adapter} className="rounded-lg border">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">{adapter}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {adapterOps.length} op{adapterOps.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-1 px-2 pb-2">
                          {adapterOps.map((op) => {
                            const checked = attachedTools.includes(op.path);
                            const name = op.metadata?.name ?? op.path.split("/").pop() ?? op.path;
                            return (
                              <label
                                key={op.path}
                                className="flex items-start gap-2 rounded-md p-2 hover:bg-muted/50"
                                data-testid="tool-picker-row"
                              >
                                <Checkbox
                                  checked={checked}
                                  disabled={disabled}
                                  onCheckedChange={(c) => onToggleTool(op, c === true)}
                                  aria-label={`Attach ${name}`}
                                  className="mt-0.5"
                                />
                                <div className="min-w-0">
                                  <p className="font-mono text-xs font-medium">{name}</p>
                                  {op.metadata?.description && (
                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                      {op.metadata.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  {groupedOps.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      {ops.length === 0 ? "No tools found in this venue's catalog." : "No tools match the current filter."}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="skills" className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search skills…"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner variant="ellipsis" className="text-primary" size={36} />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                  {filteredSkills.map((skill) => {
                    const checked = agentUsesSkill({ skills: attachedSkills }, skill);
                    return (
                      <div
                        key={skill.path}
                        className="flex items-start gap-2 rounded-md border p-2"
                        data-testid="skill-picker-row"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(c) => onToggleSkill(skill, c === true)}
                          aria-label={`Attach ${skill.name}`}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{skill.name}</p>
                            <Badge variant="outline" className="shrink-0 text-[10px] capitalize">{skill.source}</Badge>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{skill.description}</p>
                        </div>
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <Link href="/agents/skills" target="_blank" aria-label={`View ${skill.name} in the skills library`}>
                            <ExternalLink size={13} />
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                  {filteredSkills.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      {skills.length === 0 ? "No skills found in this venue." : "No skills match the current filter."}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
