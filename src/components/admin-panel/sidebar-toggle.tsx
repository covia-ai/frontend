import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface SidebarToggleProps {
  isOpen: boolean | undefined;
  setIsOpen?: () => void;
}


export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {

  useEffect(() => {
      const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsOpen?.()
      }
      }
  
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
  
  return (
    <div className="invisible lg:visible absolute top-[12px] -right-[16px] z-20 ">
      <Button
        onClick={() => setIsOpen?.()}
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
    </div>
  );
}
