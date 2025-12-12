import { Separator } from "./ui/separator"

export const SeperatorWithText= (props:any) => {
    return (
        <div className="w-full">
        <div className="relative flex items-center gap-2">
          <Separator className="flex-1" />
          <span className="shrink-0 px-2 text-muted-foreground text-lg uppercase">
            {props.text}
          </span>
          <Separator className="flex-1" />
        </div>
      </div>
    )
}