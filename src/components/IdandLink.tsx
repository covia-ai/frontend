import { copyDataToClipBoard } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Copy} from "lucide-react";
import { getAssetIdFromPath } from "@/lib/covia/Utils";

export const IdAndLink = (props: any) => {
    const type = props.type;
    const url = props.url;
    const id = getAssetIdFromPath(props.id, url);
    return (
         <div className="flex flex-row items-start justify-center space-x-2 space-x-reverse w-1/3  text-xs mt-4  ">
            <Tooltip>
                <TooltipTrigger>
                    <div className="flex flex-row  mr-2 border border-slate-400 rounded-md p-2 w-32"> {url.slice(0, 15) + "..."} 
                    <Copy data-testid="linkcopy_btn"size={12} onClick={(e) => copyDataToClipBoard(url, type+" Link copied to clipboard")}></Copy>
                    </div>
                </TooltipTrigger>
                <TooltipContent>{props.type} Link</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger >
                    <div className="flex flex-row  mr-2 border border-slate-400 rounded-md p-2 w-52 "> 
                    {id?.slice(0, 25) + "..."} 
                    <Copy ata-testid="idcopy_btn" size={12} onClick={(e) => copyDataToClipBoard(id, type+"Id copied to clipboard")}></Copy>
                    </div>
                </TooltipTrigger>
                    <TooltipContent>{props.type} Id</TooltipContent>
            </Tooltip>
      </div>
    )
}