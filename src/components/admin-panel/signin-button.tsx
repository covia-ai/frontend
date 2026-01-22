"use client";

import { Button } from "@/components/ui/button";
import {  useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react"
import { LogInIcon } from "lucide-react";
import {
  Avatar,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DialogTrigger, Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { useState } from "react";
export function SignInButton(props:any) {
  const { data: session } = useSession()
  const router = useRouter()
  const [openKeyboadShortcut, setOpenKeyboardShortcut] = useState(false);
  const closeDialog = () => {
    setOpenKeyboardShortcut(false);
  };
   if (!session?.user) {
    return (
        <div className="flex items-center justify-center" key={props.index}>
          <Button
                    onClick={() => {router.push("/signUp")}}
                    variant="default"
                    className="justify-center h-8 my-5 text-sm hover:bg-accent hover:text-muted-foreground dark:hover:bg-primary-light dark:hover:text-foreground"
                  >
                    <LogInIcon/>
                    <p
                      className={cn(
                        "whitespace-nowrap hidden md:block lg:block",
                        props.isOpen === false ? "opacity-0 hidden" : "opacity-100"
                      )}
                    >
                      Sign In
                    </p>
          </Button>
    </div>
    )
  }
  else {
    return (
      <div className="flex flex-row mr-4" >
      
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar>
                  <AvatarImage src={session?.user.image!} alt="avatar" className="border-red-400"/>
                  <AvatarFallback>{session?.user.name?.charAt(0)}</AvatarFallback></Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-fit mr-8">
                <DropdownMenuLabel>{session?.user.name}</DropdownMenuLabel>
                  <DropdownMenuLabel >{session?.user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setOpenKeyboardShortcut(true)} className="items-start text-center dark:hover:bg-primary-light">
                              Keyboard Shortcuts
                      </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="items-start text-center dark:hover:bg-primary-light">
                    <div
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="text-sm "
                    >                              
                      Sign Out
                    </div>
                    </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={openKeyboadShortcut} onOpenChange={closeDialog}>
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
  
}