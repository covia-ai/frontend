"use client";

import { ROOT_NAMESPACES } from "@/lib/workspace-namespaces";
import { TypeTile } from "@/components/TypeTile";
import { namespaceLook } from "@/lib/workspace-look";

type WorkspaceNamespacePaneProps = {
  activeNamespace: string | null;
  onSelect: (namespace: string) => void;
};

export function WorkspaceNamespacePane({
  activeNamespace,
  onSelect,
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
          const look = namespaceLook(namespace.key);
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
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
                onClick={() => onSelect(namespace.key)}
                title={namespace.description}
              >
                <TypeTile Icon={look.Icon} tile={look.tile} className="size-7" iconSize={15} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {namespace.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {namespace.key}
                </span>
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
