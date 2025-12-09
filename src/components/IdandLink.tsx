import { copyDataToClipBoard } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Copy} from "lucide-react";
import { getAssetIdFromPath } from "@/lib/covia/Utils";

export const IdAndLink = (props: any) => {
    const type = props.type;
    const url = props.url;
    const id = getAssetIdFromPath(props.id, url);
    return (
         <div className="flex flex-row items-start justify-center space-x-2 space-x-reverse w-full  text-xs mt-4  ">
            
            <Tooltip>
                <TooltipTrigger >
                    <div data-testid="idcopy_btn" className="flex flex-row  mr-2 border border-gray-300 text-muted-foreground rounded-md p-2 w-full space-x-2"> 
                    <span>{id} </span>
                    <Copy  size={12} onClick={(e) => copyDataToClipBoard(url, type+" path copied to clipboard")}></Copy>
                    </div>
                </TooltipTrigger>
                    <TooltipContent>{props.type} Id</TooltipContent>
            </Tooltip>
      </div>
    )
}