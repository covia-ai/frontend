
'use client'

import { Dialog, DialogTitle, DialogTrigger,DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { CopyIcon } from "lucide-react";




export const ContentViewer = (props:any) => {
        console.log(props.data)
        return (
          <Dialog>
            <DialogTrigger>
                    <span className="hover:text-pink-400 hover:underline"> Click to load content </span>
            </DialogTrigger>
             
              <DialogContent className="h-8/12 w-9/12">
                 <DialogTitle>{props.title}</DialogTitle>
                 <ScrollArea className="h-96 w-104 rounded-md border">
                   {props.data}
                    
                 </ScrollArea>
              </DialogContent>
          </Dialog>
      );
};

