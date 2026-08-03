"use client";

import { Database, GripVertical } from "lucide-react";
import { usePaneResize } from "@/hooks/use-pane-resize";
import { useWorkspaceExplorer } from "@/hooks/use-workspace-explorer";
import { WorkspaceBrowserPane } from "@/components/workspace/WorkspaceBrowserPane";
import { WorkspaceValuePane } from "@/components/workspace/WorkspaceValuePane";

export function WorkspaceExplorer() {
  const explorer = useWorkspaceExplorer();
  const {
    width: leftWidth,
    containerRef,
    startResizing,
  } = usePaneResize(300);

  if (!explorer.venue) {
    return (
      <div className="mt-4 flex h-[200px] w-full items-center justify-center overflow-hidden rounded-lg border border-border text-muted-foreground shadow-sm">
        <Database size={32} className="mr-2" />
        <p className="text-sm">Select a venue to browse workspace data</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mt-4 flex h-[500px] w-full overflow-hidden rounded-lg border border-border shadow-sm"
    >
      <div
        style={{ width: `${leftWidth}px` }}
        className="shrink-0 border-r border-border"
      >
        <WorkspaceBrowserPane
          entries={explorer.entries}
          loading={explorer.listingLoading}
          error={explorer.listingError}
          currentPath={explorer.currentPath}
          pathSegments={explorer.pathSegments}
          selectedPath={explorer.selectedPath}
          isAuthenticated={explorer.isAuthenticated}
          pendingMutation={explorer.pendingMutation}
          onNavigate={explorer.navigateTo}
          onSelect={explorer.selectPath}
          onRefresh={explorer.refreshListing}
          onCreate={explorer.create}
        />
      </div>

      <div
        onMouseDown={startResizing}
        className="group relative z-10 flex w-1.5 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:w-1.5 hover:bg-blue-400"
      >
        <div className="absolute hidden rounded-full bg-blue-500 p-0.5 group-hover:block">
          <GripVertical size={10} className="text-white" />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <WorkspaceValuePane
          key={explorer.selectedPath ?? "empty"}
          selectedPath={explorer.selectedPath}
          selectedValue={explorer.selectedValue}
          loading={explorer.valueLoading}
          error={explorer.valueError}
          editedData={explorer.editedData}
          editMode={explorer.editMode}
          isAuthenticated={explorer.isAuthenticated}
          pendingMutation={explorer.pendingMutation}
          onEditedDataChange={explorer.setEditedData}
          onEditModeChange={explorer.setEditMode}
          onSave={explorer.save}
          onDelete={explorer.remove}
        />
      </div>
    </div>
  );
}
