"use client";
import React, { useEffect, useEffectEvent } from "react";
import { useTheme } from "next-themes";
import { Moon,Sun } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function DarkLightToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  // The theme is read when the user acts, never to choose markup: the server
  // can't know it, so the icon and label below are both rendered and the theme
  // class on <html> shows the right one.
  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      e.preventDefault();
      toggle();
    }
  });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="theme toggle"
            role="button"
            data-testid="btn_toggle_theme"
            className="dark:hover:border dark:hover:bg-primary-vlight"
            variant={"outline"}
            onClick={toggle}
          >
            <Moon className="dark:hidden" />
            <Sun className="hidden dark:block" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <span className="dark:hidden">Switch to dark mode</span>
          <span className="hidden dark:inline">Switch to light mode</span>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
