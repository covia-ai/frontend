"use client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MagicWandIcon } from "@radix-ui/react-icons";

export const AIPrompt = () => {
  const [selectedOption, setSelectedOption] = useState('chatgpt')

  return (
    <div data-testid="chat-container" className="flex flex-col items-center justify-center py-10 px-10  my-4 ">
        <h3 className="text-center text-4xl  font-bold">
          How can I help you in  {" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            being more productive
          </span>
        </h3>
        <p className="text-xl text-muted-foreground text-center mt-4 mb-8">
          Create your first flow with AI or check out our guided tutorials below
        </p>
        <div className="flex flex-row items-center justify-center w-full space-x-4">
          <Input
            placeholder="Build me an orchestration....."
            className="bg-card text-card-foreground w-8/12"
            aria-label="email"
            disabled
          />
          <Select disabled onValueChange={value => setSelectedOption(value)} defaultValue="chatgpt">
                      <SelectTrigger className="w-[120px] text-semibold bg-card text-card-foreground">
                        <SelectValue className="text-semibold" placeholder="Run Status" />
                      </SelectTrigger>    
                      <SelectContent>
                        <SelectGroup>
                          
                          <SelectItem value="chatgpt">ChatGPT</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="grok">Grok</SelectItem>
                          <SelectItem value="perplexity">Perplexity</SelectItem>
                        </SelectGroup>
                      </SelectContent>
          </Select>
          <Dialog >     
              
             <DialogTrigger>
              <Button disabled data-testid="chat-button" variant="default" className="my-4"><MagicWandIcon></MagicWandIcon>
              </Button>
             </DialogTrigger>
             <DialogContent data-testid="chat-dialog" className="flex flex-col items-center justify-center">
                  <DialogTitle>Connect to AI Model</DialogTitle>
                  <Input placeholder="Provide api key"></Input>
                  <Button data-testid="chat-connect-to-model">Connect</Button>
             </DialogContent>
          </Dialog>
        </div>

      </div>
  );
};
