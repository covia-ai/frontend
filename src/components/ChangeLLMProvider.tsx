
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "./ui/button";

import { Label } from "./ui/label";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from "./ui/checkbox";
import { LLM_PROVIDERS } from "@/config/llm-providers";


export function ChangeLLMProvider(props:any) {
    const [selectedProvider, setSelectedProvider] = useState('anthropic');
    const [currentProvider, setCurrentProvider] = useState('anthropic');

    return (
      <Dialog >
        <DialogTrigger asChild>
          <Button aria-label="change llm" role="button"> Change Provider</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl">Change LLM Provider</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Provider Alert */}
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="flex flex-row text-yellow-800 text-sm">
                Currently using: <span className="font-thin">{LLM_PROVIDERS[currentProvider]?.label ?? currentProvider}</span>
              </AlertDescription>
            </Alert>

            {/* Select New Provider */}
            <div className="space-y-3">
              <Label className="font-thin">Select New Provider:</Label>
              <RadioGroup value={selectedProvider} onValueChange={setSelectedProvider}>
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

            {/* Note Alert */}
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800 text-sm">
                <span className="font-thin">Note: Next state will use the new provider.</span>

              </AlertDescription>
            </Alert>

             <div className="flex items-start gap-3">
              <Checkbox defaultChecked id="history" />
              <Label htmlFor="history">Complete history will be preserved</Label>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">

              <DialogClose>
              <Button
              aria-label="change provider" role="button"
               disabled={currentProvider == selectedProvider}
                className="flex-1"
              >
                Change Provider
              </Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
}
