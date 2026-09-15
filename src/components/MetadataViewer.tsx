"use client";

import type { Asset, Venue } from "@covia/covia-sdk";
import {
  OperationMeta,
  AgentTemplateMeta,
  SkillMeta,
  ArtifactMeta,
  ReferenceMeta,
  ProvenancePanel,
  assetHasLoadBearingContent,
} from "@/components/metadata/AssetSections";
import { AssetActions } from "@/components/metadata/AssetActions";

interface MetadataViewerProps {
  asset: Asset;
  venue?: Venue;
  isAuthenticated?: boolean;
  // Render the actions as a top-right bar with the fields full-width, instead of
  // the two-column content/actions split. Used by the operation detail page's
  // "Details" tab, where choosing the tab is the request. (Both modes now show
  // the content directly — W3 3B lifted it out of the old "Asset Metadata"
  // accordion; the raw metadata JSON stays behind the "View metadata" dialog.)
  bare?: boolean;
}

// A thin router: it composes the per-kind content sections (AssetSections) with
// the shared provenance panel and the actions column. Each section decides for
// itself whether it applies to this asset, so this stays declarative.
export const MetadataViewer = ({ asset, venue, isAuthenticated = false, bare = false }: MetadataViewerProps) => {
  // Kind/content fields are why you're looking at this asset; provenance
  // (creator/license/keywords) is secondary, so de-emphasise it only when
  // something load-bearing is also shown.
  const deEmphasizeProvenance = assetHasLoadBearingContent(asset);

  const content = (
    <div className="flex min-w-0 flex-col" data-testid="asset-fields">
      <ReferenceMeta asset={asset} />
      <OperationMeta asset={asset} />
      <AgentTemplateMeta asset={asset} />
      <SkillMeta asset={asset} />
      <ArtifactMeta asset={asset} />
      <ProvenancePanel asset={asset} deEmphasize={deEmphasizeProvenance} />
    </div>
  );

  const actions = <AssetActions asset={asset} venue={venue} isAuthenticated={isAuthenticated} />;

  // Bare (the operation detail "Details" tab): actions as a top-right bar, then
  // the fields full-width — no cramped side column to overflow.
  if (bare) {
    return (
      <div className="w-full text-sm">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">{actions}</div>
        {content}
      </div>
    );
  }

  // Detail page: content first (no accordion), two columns on md+.
  return (
    <div className="w-full text-sm">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="min-w-0 flex-3 px-2 md:border-r-2 border-border">{content}</div>
        <div className="flex min-w-0 flex-2 flex-col gap-2 px-2">{actions}</div>
      </div>
    </div>
  );
};
