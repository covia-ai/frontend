"use client";

import { useEffect, useEffectEvent, type ReactNode } from "react";
import Link from "next/link";
import type { JobMetadata, Venue } from "@covia/covia-sdk";
import { useLatestQuery } from "@/hooks/use-latest-query";
import { loadJobTree, normalizeJobId, SCAN_LIMIT, type JobTree, type JobTreeNode } from "@/lib/job-tree";
import { abbreviateJobId, statusVisual } from "@/lib/job-visuals";
import { cn } from "@/lib/utils";

type TreeQuery = { key: string; tree: JobTree | null };
const EMPTY: TreeQuery = { key: "", tree: null };

function jobHref(venueId: string, id: string) {
  return `/venues/${encodeURIComponent(venueId)}/jobs/0x${id}`;
}

function TreeNode({ node, currentId, venueId }: { node: JobTreeNode; currentId: string; venueId: string }) {
  const { Icon, spin, textClass, label } = statusVisual(node.status);
  const current = node.id === currentId;
  return (
    <li>
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md px-2 py-1",
          current && "bg-muted",
        )}
        aria-current={current ? "page" : undefined}
      >
        <Icon size={14} className={cn("shrink-0", textClass, spin && "animate-spin")} aria-label={label} />
        {current ? (
          <span className="truncate text-sm font-medium">{node.name ?? "Operation"}</span>
        ) : (
          <Link href={jobHref(venueId, node.id)} className="truncate text-sm font-medium text-primary hover:underline">
            {node.name ?? "Operation"}
          </Link>
        )}
        {node.op && <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">{node.op}</span>}
        <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">{abbreviateJobId(`0x${node.id}`)}</span>
        {current && <span className="shrink-0 text-xs text-muted-foreground">this job</span>}
      </div>
      {node.children.length > 0 && (
        <ul className="ml-[15px] border-l pl-3">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} currentId={currentId} venueId={venueId} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * The parent/child tree the job belongs to (frontend#256). Rebuilt from the
 * `parent` up-links on job records (see lib/job-tree). Renders nothing for a
 * standalone job, so it only appears for composite ones. Re-reads when the
 * viewed job's status changes, since a running job can still dispatch children.
 */
export function JobTreePanel({
  venue,
  venueId,
  job,
  wrap,
}: {
  venue: Venue | null | undefined;
  venueId: string;
  job: JobMetadata;
  /** Wraps the tree (e.g. in the page's Panel); only called when there is one. */
  wrap: (tree: ReactNode) => ReactNode;
}) {
  const query = useLatestQuery<TreeQuery>(EMPTY);
  const currentId = normalizeJobId(job.id);
  const key = venue ? `${venueId}|${currentId}|${job.status ?? ""}` : "";

  const load = useEffectEvent((forKey: string) => {
    if (!venue) return;
    void query.run(async () => ({ key: forKey, tree: await loadJobTree(venue, job) }));
  });

  useEffect(() => {
    if (key) load(key);
  }, [key]);

  // Keep showing the previous tree for this job while a status-change refresh
  // runs, but never a tree that answers for another job.
  const tree = query.data.key.startsWith(`${venueId}|${currentId}|`) ? query.data.tree : null;
  if (!tree || tree.size < 2) return null;

  return wrap(
    <div className="space-y-2" data-testid="job-tree">
      <ul>
        <TreeNode node={tree.root} currentId={currentId} venueId={venueId} />
      </ul>
      {tree.truncatedAbove && (
        <p className="text-xs text-muted-foreground">
          The parent above the top job isn&apos;t readable (deleted, or not visible to you).
        </p>
      )}
      {!tree.complete && (
        <p className="text-xs text-muted-foreground">
          Searched your {SCAN_LIMIT.toLocaleString()} most recent jobs; older child jobs may be missing.
        </p>
      )}
    </div>,
  );
}
