"use client";
import React from "react";
import { useTheme } from "next-themes";
import { Moon,Sun } from "lucide-react";
import { Button } from "./ui/button";

export function DarkLightToggle() {
  const { setTheme, theme  } = useTheme();
  return (
    <div>
      {theme =="light" && <Button data-testid="btn_toggle_light" variant={"outline"} onClick={() => setTheme("dark")}><Moon/></Button>}
      {theme =="dark" &&  <Button  data-testid="btn_toggle_dark" variant={"outline"}  onClick={() => setTheme("light")}><Sun/></Button>}
    </div>
  );
}