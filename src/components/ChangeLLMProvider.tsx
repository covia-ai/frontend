
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LLM_PROVIDERS } from "@/config/llm-providers";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";


export function ChangeLLMProvider(props:any) {
    const [open, setOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState('anthropic');
    const [currentProvider, setCurrentProvider] = useState('anthropic');
    const [loading, setLoading] = useState(false);
    const [fetchingInfo, setFetchingInfo] = useState(false);
    const venue = useAuthenticatedVenue();

    useEffect(() => {
      if (!open || !venue || !props.agentId) return;
      setFetchingInfo(true);
      venue.agents.info(props.agentId).then((info) => {
        const llmOp = info.config?.llmOperation;
        const key = Object.entries(LLM_PROVIDERS).find(([, p]) => p.operation === llmOp)?.[0] ?? 'anthropic';
        setCurrentProvider(key);
        setSelectedProvider(key);
      }).catch(() => {
        // silently keep defaults
      }).finally(() => {
        setFetchingInfo(false);
      });
    }, [open, venue, props.agentId]);

    async function handleChange() {
      if (!venue || !props.agentId || selectedProvider === currentProvider) return;
      const provider = LLM_PROVIDERS[selectedProvider];
      setLoading(true);
      try {
        await venue.agents.update({
          agentId: props.agentId,
          config: { llmOperation: provider.operation },
        });
        toast(`Provider changed to ${provider.label}`);
        setCurrentProvider(selectedProvider);
        setOpen(false);
      } catch {
        toast("Failed to change provider. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button aria-label="change llm" role="button">Change Provider</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl">Change LLM Provider</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="flex flex-row gap-2 text-yellow-800 text-sm">
                {fetchingInfo
                  ? <span className="italic text-muted-foreground">Loading current provider…</span>
                  : <>Currently using: <span className="font-semibold">{LLM_PROVIDERS[currentProvider]?.label ?? currentProvider}</span></>
                }
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label className="font-thin">Select New Provider:</Label>
              <RadioGroup value={selectedProvider} onValueChange={setSelectedProvider} disabled={fetchingInfo || loading}>
                {Object.entries(LLM_PROVIDERS).map(([id, provider]) => (
                  <div key={id} className="flex items-center space-x-2">
                    <RadioGroupItem value={id} id={`llm-${id}`} />
                    <Label htmlFor={`llm-${id}`} className="font-normal cursor-pointer">
                      {provider.label}{id === currentProvider ? " (Current)" : ""}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800 text-sm">
                <span className="font-thin">Note: The next agent request will use the new provider.</span>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 pt-2">
              <Button
                aria-label="change provider"
                role="button"
                disabled={currentProvider === selectedProvider || loading || fetchingInfo}
                className="flex-1"
                onClick={handleChange}
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                {loading ? "Changing…" : "Change Provider"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
}
