"use client";

import { Database, Globe } from "lucide-react";
import { useWorkspaceExplorer } from "@/hooks/use-workspace-explorer";
import { WorkspaceBrowserPane } from "@/components/workspace/WorkspaceBrowserPane";
import { WorkspaceNamespacePane } from "@/components/workspace/WorkspaceNamespacePane";
import { WorkspaceValuePane } from "@/components/workspace/WorkspaceValuePane";
import { workspaceNamespaceForPath } from "@/lib/workspace-namespaces";

interface WorkspaceExplorerProps {
  // Seeds the explorer's starting location (e.g. from a ?path= query param
  // on the Workspace page) — a deep link into a specific namespace/path.
  initialPath?: string;
}

export function WorkspaceExplorer({ initialPath }: WorkspaceExplorerProps = {}) {
  const explorer = useWorkspaceExplorer(initialPath);
  const activeNamespace = workspaceNamespaceForPath(explorer.currentPath)?.key ?? null;

  if (!explorer.venue) {
    return (
      <div className="mt-4 flex h-[200px] w-full items-center justify-center overflow-hidden rounded-lg border border-border text-muted-foreground shadow-sm">
        <Database size={32} className="mr-2" />
        <p className="text-sm">Select a venue to browse workspace data</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {activeNamespace === "v" && (
        <div
          data-testid="workspace-shared-venue-banner"
          className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
        >
          <Globe size={14} className="shrink-0" />
          <span>
            Shared with everyone on {explorer.venue.metadata?.name ?? "this venue"} — read-only here.
          </span>
        </div>
      )}

      <div className="grid h-[600px] w-full grid-cols-[10.5rem_17rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-border shadow-sm">
        <div className="min-w-0 border-r border-border">
          <WorkspaceNamespacePane
            activeNamespace={activeNamespace}
            onSelect={explorer.navigateTo}
          />
        </div>

        <div className="min-w-0 border-r border-border">
          <WorkspaceBrowserPane
            entries={explorer.entries}
            loading={explorer.listingLoading}
            error={explorer.listingError}
            currentPath={explorer.currentPath}
            pathSegments={explorer.pathSegments}
            selectedPath={explorer.selectedPath}
            isAuthenticated={explorer.isAuthenticated}
            pendingMutation={explorer.pendingMutation}
            refreshing={explorer.namespaceRefreshing}
            onNavigate={explorer.navigateTo}
            onSelect={explorer.selectPath}
            onCreate={explorer.create}
            onResync={explorer.refreshNamespace}
          />
        </div>
        <div data-testid="workspace-content-pane" className="flex min-w-0 flex-col overflow-y-auto">
          <WorkspaceValuePane
            key={explorer.selectedPath ?? "empty"}
            selectedPath={explorer.selectedPath}
            currentPath={explorer.currentPath}
            namespaceEmpty={
              explorer.currentPath !== "/" &&
              !explorer.listingLoading &&
              !explorer.listingError &&
              explorer.entries.length === 0
            }
            selectedValue={explorer.selectedValue}
            loading={explorer.valueLoading}
            error={explorer.valueError}
            editedData={explorer.editedData}
            isAuthenticated={explorer.isAuthenticated}
            pendingMutation={explorer.pendingMutation}
            onEditedDataChange={explorer.setEditedData}
            onSave={explorer.save}
            onDelete={explorer.remove}
          />
        </div>
      </div>
    </div>
  );
}
