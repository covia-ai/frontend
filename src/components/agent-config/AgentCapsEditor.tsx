"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TONE_STYLES } from "@/lib/status";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  COMMON_ABILITIES,
  CUSTOM_ABILITY_OPTION,
  emptyCap,
  type AgentCap,
  type AgentCapsMode,
} from "@/lib/agent-caps";

interface AgentCapsEditorProps {
  /**
   * The agent's authority: its controller's whole authority, or the listed
   * capabilities. null when neither is chosen yet because the config takes its
   * caps from a referenced layer this form cannot read.
   */
  mode: AgentCapsMode | null;
  onModeChange: (mode: AgentCapsMode) => void;
  caps: AgentCap[];
  onCapsChange: (caps: AgentCap[]) => void;
}

// Hard authorization scopes ({with, can} pairs) — shared by AddNewAgent
// (pre-creation staging) and AgentSettings' Capabilities tab (persisted via
// agent:update), see covia-ai/frontend#161. Purely presentational: caller
// owns the mode and the caps array. Both choices are explicit, because the
// venue gives an agent with no caps no authority at all (covia 0.11).
export function AgentCapsEditor({ mode, onModeChange, caps, onCapsChange }: AgentCapsEditorProps) {
  const restricted = mode === "restricted";
  return (
    <div data-testid="caps-editor" className="space-y-3 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">Authority</p>
        <p className="mt-1 text-sm text-muted-foreground">
          What the agent may do with its tools, out of what its controller may do.
        </p>
      </div>
      <RadioGroup
        value={mode ?? ""}
        onValueChange={(value) => {
          const next = value as AgentCapsMode;
          onModeChange(next);
          if (next === "restricted" && caps.length === 0) onCapsChange([emptyCap()]);
        }}
        className="gap-2"
      >
        <div className="flex items-start gap-3">
          <RadioGroupItem id="agent-caps-unrestricted" value="unrestricted" className="mt-0.5" />
          <div>
            <Label htmlFor="agent-caps-unrestricted">Unrestricted</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything its controller may do.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <RadioGroupItem id="agent-caps-restricted" value="restricted" className="mt-0.5" />
          <div>
            <Label htmlFor="agent-caps-restricted">Only these capabilities</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Specific (resource, ability) pairs. With none, its tool calls are refused.
            </p>
          </div>
        </div>
      </RadioGroup>
      {mode === null && (
        <p data-testid="caps-inherited" className="text-sm text-muted-foreground">
          Set by the template this agent is built from. Choose one to override it.
        </p>
      )}

      {restricted && (
        <div className="space-y-2">
          {caps.length === 0 && (
            <p className={`flex items-center gap-1 text-sm ${TONE_STYLES.attention.text}`}>
              <AlertTriangle size={14} />
              No capabilities added — every tool call will be refused.
            </p>
          )}
          {caps.map((cap, index) => {
            const isCustom = !COMMON_ABILITIES.some((a) => a.value === cap.can);
            const updateCap = (patch: Partial<AgentCap>) => {
              const next = [...caps];
              next[index] = { ...next[index], ...patch };
              onCapsChange(next);
            };
            return (
              <div key={index} className="flex items-center gap-2">
                <Input
                  data-testid={`cap-with-${index}`}
                  placeholder="Resource (path or DID), e.g. w/"
                  value={cap.with}
                  onChange={(e) => updateCap({ with: e.target.value })}
                  className="flex-1"
                />
                <Select
                  value={isCustom ? CUSTOM_ABILITY_OPTION : cap.can}
                  onValueChange={(value) =>
                    updateCap({ can: value === CUSTOM_ABILITY_OPTION ? "" : value })
                  }
                >
                  <SelectTrigger data-testid={`cap-can-${index}`} className="w-56 shrink-0">
                    <SelectValue placeholder="Ability" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ABILITIES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_ABILITY_OPTION}>Custom…</SelectItem>
                  </SelectContent>
                </Select>
                {isCustom && (
                  <Input
                    data-testid={`cap-can-custom-${index}`}
                    placeholder="e.g. covia/read"
                    value={cap.can}
                    onChange={(e) => updateCap({ can: e.target.value })}
                    className="w-40 shrink-0"
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove capability ${index + 1}`}
                  onClick={() => onCapsChange(caps.filter((_, i) => i !== index))}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => onCapsChange([...caps, emptyCap()])}
          >
            <Plus size={14} /> Add capability
          </Button>
        </div>
      )}
    </div>
  );
}
