import { forwardRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter } from "next/navigation";

// forwardRef + prop spreading so this works as the child of a Radix
// `asChild` trigger (e.g. `<DialogTrigger asChild>`), which clones
// onClick/ref onto whatever element is passed to it — without this,
// those props are silently dropped and the trigger never fires.
export const IconButton = forwardRef<HTMLDivElement, any>((props, ref) => {
  const { icon: Icon, label, message, compact, pathId, path, venueId, ...rest } = props;
  const router = useRouter();

  return (
     <Tooltip>
        <TooltipTrigger asChild>
            {
            (label && label !="") ?
              (
                    <div ref={ref} {...rest} className="flex flex-row items-center justify-center border-1 border-muted rounded-[11px] space-x-2 px-2 py-2 h-8 w-fit hover:bg-muted">
                         {compact && <Icon data-testid="btn-icon" size={16} ></Icon>}
                         {!compact && <Icon data-testid="btn-icon" size={20} ></Icon>}
                         <span data-testid="btn-label" className="text-xs">{label}</span>
                    </div>
              ):
              (
              (pathId && pathId !="" ) ?

              (<div ref={ref} {...rest} className="inline-flex items-center justify-center border-1 border-muted rounded-[11px] px-2 py-2 h-8 w-8 bg-primary text-primary-foreground">
                 {compact &&  <Icon data-testid="btn-icon" size={16} onClick={() => router.push("/venue/"+encodeURIComponent(venueId)+"/"+path+"/" + pathId) }></Icon>}
                 {!compact &&  <Icon data-testid="btn-icon" size={20} onClick={() => router.push("/venue/"+encodeURIComponent(venueId)+"/"+path+"/" + pathId) }></Icon>}

              </div>
              ):
              (
                <div ref={ref} {...rest} className="inline-flex items-center justify-center bg-muted text-muted-foreground border-1 border-border rounded-[11px] px-2 py-2 h-8 w-8 hover:bg-muted">
                   {compact &&  <Icon data-testid="btn-icon" size={16}></Icon> }
                   {!compact &&  <Icon data-testid="btn-icon" size={20}></Icon> }
                </div>
              )
              )
            }
            </TooltipTrigger>
        <TooltipContent data-testid="btn-tootip">{message}</TooltipContent>
     </Tooltip>
  )
});
IconButton.displayName = "IconButton";