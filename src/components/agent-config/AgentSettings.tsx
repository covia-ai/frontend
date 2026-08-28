"use client";

import { useEffect, useRef, useState } from "react";
import { AgentStatus } from "@covia/covia-sdk";
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, Save, Wrench } from "lucide-react";
import type { AgentDetail } from "@/config/types";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import {
  AgentJsonConfigField,
  AgentRuntimeFields,
  AgentSystemPromptField,
} from "@/components/agent-config/AgentConfigEditor";
import { ToolSkillPicker } from "@/components/agent-config/ToolSkillPicker";
import { AgentCapsEditor } from "@/components/agent-config/AgentCapsEditor";
import { ConfigFields } from "@/components/agent-explorer/ConfigFields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withToolToggled, type CatalogOp } from "@/lib/operations-catalog";
import { withSkillToggled, type SkillSummary } from "@/lib/skills";
import { isMemoryContextEntry, withMemoryContextToggled } from "@/lib/agent-context";
import {
  agentConfigUpdatePatch,
  configFromAgentSettingsDraft,
  createAgentSettingsDraft,
  type AgentConfigSaveOutcome,
  type AgentSettingsDraft,
} from "@/lib/agent-settings";

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

type AgentSettingsProps = {
  agent: AgentDetail;
  onBack: () => void;
  onSave: (config: Record<string, unknown>) => Promise<AgentConfigSaveOutcome>;
};

export function AgentSettings({ agent, onBack, onSave }: AgentSettingsProps) {
  const venue = useAuthenticatedVenue();
  const initialConfig = useRef<Record<string, unknown>>(agent.config ?? {});
  const [draft, setDraft] = useState(() =>
    createAgentSettingsDraft(initialConfig.current),
  );
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [capabilitySaving, setCapabilitySaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!venue) return;
    void venue.secrets.list()
      .then((keys: string[]) => {
        if (active) setAvailableKeys(keys);
      })
      .catch(() => {
        if (active) setAvailableKeys([]);
      });
    return () => {
      active = false;
    };
  }, [venue]);

  const setField = <K extends keyof AgentSettingsDraft>(
    key: K,
    value: AgentSettingsDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const result = configFromAgentSettingsDraft(draft, initialConfig.current);
  const patch = result.config
    ? agentConfigUpdatePatch(initialConfig.current, result.config)
    : {};
  const dirty = Object.keys(patch).length > 0;
  const running = agent.status === AgentStatus.RUNNING;
  const unavailableTools = Array.isArray(agent.unavailableTools)
    ? agent.unavailableTools
    : [];

  const reset = () => setDraft(createAgentSettingsDraft(initialConfig.current));

  // Picker toggles bypass the draft/JSON save path entirely: each is a narrow
  // { tools } or { skills } patch computed from the last-saved config, sent
  // straight through the same onSave (agent:update) round trip, so it can't
  // race with an unrelated in-progress Advanced-JSON edit. On success both
  // the saved baseline and the JSON field are refreshed so the two views of
  // tools/skills never visibly disagree.
  const attachedTools = stringArray(initialConfig.current.tools);
  const attachedSkills = stringArray(initialConfig.current.skills);
  const attachedContext = Array.isArray(initialConfig.current.context)
    ? initialConfig.current.context
    : [];
  const hasMemoryContext = attachedContext.some(isMemoryContextEntry);

  const saveCapability = async (
    key: "tools" | "skills" | "context",
    nextValue: unknown[],
  ) => {
    setCapabilitySaving(true);
    try {
      const outcome = await onSave({ [key]: nextValue });
      if (outcome.status === "saved") {
        initialConfig.current = { ...initialConfig.current, [key]: nextValue };
        const jsonField =
          key === "tools" ? "toolsJson" : key === "skills" ? "skillsJson" : "contextJson";
        setField(jsonField, JSON.stringify(nextValue, null, 2));
      } else if (outcome.status === "conflict") {
        // The server config moved since this editor loaded — rebase the
        // whole draft onto the fresh truth rather than reapplying just this
        // one toggle against a config we now know is stale.
        initialConfig.current = outcome.freshConfig;
        setDraft(createAgentSettingsDraft(outcome.freshConfig));
      }
    } finally {
      setCapabilitySaving(false);
    }
  };

  const handleToggleTool = (op: CatalogOp, attached: boolean) => {
    void saveCapability("tools", withToolToggled(attachedTools, op, attached));
  };
  const handleToggleSkill = (skill: SkillSummary, attached: boolean) => {
    void saveCapability("skills", withSkillToggled(attachedSkills, skill, attached));
  };
  const handleToggleMemoryContext = (attached: boolean) => {
    void saveCapability("context", withMemoryContextToggled(attachedContext, attached));
  };

  const save = async () => {
    if (!result.config || !dirty) return;
    setSaving(true);
    try {
      const outcome = await onSave(patch);
      if (outcome.status === "saved") {
        initialConfig.current = result.config;
        setDraft(createAgentSettingsDraft(result.config));
      } else if (outcome.status === "conflict") {
        initialConfig.current = outcome.freshConfig;
        setDraft(createAgentSettingsDraft(outcome.freshConfig));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="agent-settings" className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start gap-3 border-b px-6 py-4">
        <Button variant="ghost" size="sm" className="mt-0.5 gap-2" onClick={onBack}>
          <ArrowLeft size={15} /> Chat
        </Button>
        <div>
          <h4 className="font-semibold">Agent settings</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Update how <span className="font-mono">{agent.agentId}</span> behaves without replacing its history.
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="min-h-0 flex-1 gap-0 overflow-hidden">
        <div className="border-b px-6 py-3">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <TabsContent value="general" className="m-0 grid gap-8 lg:grid-cols-2">
            <AgentSystemPromptField
              value={draft.systemPrompt}
              onChange={(value) => setField("systemPrompt", value)}
              className="h-80 min-h-80"
            />
            <div className="space-y-6">
              <div className="rounded-md border bg-muted/20 p-4">
                <p className="text-sm font-medium">Identity</p>
                <p className="mt-2 font-mono text-sm">{agent.agentId}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Agent IDs are permanent. Clone the agent to create a new identity.
                </p>
              </div>
              <AgentRuntimeFields
                providerId={draft.providerId}
                onProviderChange={(providerId) => {
                  setDraft((current) => ({
                    ...current,
                    providerId,
                    customProviderOperation: "",
                    model: "",
                    customModel: "",
                  }));
                }}
                customProviderOperation={draft.customProviderOperation}
                onCustomProviderOperationChange={(value) =>
                  setField("customProviderOperation", value)
                }
                allowVenueDefaultProvider
                model={draft.model}
                onModelChange={(value) => setField("model", value)}
                customModel={draft.customModel}
                onCustomModelChange={(value) => setField("customModel", value)}
                availableKeys={availableKeys}
              />
            </div>
          </TabsContent>

          <TabsContent value="capabilities" className="m-0 space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h5 className="font-semibold">Tools and authority</h5>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tool lists control what the model sees. Capabilities control what the agent is actually allowed to do.
                </p>
              </div>
              <ToolSkillPicker
                venue={venue}
                attachedTools={attachedTools}
                attachedSkills={attachedSkills}
                onToggleTool={handleToggleTool}
                onToggleSkill={handleToggleSkill}
                disabled={capabilitySaving}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2"
                    data-testid="open-tool-skill-picker"
                  >
                    {capabilitySaving ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
                    Browse &amp; attach
                  </Button>
                }
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <AgentJsonConfigField
                id="agent-tools-json"
                label="Tools"
                description="Operation paths or tool descriptors offered to the model. Saving replaces the complete array. Or use Browse & attach above."
                value={draft.toolsJson}
                onChange={(value) => setField("toolsJson", value)}
                placeholder={'[\n  "v/ops/covia/read"\n]'}
              />
              <AgentJsonConfigField
                id="agent-skills-json"
                label="Skills"
                description="Skill indexes available to the agent. Saving replaces the complete array. Or use Browse & attach above."
                value={draft.skillsJson}
                onChange={(value) => setField("skillsJson", value)}
                placeholder={'[\n  "w/skills"\n]'}
              />
              <AgentCapsEditor
                enabled={draft.capsEnabled}
                onEnabledChange={(next) => setField("capsEnabled", next)}
                caps={draft.caps}
                onCapsChange={(next) => setField("caps", next)}
              />
              <div className="rounded-md border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agent-default-tools"
                    checked={draft.defaultTools}
                    onCheckedChange={(checked) =>
                      setField("defaultTools", checked === true)
                    }
                  />
                  <div>
                    <Label htmlFor="agent-default-tools">Include platform default tools</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Adds the venue&apos;s standard tool set alongside the explicit list above.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-md border p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agent-inject-memory"
                    checked={hasMemoryContext}
                    disabled={capabilitySaving}
                    onCheckedChange={(checked) => handleToggleMemoryContext(checked === true)}
                  />
                  <div>
                    <Label htmlFor="agent-inject-memory">Inject user memory into context</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Renders your saved memory (Context page) into this agent&apos;s
                      system context every turn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="m-0 space-y-5">
            <div>
              <h5 className="font-semibold">Additional configuration</h5>
              <p className="mt-1 text-sm text-muted-foreground">
                Edit transition, context, loads, outputs, provider options, and other venue-supported fields.
              </p>
            </div>
            <AgentJsonConfigField
              id="agent-advanced-json"
              label="Configuration JSON"
              description="Use null to clear an optional value. Objects merge recursively; arrays are replaced."
              value={draft.advancedJson}
              onChange={(value) => setField("advancedJson", value)}
              placeholder={'{\n  "operation": "v/ops/llmagent/chat"\n}'}
              className="min-h-80"
            />
          </TabsContent>

          <TabsContent value="diagnostics" className="m-0 space-y-6">
            {agent.error && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Agent suspended with an error</AlertTitle>
                <AlertDescription>{agent.error}</AlertDescription>
              </Alert>
            )}
            {unavailableTools.length > 0 && (
              <Alert>
                <AlertTriangle />
                <AlertTitle>Unavailable configured tools</AlertTitle>
                <AlertDescription>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                    {JSON.stringify(unavailableTools, null, 2)}
                  </pre>
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Diagnostic label="Status" value={agent.status} />
              <Diagnostic label="Pending tasks" value={String(agent.tasks ?? 0)} />
              <Diagnostic label="Completed runs" value={String(agent.timelineLength ?? agent.timeline?.length ?? 0)} />
            </div>
            <div>
              <h5 className="mb-3 font-semibold">Canonical configuration</h5>
              {agent.config ? (
                <ConfigFields data={agent.config} />
              ) : (
                <p className="text-sm text-muted-foreground">No configuration returned by the venue.</p>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 border-t bg-muted/10 px-6 py-4">
        <div className="min-w-0 flex-1">
          {result.error ? (
            <p className="text-sm text-destructive">{result.error}</p>
          ) : running ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Saving will suspend the running agent, apply the change, and resume it.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Changes preserve sessions, timeline, tasks, and agent identity.
            </p>
          )}
        </div>
        <Button variant="outline" className="gap-2" onClick={reset} disabled={!dirty || saving}>
          <RotateCcw size={15} /> Reset
        </Button>
        <Button
          data-testid="save-agent-settings"
          className="gap-2"
          onClick={save}
          disabled={!dirty || !!result.error || saving}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : running ? "Suspend, save & resume" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Diagnostic({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
