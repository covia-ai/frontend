"use client";
import { Menu } from "@/components/admin-panel/menu";
import { SidebarLegalFooter } from "@/components/admin-panel/sidebar-legal-footer";
import { SidebarToggle } from "@/components/admin-panel/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
export function Sidebar() {
  const isOpen = useSidebar((state) => state.isOpen);
  const toggleOpen = useSidebar((state) => state.toggleOpen);
  const { theme } = useTheme();

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-20 flex flex-col text-sidebar-foreground text-md bg-linear-to-b from-sidebar from-60% via-primary-light via-75% to-secondary-light to-90% shadow-lg h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300",
        isOpen ? "w-56" : "w-[90px]"
      )}
    >
      <SidebarToggle isOpen={isOpen} setIsOpen={toggleOpen} />
      <div
        // flex-1 min-h-0 makes this the sidebar's middle region, between the
        // header below and SidebarLegalFooter below — a normal flex sibling
        // now (not an absolute overlay), so it can never overlap this
        // content. No overflow-y-auto here: Menu's own ScrollArea does the
        // scrolling (see menu.tsx) now that it actually gets a bounded
        // height to scroll within, instead of silently never activating.
        className="relative flex-1 min-h-0 flex flex-col px-3 py-3 shadow-md "
      >
        <Button
          aria-label="sidebar" role="button"
          className={cn(
            "shrink-0 transition-transform ease-in-out duration-300 mb-1 ",
            isOpen ? "translate-x-0" : "translate-x-1"
          )}
          variant="link"
          asChild
        >
            <h1
              className={cn(
                "font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300",
                isOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-96 opacity-0 hidden"
              )}
            >

              <Link href="https://www.covia.ai">
               <div className="flex flex-row items-center justify-center space-x-4">
                <Image src="/Covia_logo_icon_transparent.png" width={25} height={0} alt="covia"></Image>
                {theme == "light" && <Image src="/covia.ai_dark_blue.png" width={100} height={0} alt="Covia" ></Image>}
                {theme == "dark" && <Image src="/covia.ai_dark_mode.png" width={100} height={0} alt="Covia" ></Image>}

              </div>
              </Link>

            </h1>
        </Button>
        <Menu isOpen={isOpen} />
      </div>
      <SidebarLegalFooter isOpen={isOpen} />
    </aside>
  );
}
