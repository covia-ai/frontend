import copy from 'copy-to-clipboard';
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DialogTrigger } from '@radix-ui/react-dialog';
import { HelpCircle, Keyboard } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export const ShortcutModal = (props:any) => {
  
    return (
        <div className="flex flex-row items-end justify-end w-fullm-2">
          <Dialog >
                <DialogTrigger>
                        <HelpCircle 
                            className="fixed bottom-4 right-4 h-8 w-8 rounded-full bg-primary text-white dark:bg-background dark:text-foreground shadow-lg opacity-75 z-50">

                            </HelpCircle>
              </DialogTrigger>
               <DialogContent className="bg-card text-card-foreground font-thin">
                 <DialogTitle >Keyboard Shortcuts</DialogTitle>
                 <hr/>
                 
                    <div className="flex flex-row items-start justify-between text-sm">
                            <div className="text-center">Sidebar Toggle</div>
                            <div className="text-center"><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">Cltr</span><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">b</span></div>
                    </div>
                    <div className="flex flex-row items-start justify-between text-sm">
                            <div className="text-center">Theme Toggle</div>
                            <div className="text-center"><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">Cltr</span><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">x</span></div>
                    </div>

                    <div className="flex flex-row items-start justify-between text-sm">
                            <div className="text-center">On asset page - Add new asset</div>
                            <div className="text-center"><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">Cltr</span><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">a</span></div>
                    </div>
                      <div className="flex flex-row items-start justify-between text-sm">
                            <div className="text-center">On venue page - Add new venue</div>
                            <div className="text-center"><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">Cltr</span><span className="bg-muted text-muted-foreground p-2 rounded-sm m-1">v</span></div>
                    </div>
               </DialogContent>
          </Dialog>
          </div>
    )
}