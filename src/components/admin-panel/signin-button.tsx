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
import { AvatarFallback } from "@radix-ui/react-avatar";
export function SignInButton(props:any) {
  const { data: session } = useSession()
  const router = useRouter()
   if (!session?.user) {
    return (
        <div className="flex items-center justify-center" key={props.index}>
          <Button
                    onClick={() => {router.push("/signUp")}}
                    variant="outline"
                    className="justify-center h-8 my-5 bg-primary text-primary-foreground text-sm"
                  >
                    <LogInIcon/>
                    <p
                      className={cn(
                        "whitespace-nowrap ",
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
                           <AvatarImage src={session?.user.image!} alt="avatar" className="hover:bg-slate-400"/>
                           <AvatarFallback>{session?.user.name?.charAt(0)}</AvatarFallback></Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-fit mr-8">
                          <DropdownMenuLabel>{session?.user.name}</DropdownMenuLabel>
                           <DropdownMenuLabel >{session?.user.email}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                           
                            <DropdownMenuItem>
                              Settings
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                           <DropdownMenuSeparator />
                             <DropdownMenuItem className="items-center text-center">
                              <Button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                variant="ghost"
                                className="text-sm mx-0"
                              >                              
                                Sign Out
                             </Button>
                             </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
     </div>
  )
  }
}