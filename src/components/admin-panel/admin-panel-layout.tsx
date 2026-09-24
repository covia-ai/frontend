"use client";

import { Sidebar } from "@/components/admin-panel/sidebar";
import { GlobalDropAssetDialog } from "@/components/GlobalDropAssetDialog";
import { CommandPalette } from "@/components/CommandPalette";
import { useSidebar } from "@/hooks/use-sidebar";
import { useHitlOpenCountPoll } from "@/hooks/use-hitl";
import { useWatchedJobsPoll } from "@/hooks/use-watched-jobs";
import { cn } from "@/lib/utils";

export default function AdminPanelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const isOpen = useSidebar((state) => state.isOpen);
  // Single owner of each background poll for the whole app.
  useHitlOpenCountPoll();
  useWatchedJobsPoll();
  return (
    <>
      <GlobalDropAssetDialog />
      <CommandPalette />
      <Sidebar />
      <main
        className={cn(
          "min-h-[calc(100vh_-_56px)] bg-background transition-[margin-left] ease-in-out duration-300",
          isOpen ? "lg:ml-56" : "lg:ml-[90px]"
        )}
      >
        {children}
      </main>
    </>
  );
}
