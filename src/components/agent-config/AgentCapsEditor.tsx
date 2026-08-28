"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMMON_ABILITIES, CUSTOM_ABILITY_OPTION, emptyCap, type AgentCap } from "@/lib/agent-caps";

interface AgentCapsEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  caps: AgentCap[];
  onCapsChange: (caps: AgentCap[]) => void;
}

// Hard authorization scopes ({with, can} pairs) — shared by AddNewAgent
// (pre-creation staging) and AgentSettings' Capabilities tab (persisted via
// agent:update), see covia-ai/frontend#161. Purely presentational: caller
// owns the enabled flag and the caps array.
export function AgentCapsEditor({ enabled, onEnabledChange, caps, onCapsChange }: AgentCapsEditorProps) {
  return (
    <div data-testid="caps-editor" className="space-y-3 rounded-md border p-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id="agent-caps-enabled"
          checked={enabled}
          onCheckedChange={(checked) => {
            const next = checked === true;
            onEnabledChange(next);
            if (next && caps.length === 0) onCapsChange([emptyCap()]);
          }}
        />
        <div>
          <Label htmlFor="agent-caps-enabled">Capabilities (optional)</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Without this, the agent may use any tool it&apos;s given. Enable to
            restrict it to specific (resource, ability) pairs.
          </p>
        </div>
      </div>

      {enabled && (
        <div className="space-y-2">
          {caps.length === 0 && (
            <p className="flex items-center gap-1 text-sm text-amber-500">
              <AlertTriangle size={14} />
              No capabilities added — this denies every tool call.
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
