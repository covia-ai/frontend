
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { SignInButton } from "./signin-button";
import { Dot } from "lucide-react";

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
             <Dot size={32} color="#63d035" className="p-0"></Dot> <span className="text-xs">Default Venue</span>
          </div>
          <SignInButton/>
        </div>
      </div>
    </header>
  );
}
