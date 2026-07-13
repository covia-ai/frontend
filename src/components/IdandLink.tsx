import { copyDataToClipBoard } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Copy } from "lucide-react";
import { didUrl, Namespace } from "@covia/covia-sdk";

const NAMESPACE_BY_TYPE: Record<string, string> = {
    asset: Namespace.ASSET,
    operation: Namespace.OPERATION,
    job: Namespace.JOB,
    agent: Namespace.AGENT,
    workspace: Namespace.WORKSPACE,
    secret: Namespace.SECRET,
};

interface IdAndLinkProps {
    type: string;
    id?: string;
    // The resource's owning venue DID — prefixed onto the id when known.
    // Omit when the venue isn't resolved yet; the bare namespaced id (e.g.
    // `a/<hash>`) is still shown rather than nothing.
    venueId?: string;
}

export const IdAndLink = ({ type, id, venueId }: IdAndLinkProps) => {
    const namespace = NAMESPACE_BY_TYPE[type.toLowerCase()] ?? Namespace.ASSET;
    const displayId = didUrl(venueId ?? null, namespace, id ?? "");
    return (
         <div className="flex flex-row items-start justify-center space-x-2 space-x-reverse w-full  text-xs mt-2  ">

            <Tooltip>
                <TooltipTrigger >
                    <div data-testid="idcopy_btn" className="p-1 flex flex-row  mr-1 border border-border text-muted-foreground rounded-md w-full space-x-2">
                    <div className="select-text text-[10px] w-full">{displayId} </div>
                    <Copy  size={10} onClick={(_e) => copyDataToClipBoard(displayId, "Asset Id copied to clipboard")}></Copy>
                    </div>
                </TooltipTrigger>
                    <TooltipContent>{type} Id</TooltipContent>
            </Tooltip>
      </div>
    )
}
