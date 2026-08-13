"use client";

import { FolderRoot, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROOT_NAMESPACES } from "@/lib/workspace-namespaces";

type WorkspaceNamespacePaneProps = {
  activeNamespace: string | null;
  refreshing: boolean;
  onSelect: (namespace: string) => void;
  onResync: () => void;
};

export function WorkspaceNamespacePane({
  activeNamespace,
  refreshing,
  onSelect,
  onResync,
}: WorkspaceNamespacePaneProps) {
  return (
    <aside data-testid="workspace-namespace-pane" className="flex h-full flex-col bg-muted/20">
      <div className="border-b px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Namespaces
        </p>
      </div>
      <nav aria-label="Workspace namespaces" className="min-h-0 flex-1 overflow-y-auto p-2">
        {ROOT_NAMESPACES.map((namespace) => {
          const active = namespace.key === activeNamespace;
          return (
            <div
              key={namespace.key}
              className={`group mb-0.5 flex items-center rounded-md transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left"
                onClick={() => onSelect(namespace.key)}
                title={namespace.description}
              >
                <FolderRoot size={15} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {namespace.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {namespace.key}
                </span>
              </button>
              {active && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-1 size-7 shrink-0"
                      aria-label={`Resync ${namespace.label}`}
                      onClick={onResync}
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RefreshCw size={13} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Resync {namespace.label}</TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
