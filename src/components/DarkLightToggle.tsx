"use client";
import React, { useEffect } from "react";
import { useTheme } from "next-themes";
import { Moon,Sun } from "lucide-react";
import { Button } from "./ui/button";

export function DarkLightToggle() {
  const { setTheme, theme  } = useTheme();
    useEffect(() => {
        const handleKeyDown = (e) => {
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
      {theme =="light" && <Button aria-label="theme toggle" role="button" data-testid="btn_toggle_light" variant={"outline"} onClick={() => setTheme("dark")}><Moon/></Button>}
      {theme =="dark" &&  <Button aria-label="theme toggle" role="button" className="dark:hover:border dark:hover:bg-primary-light" data-testid="btn_toggle_dark" variant={"outline"}  onClick={() => setTheme("light")}><Sun/></Button>}
    </div>
  );
}