"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Info, KeyRound, Link2, Cable, Loader2 } from "lucide-react";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { jobFailure, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import {
  A2A_NAME_PATTERN,
  IMPORT_AGENT_OP,
  ImportAgentResult,
  slugifyAgentName,
} from "@/lib/a2a";

const A2A_DOCS_URL = "https://docs.covia.ai/docs/user-guide/agents";
const NO_SECRET = "__none__";

interface ConnectAgentDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Connect an external A2A agent (BYOA): register a remote A2A endpoint as a
 * federated agent on this venue via `a2a:import-agent`, which stores an
 * immutable asset with a mutable `w/a2a/agents/<name>` binding. The agent stays
 * where it runs; this venue can then task it with `a2a:send`. Auth, when the
 * remote needs it, is a stored secret reference — credentials are never typed
 * here.
 */
export function ConnectAgentDialog({ trigger, open, onOpenChange }: ConnectAgentDialogProps) {
  const router = useRouter();
  const venue = useAuthenticatedVenue();

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [secretName, setSecretName] = useState(NO_SECRET);
  const [scheme, setScheme] = useState("");
  const [availableSecrets, setAvailableSecrets] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);

  const resolvedName = slugifyAgentName(name);
  const nameValid = A2A_NAME_PATTERN.test(resolvedName);

  // Load stored secret names so an authenticated endpoint can bind to one.
  useEffect(() => {
    if (!isOpen || !venue) return;
    let active = true;
    venue.secrets
      .list()
      .then((secrets: string[]) => { if (active) setAvailableSecrets(secrets); })
      .catch(() => { if (active) setAvailableSecrets([]); });
    return () => { active = false; };
  }, [isOpen, venue]);

  const reset = () => {
    setName("");
    setUrl("");
    setNeedsAuth(false);
    setSecretName(NO_SECRET);
    setScheme("");
  };

  const handleConnect = async () => {
    if (!venue) {
      notifyWarning("Please connect to a venue first");
      return;
    }
    if (!nameValid) {
      notifyWarning("Enter a name using lowercase letters, numbers, and hyphens");
      return;
    }
    if (!url.trim()) {
      notifyWarning("Enter the agent's endpoint URL");
      return;
    }
    if (needsAuth && secretName === NO_SECRET) {
      notifyWarning("Pick a stored secret, or add one in Secrets");
      return;
    }

    setConnecting(true);
    try {
      const auth = needsAuth
        ? { secret: `s/${secretName}`, ...(scheme.trim() && { scheme: scheme.trim() }) }
        : undefined;

      await venue.operations.run<ImportAgentResult>(IMPORT_AGENT_OP, {
        name: resolvedName,
        url: url.trim(),
        ...(auth && { auth }),
      });

      notifySuccess(`Connected ${resolvedName}`, {
        description: "The agent is registered on this venue. Send it a task to try it.",
      });
      reset();
      setOpen(false);
      router.push(`/agents/connected?agent=${encodeURIComponent(resolvedName)}`);
    } catch (err) {
      const { reason, jobHref } = jobFailure(err, venue.venueId);
      notifyError("Unable to connect agent", reason, venue.baseUrl, jobHref);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="border-b p-6">
          <DialogTitle className="flex items-center gap-2">
            <Cable size={18} className="text-primary" /> Connect an agent
          </DialogTitle>
          <DialogDescription>
            Register a remote A2A agent on this venue and task it from here — it keeps running
            wherever it lives.{" "}
            <a
              href={A2A_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              How connecting works <ExternalLink size={12} />
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto p-6">
          <div className="flex gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
            <Info size={15} className="mt-0.5 shrink-0 text-primary" />
            <p>
              Connecting registers the agent as{" "}
              <span className="font-mono">w/a2a/agents/&lt;name&gt;</span> and lets this venue send
              it tasks over A2A. It is <span className="font-medium text-foreground">not</span> ported
              or copied — to rebuild an agent natively instead, use{" "}
              <span className="font-medium text-foreground">Port an agent</span>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="connect-name">Name</Label>
            <Input
              id="connect-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="support-bot"
              data-testid="connect-agent-name"
            />
            {resolvedName && (
              <p className="text-xs text-muted-foreground">
                Registered at <span className="font-mono">w/a2a/agents/{resolvedName}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="connect-url">Endpoint URL</Label>
            <div className="flex items-center gap-2 rounded-md border px-3 focus-within:ring-1 focus-within:ring-ring">
              <Link2 size={15} className="shrink-0 text-muted-foreground" />
              <Input
                id="connect-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://agent.example.com"
                className="border-0 px-0 focus-visible:ring-0"
                data-testid="connect-agent-url"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The base URL of a standard A2A agent. Covia reads its agent card from{" "}
              <span className="font-mono">/.well-known/agent-card.json</span>.
            </p>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={needsAuth}
                onChange={(e) => setNeedsAuth(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
                data-testid="connect-agent-needs-auth"
              />
              <KeyRound size={14} className="text-muted-foreground" /> This agent needs authentication
            </label>
            {needsAuth && (
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="connect-secret">Stored secret</Label>
                  <Select value={secretName} onValueChange={setSecretName}>
                    <SelectTrigger id="connect-secret" data-testid="connect-agent-secret">
                      <SelectValue placeholder="Choose a secret" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SECRET}>No secret selected</SelectItem>
                      {availableSecrets.map((s) => (
                        <SelectItem key={s} value={s}>
                          s/{s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Covia sends this secret as the credential. Add keys on the{" "}
                    <a href="/secrets" className="font-medium text-primary hover:underline">
                      Secrets
                    </a>{" "}
                    page — they are never typed here.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connect-scheme">
                    Scheme <span className="font-normal text-muted-foreground">optional</span>
                  </Label>
                  <Input
                    id="connect-scheme"
                    value={scheme}
                    onChange={(e) => setScheme(e.target.value)}
                    placeholder="e.g. the card's security scheme name, or leave blank for Bearer"
                    data-testid="connect-agent-scheme"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t p-6">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={connecting}>
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={connecting || !nameValid || !url.trim()}
            className="gap-2"
            data-testid="connect-agent-submit"
          >
            {connecting ? <Loader2 size={14} className="animate-spin" /> : <Cable size={14} />}
            Connect agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
