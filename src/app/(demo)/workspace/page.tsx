
"use client";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { ShowCase } from "@/components/ShowCase";
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
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
export default function Workspace() {
const [selectedOption, setSelectedOption] = useState('chatgpt')


  return (
    <ContentLayout title="Workspace">
      <div className="flex flex-col items-center justify-center py-10 px-10  my-4 ">
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
          />
          <Select onValueChange={value => setSelectedOption(value)} defaultValue="chatgpt">
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
          <Dialog>
            
             <DialogTrigger><Button variant="default" className="my-4"><MagicWandIcon></MagicWandIcon></Button>
             </DialogTrigger>
             <DialogContent className="flex flex-col items-center justify-center">
                  <DialogHeader>Connect to AI Model</DialogHeader>
                  <Input placeholder="Provide api key"></Input>
                  <Button>Connect</Button>
             </DialogContent>
          </Dialog>
        </div>

      </div>

      <Separator />

      <div className="flex flex-col items-center justify-center py-10 px-10  my-4">
        <h3 className="text-center text-4xl  font-bold">
          Try some   {" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            sample Grid operations
          </span>
        </h3>
          <ShowCase></ShowCase>

       
      
      </div>
    </ContentLayout>
  );
}
