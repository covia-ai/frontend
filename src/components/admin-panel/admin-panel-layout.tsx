"use client";

import { Sidebar } from "@/components/admin-panel/sidebar";
import { GlobalDropAssetDialog } from "@/components/GlobalDropAssetDialog";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { useHitlOpenCountPoll } from "@/hooks/use-hitl";
import { useWatchedJobsPoll } from "@/hooks/use-watched-jobs";
import { cn } from "@/lib/utils";

export default function AdminPanelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  // Single owner of each background poll for the whole app — must run
  // before the early return below so the hook order stays stable.
  useHitlOpenCountPoll();
  useWatchedJobsPoll();
  if (!sidebar) return null;
  const { getOpenState, settings } = sidebar;
  return (
    <>
      <GlobalDropAssetDialog />
      <Sidebar />
      <main
        className={cn(
          "min-h-[calc(100vh_-_56px)] bg-background transition-[margin-left] ease-in-out duration-300",
          !settings.disabled && (!getOpenState() ? "lg:ml-[90px]" : "lg:ml-56")
        )}
      >
        {children}
      </main>
      
    </>
  );
}
