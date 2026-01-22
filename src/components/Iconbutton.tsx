import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter } from "next/navigation";

export const Iconbutton = (props:any) => {
  const Icon = props.icon;
  const router = useRouter();

  return (
     <Tooltip>
        <TooltipTrigger>
            {
            (props.label && props.label !="") ? 
              (
                    <div className="flex flex-row items-center justify-center border-1 border-muted rounded-[11px] space-x-2 px-2 py-2 h-8 w-fit hover:bg-muted">
                         {props.compact && <Icon data-testid="btn-icon" size={16} ></Icon>}
                         {!props.compact && <Icon data-testid="btn-icon" size={20} ></Icon>}
                         <span data-testid="btn-label" className="text-xs">{props.label}</span>
                    </div>
              ):
              (
              (props.pathId && props.pathId !="" ) ?

              (<div className="inline-flex items-center justify-center border-1 border-muted rounded-[11px] px-2 py-2 h-8 w-8 bg-primary text-primary-foreground dark:bg-primary-light dark:text-foreground">
                 {props.compact &&  <Icon data-testid="btn-icon" size={16} onClick={() => router.push("/venue/"+encodeURIComponent(props.venueId)+"/"+props.path+"/" + props.pathId) }></Icon>}
                 {!props.compact &&  <Icon data-testid="btn-icon" size={20} onClick={() => router.push("/venue/"+encodeURIComponent(props.venueId)+"/"+props.path+"/" + props.pathId) }></Icon>}

              </div>
              ):
              (
                <div className="inline-flex items-center justify-center bg-muted text-muted-foreground border-1 border-slate-300 rounded-[11px] px-2 py-2 h-8 w-8 hover:bg-muted">
                   {props.compact &&  <Icon data-testid="btn-icon" size={16}></Icon> }
                   {!props.compact &&  <Icon data-testid="btn-icon" size={20}></Icon> }
                </div>
              )
              )
            }
            </TooltipTrigger>
        <TooltipContent data-testid="btn-tootip">{props.message}</TooltipContent>
     </Tooltip>
  )
}