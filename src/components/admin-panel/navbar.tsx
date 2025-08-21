
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { SignInButton } from "./signin-button";
import { ChevronDown, Dot } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "../ui/button";
interface NavbarProps {
  title: string;
}


export  function  Navbar({ title }: NavbarProps) {

 return (   
    <header className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
          
        </div>
        <div className="flex flex-1 items-center justify-end">
          <div className="flex flex-row items-center mr-10">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="text-primary text-xs flex flex-row items-center justify-center">Venues <ChevronDown size={16}></ChevronDown></div>
              </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48" align="start">
               <DropdownMenuItem>
                  <Dot size={20} color={"#008000"}></Dot> Default Venue
               </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            
          </div>
          <SignInButton/>
        </div>
      </div>
    </header>
  );
}
