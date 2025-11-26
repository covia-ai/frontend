import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from "sonner"
import { Separator } from "./ui/separator";

export function ForkAgent(props:any) {

    const [newAgentName, setNewAgentName] = useState("");

     const handleFork = () => {
     toast("Success !!", {
                    description: "Agent forked successfully"
                  })
  };
    return (
          <Dialog >
            <DialogTrigger asChild>
              <Button>Fork Agent</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card text-card-foreground">
              <DialogHeader>
                <DialogTitle className="text-lg font-thin">Fork Agent</DialogTitle>
                <Separator/>
              </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Info Alert */}
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800 text-sm">
                Forking from current state (State {props.step})
              </AlertDescription>
            </Alert>

            {/* New Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="new-agent-name" className="font-thin">
                New Agent Name:
              </Label>
              <Input
                id="new-agent-name"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Action Buttons */}
              <DialogClose>
              <Button onClick={() => handleFork()}>
                Create Fork
              </Button>
              </DialogClose>
          </div>
            </DialogContent>
          </Dialog>
    )
}