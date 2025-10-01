import { copyDataToClipBoard } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Copy} from "lucide-react";

export const IdAndLink = (props: any) => {
    const type = props.type;
    const url = props.url;
    const id = props.id;
    return (
         <div className="flex flex-row items-start justify-center space-x-2 space-x-reverse w-1/3  text-xs mt-4  ">
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <div className="flex flex-row  mr-2 border border-slate-200 rounded-md p-2 hover:bg-slate-100"> {url.slice(0, 15) + "..."} 
                                                        <Copy size={12} onClick={(e) => copyDataToClipBoard(url, type+" Link copied to clipboard")}></Copy>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{props.type} Link</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <div className="flex flex-row  mr-2 border border-slate-200 rounded-md p-2 hover:bg-slate-100"> 
                                                        {props.id?.slice(0, 15) + "..."} 
                                                        <Copy size={12} onClick={(e) => copyDataToClipBoard(id, type+"Id copied to clipboard")}></Copy>
                                                        </div>
                                                   </TooltipTrigger>
                                                     <TooltipContent>{props.type} Id</TooltipContent>
                                               </Tooltip>
                             </div>
    )
}