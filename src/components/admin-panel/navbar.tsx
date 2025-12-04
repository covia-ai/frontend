
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { SignInButton } from "./signin-button";
import { VenueSelector } from "@/components/VenueSelector";
import { DarkLightToggle } from "../DarkLightToggle";



export function Navbar(s) {
  return (   
    <header className="sticky top-0 z-10 w-full bg-card shadow backdrop-blur supports-[backdrop-filter]:bg-card">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <DarkLightToggle/>
          <VenueSelector />
          <SignInButton/>
        </div>
      </div>
    </header>
  );
}
