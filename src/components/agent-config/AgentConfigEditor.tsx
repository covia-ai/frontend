"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { LLM_PROVIDERS } from "@/config/llm-providers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, SUGGESTION_PLACEHOLDER_CLASS } from "@/lib/utils";

export const CUSTOM_MODEL_OPTION = "__custom__";
export const DEFAULT_MODEL_OPTION = "__default__";

export type ModelSelection = {
  model: string;
  customModel: string;
};

export function modelSelectionFromId(
  providerId: string,
  modelId: string,
): ModelSelection {
  if (!modelId) return { model: "", customModel: "" };
  const knownModel = LLM_PROVIDERS[providerId]?.models?.includes(modelId);
  return knownModel
    ? { model: modelId, customModel: "" }
    : { model: CUSTOM_MODEL_OPTION, customModel: modelId };
}

export function resolvedModelId(model: string, customModel: string): string {
  if (model === CUSTOM_MODEL_OPTION) return customModel.trim();
  if (model === DEFAULT_MODEL_OPTION) return "";
  return model;
}

export function isAgentProviderReady(
  providerId: string,
  availableKeys: string[],
): boolean {
  const provider = LLM_PROVIDERS[providerId];
  if (!provider) return false;
  return !provider.requiresKey || availableKeys.includes(provider.secretKey);
}

type AgentSystemPromptFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function AgentSystemPromptField({
  value,
  onChange,
  className,
}: AgentSystemPromptFieldProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <Label htmlFor="agent-system-prompt">System prompt</Label>
      <Textarea
        id="agent-system-prompt"
        data-testid="agent-system-prompt"
        placeholder="Describe the agent's role, behaviour, and boundaries."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-72 min-h-72 resize-none overflow-y-auto text-sm",
          SUGGESTION_PLACEHOLDER_CLASS,
          className,
        )}
      />
      <p className="text-sm text-muted-foreground">
        The instructions the agent follows in every conversation.
      </p>
    </div>
  );
}

type AgentRuntimeFieldsProps = {
  providerId: string;
  onProviderChange: (providerId: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  customModel: string;
  onCustomModelChange: (model: string) => void;
  availableKeys: string[];
  apiKey?: string;
  onApiKeyChange?: (apiKey: string) => void;
};

export function AgentRuntimeFields({
  providerId,
  onProviderChange,
  model,
  onModelChange,
  customModel,
  onCustomModelChange,
  availableKeys,
  apiKey = "",
  onApiKeyChange,
}: AgentRuntimeFieldsProps) {
  const provider = LLM_PROVIDERS[providerId];
  const providerReady = isAgentProviderReady(providerId, availableKeys);

  return (
    <>
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select value={providerId} onValueChange={onProviderChange}>
          <SelectTrigger data-testid="agent-provider-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LLM_PROVIDERS).map(([id, option]) => (
              <SelectItem key={id} value={id}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!providerReady && provider?.requiresKey && (
          <div className="space-y-2">
            <p className="flex items-center gap-1 text-sm text-amber-500">
              <AlertTriangle size={14} />
              No {provider.label} key. {onApiKeyChange ? "Paste one below or " : ""}
              <Link href="/secrets" className="underline">add it in Secrets</Link>.
            </p>
            {onApiKeyChange && (
              <Input
                type="password"
                data-testid="inline-api-key"
                className={SUGGESTION_PLACEHOLDER_CLASS}
                placeholder={provider.secretKey}
                value={apiKey}
                onChange={(event) => onApiKeyChange(event.target.value)}
                autoComplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                spellCheck={false}
              />
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <Select
          value={model || DEFAULT_MODEL_OPTION}
          onValueChange={(value) =>
            onModelChange(value === DEFAULT_MODEL_OPTION ? "" : value)
          }
        >
          <SelectTrigger data-testid="model-select"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_MODEL_OPTION}>Venue default</SelectItem>
            {(provider?.models ?? []).map((modelId) => (
              <SelectItem key={modelId} value={modelId}>{modelId}</SelectItem>
            ))}
            <SelectItem value={CUSTOM_MODEL_OPTION}>Custom…</SelectItem>
          </SelectContent>
        </Select>
        {model === CUSTOM_MODEL_OPTION && (
          <Input
            data-testid="model-custom-input"
            className={SUGGESTION_PLACEHOLDER_CLASS}
            placeholder="e.g. claude-opus-4-8"
            value={customModel}
            onChange={(event) => onCustomModelChange(event.target.value)}
          />
        )}
        <p className="text-sm text-muted-foreground">
          Leave this on Venue default unless you need a specific model.
        </p>
      </div>
    </>
  );
}
