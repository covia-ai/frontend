"use client";

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { MagicWandIcon } from "@radix-ui/react-icons";

export function AgentSearch() {
  return (
    <div data-testid="chat-container" className="flex flex-col items-center justify-center py-10 px-10">
      <h3 className="text-center text-4xl  font-thin">
        Locate your  {" "}
         <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            agent ..
          </span>
      </h3>
      <div className="flex flex-col md:flex-row lg:flex-row items-center justify-center w-full space-x-2 space-y-2 ">
        <Input
            placeholder="What is thy bidding, my master"
            className="bg-card placeholder:text-muted-foreground my-2"
            aria-label="prompt"
       />
       <Button  aria-label="Run" role="button" data-testid="chat-button" variant="default" className="my-4 btn btn-xs mx-0 bg-primary text-primary-foreground"><MagicWandIcon/></Button>
      </div>
    </div>
  );
}
