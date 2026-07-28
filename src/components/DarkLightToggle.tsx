"use client";
import React, { useEffect } from "react";
import { useTheme } from "next-themes";
import { Moon,Sun } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function DarkLightToggle() {
  const { setTheme, theme  } = useTheme();
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
            e.preventDefault();
            if(theme == "light") 
                setTheme("dark")
          
            if(theme == "dark")
                setTheme("light")
          }
        }
    
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }, [setTheme, theme]);

  return (
    <div>
      {theme =="light" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button aria-label="theme toggle" role="button" data-testid="btn_toggle_light" variant={"outline"} onClick={() => setTheme("dark")}><Moon/></Button>
          </TooltipTrigger>
          <TooltipContent>Switch to dark mode</TooltipContent>
        </Tooltip>
      )}
      {theme =="dark" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button aria-label="theme toggle" role="button" className="hover:border hover:bg-primary-vlight" data-testid="btn_toggle_dark" variant={"outline"}  onClick={() => setTheme("light")}><Sun/></Button>
          </TooltipTrigger>
          <TooltipContent>Switch to light mode</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}