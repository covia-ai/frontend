"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navbarLinksList, NavProps } from "@/config/nav";
import { Menu } from "lucide-react";
import { buttonVariants } from "./ui/button";
import { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
const { title } = siteConfig;

export const MobileNavFragment = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger className="px-2">
        <Menu
          className="flex md:hidden h-5 w-5"
          onClick={() => setIsOpen(true)}
        >
          {/* <span className="sr-only">Menu Icon</span> */}
        </Menu>
      </SheetTrigger>

      <SheetContent side={"left"}>
        <SheetHeader>
          <SheetTitle className="font-bold text-xl">{title}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col justify-center items-center gap-2 mt-4">
          {navbarLinksList.map(({ href, label }: NavProps) => (
            <Link
              key={label}
              href={href}
              onClick={() => setIsOpen(false)}
              className={buttonVariants({ variant: "ghost" })}
            >
              {label}
            </Link>
          ))}
       
        </nav>
      </SheetContent>
    </Sheet>
  );
};
