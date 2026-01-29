import { copyDataToClipBoard } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Copy} from "lucide-react";
import { getAssetIdFromPath } from "@covia-ai/covialib";

export const IdAndLink = (props: any) => {
    const type = props.type;
    const url = props.url;
    const id = getAssetIdFromPath(props.id, url);
    return (
         <div className="flex flex-row items-start justify-center space-x-2 space-x-reverse w-full  text-xs mt-2  ">
            
            <Tooltip>
                <TooltipTrigger >
                    <div data-testid="idcopy_btn" className="p-1 flex flex-row  mr-1 border border-gray-300 text-muted-foreground rounded-md w-full space-x-2"> 
                    <span className="text-[10px] w-full">{id} </span>
                    <Copy  size={10} onClick={(e) => copyDataToClipBoard(url, type+" path copied to clipboard")}></Copy>
                    </div>
                </TooltipTrigger>
                    <TooltipContent>{props.type} Id</TooltipContent>
            </Tooltip>
      </div>
    )
}