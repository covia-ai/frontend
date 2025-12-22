
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import { SignInButton } from "./signin-button";
import { VenueSelector } from "@/components/VenueSelector";
import { DarkLightToggle } from "../DarkLightToggle";
import { SmartBreadcrumb } from "../ui/smart-breadcrumb";
import { Separator } from "../ui/separator";
import { ShortcutModal } from "../ShortCutModal";



export function TopBar(props:any) {
  return (   
    <header className="sticky top-0 z-10 w-full bg-background ">
      <div className=" flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
        </div>
        <div className="flex flex-1 items-center justify-between space-x-4 w-full">
          <SmartBreadcrumb assetOrJobName= {props.assetOrJobName} venueName={props.venueName}/>
          <div className="flex flex-1 items-center justify-end space-x-4">
              <DarkLightToggle/>
              <VenueSelector />
              <SignInButton/>
             
          </div>
         
        </div>
        
      </div>
       <Separator/>
    </header>
  );
}
