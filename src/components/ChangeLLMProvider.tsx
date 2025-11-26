
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


export function ChangeLLMProvider(props:any) {
    const [selectedProvider, setSelectedProvider] = useState('claude-3.5');
    const [currentProvider, setCurrentProvider] = useState('claude-3.5');

    return (
      <Dialog >
        <DialogTrigger asChild>
          <Button>Change Provider</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl">Change LLM Provider</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Current Provider Alert */}
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="flex flex-row text-yellow-800 text-sm">
                Currently using: <span className="font-thin">Claude 3.5</span>
              </AlertDescription>
            </Alert>

            {/* Select New Provider */}
            <div className="space-y-3">
              <Label className="font-thin">Select New Provider:</Label>
              <RadioGroup value={selectedProvider} onValueChange={setSelectedProvider}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="claude-3.5" id="claude" />
                  <Label htmlFor="claude" className="font-normal cursor-pointer">
                    Claude 3.5 (Current)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gemini-pro" id="gemini" />
                  <Label htmlFor="gemini" className="font-normal cursor-pointer">
                    Gemini Pro
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="openai-gpt-4" id="openai" />
                  <Label htmlFor="openai" className="font-normal cursor-pointer">
                    OpenAI GPT-4
                  </Label>
                </div>
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