import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter } from "next/navigation";
import { useVenue } from "@/hooks/use-venue";
import { useStore } from "zustand";
import { Venue } from "@/lib/covia";

export const Iconbutton = (props:any) => {
  const Icon = props.icon;
  const router = useRouter();
  const venueObj = useStore(useVenue, (x) => x.getCurrentVenue());
  if (!venueObj) return null;
  const venue = new Venue({baseUrl:venueObj.baseUrl, venueId:venueObj.venueId})
  
  return (
     <Tooltip>
        <TooltipTrigger>
            {
            (props.label && props.label !="") ? 
              (
                    <div className="flex flex-row items-center justify-center border-1 border-slate-300 rounded-[11px] space-x-2 px-2 py-2 h-8 w-fit hover:bg-muted">
                         <Icon size={20} ></Icon>
                         <span className="text-xs">{props.label}</span>
                    </div>
              ):
              (
              (props.pathId && props.pathId !="" ) ?

              (<div className="inline-flex items-center justify-center border-1 border-slate-300 rounded-[11px] px-2 py-2 h-8 w-8 hover:bg-muted">
                  <Icon size={20} onClick={() => router.push("/venue/"+encodeURIComponent(venue.venueId)+"/"+props.path+"/" + props.pathId) }></Icon>
              </div>
              ):
              (
                <div className="inline-flex items-center justify-center border-1 border-slate-300 rounded-[11px] px-2 py-2 h-8 w-8 hover:bg-muted">
                  <Icon size={20}></Icon> 
              </div>
              )
              )
            }
            </TooltipTrigger>
        <TooltipContent>{props.message}</TooltipContent>
     </Tooltip>
  )
}