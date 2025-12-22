
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "./ui/button";
import { Iconbutton } from "./Iconbutton";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { toast } from "sonner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function AddNewAgent() {
        const [agentName, setAgentName] = useState("");
        const [llmProvider, setLlmProvider]= useState("claude-3.5");
        const [transitionFunction, setTransitionFunction] = useState("standard");
        const [initialState, setInitialState] = useState({});

        const handleNewAgent = () => {
            toast("Success !!", {
                description: "Agent "+agentName+" created"
              })
        };
        return (
              <Dialog>
                  <DialogTrigger>
                    <Iconbutton icon={PlusCircledIcon} message="Create a new agent" label="Create a new agent"/> 
                  </DialogTrigger>
                  <DialogContent className="flex flex-col bg-card">
                      <DialogTitle className="space-y-2">
                            <Label className="text-md">Create a new agent </Label>
                            <Separator></Separator>
                    </DialogTitle>
                          
                    <div className="flex flex-col items-start justify-center space-y-8">
                        {/* Agent Name */}
                        <div className="space-y-2 w-full">
                          <Label htmlFor="agent-name"className="w-32 text-sm">Agent Name:</Label>
                          <Input
                            id="agent-name"
                            placeholder="e.g., Customer Support Agent"
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                          />
                        </div>
      
                        {/* LLM Provider */}
                        <div className="space-y-2">
                          <Label>Select LLM Provider:</Label>
                          <RadioGroup value={llmProvider} onValueChange={setLlmProvider}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="claude-3.5" id="claude" />
                              <Label htmlFor="claude" className="font-normal cursor-pointer">
                                Claude 3.5
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
      
                        {/* State Transition Function */}
                        <div className="space-y-2 w-full">
                          <Label htmlFor="transition-function">Agent Engine:</Label>
                          <Select  value={transitionFunction} onValueChange={setTransitionFunction}>
                            <SelectTrigger id="transition-function">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent >
                              <SelectItem value="standard">Claude Engine</SelectItem>
                              <SelectItem value="custom">Gemini Pro Engine</SelectItem>
                              <SelectItem value="workflow">OpenAI GPT-4 Engine</SelectItem>
                            </SelectContent>
                          </Select>
                          
                        </div>
      
                        {/* Initial State */}
                          <Accordion
      type="single"
      collapsible
      className="w-full"
      defaultValue="item-1"
    >
            <AccordionItem value="advanced">
              <AccordionTrigger>Advanced Options</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 text-balance">
                <Label htmlFor="initial-state">Initial State (optional):</Label>
                  <Textarea
                    id="initial-state"
                    value={JSON.stringify(initialState)}
                    onChange={(e) => setInitialState(e.target.value)}
                    className="font-mono text-sm w-full"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500">
                    Must be valid JSON. Leave as {'{}'} for empty initial state.
                  </p>
              </AccordionContent>
            </AccordionItem>
            </Accordion>
                     </div>
                    <DialogClose>
                          <Button aria-label="create agent" role="button"  onClick={() => handleNewAgent()} className="btn-sm">Create</Button>              
                  </DialogClose>
                  </DialogContent>
              </Dialog>
      )
      }