import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect } from "react";

interface SidebarToggleProps {
  isOpen: boolean | undefined;
  setIsOpen?: () => void;
}


export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsOpen?.()
      }
      }
  
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setIsOpen]);
  
  return (
    <div className="invisible lg:visible absolute top-[12px] -right-[16px] z-20 ">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setIsOpen?.()}
            aria-label={isOpen === false ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md w-8 h-8 bg-muted text-muted-foreground hover:bg-secondary-light hover:text-muted-foreground"
            variant="secondary"
            size="icon"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform ease-in-out duration-700 ",
                isOpen === false ? "rotate-180" : "rotate-0"
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isOpen === false ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
