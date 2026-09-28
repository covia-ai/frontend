"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AssetHeader } from "@/components/AssetHeader";
import { AssetLoadState } from "@/components/AssetLoadState";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { MetadataViewer } from "@/components/MetadataViewer";
import { OperationCodeSnippets } from "@/components/OperationCodeSnippets";
import { OperationInputForm } from "@/components/OperationInputForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOperationAsset } from "@/hooks/use-operation-asset";
import { useOperationInput } from "@/hooks/use-operation-input";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import {
  validateOperationInput,
  type OperationInputSchema,
} from "@/lib/operation-input";
import { gtmEvent } from "@/lib/utils";
import { useJobExecution } from "@/hooks/use-job-execution";
import { OperationRunResult } from "@/components/execution/OperationRunResult";
import { TypeTile } from "@/components/TypeTile";
import { adapterLook, adapterOfMetadata, OperationSignature } from "@/components/operation-display";

const DiagramViewer = dynamic(
  () =>
    import("@/components/DiagramViewer").then(
      (module) => module.DiagramViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-100 animate-pulse rounded-xl bg-muted" />
    ),
  },
);

// Run-in-place: the last job this page kicked off (streamed inline below the
// form, with a link out to the full job), the validation message and the
// confirmation step.
type RunState = {
  jobId: string | null;
  invocationError: string;
  confirmationRequired: boolean;
};
const IDLE_RUN: RunState = { jobId: null, invocationError: "", confirmationRequired: false };

type OperationViewerProps = {
  assetId: string;
  venueId: string;
  // Fires once when the operation turns out not to exist on the resolved
  // venue — e.g. PublicOperationViewer redirects back to /operations, since
  // a venue-less operation page follows whichever venue is globally selected
  // and has no "correct" venue to fall back to.
  onNotFound?: () => void;
};

export function OperationViewer({
  assetId,
  venueId,
  onNotFound,
}: OperationViewerProps) {
  const { venue, isAuthenticated } = useResolvedVenueContext(venueId);
  const { asset, errorMessage: loadError, notFound, loading: assetLoading } = useOperationAsset(
    venue,
    assetId,
  );

  // Told once, when the operation turns out not to exist — an Effect Event, so
  // a new `onNotFound` identity does not fire it again.
  const reportNotFound = useEffectEvent(() => onNotFound?.());
  useEffect(() => {
    if (notFound) reportNotFound();
  }, [notFound]);
  const schema = useMemo(
    () =>
      asset?.metadata?.operation
        ? ((asset.metadata.operation.input ?? {}) as OperationInputSchema)
        : undefined,
    [asset],
  );
  const inputController = useOperationInput(venue?.venueId, assetId, schema);
  const { execute: executeJob, running: loading } = useJobExecution(venue);

  // Every operation shares one route, so jumping between operations (the
  // command palette, a catalogue link) reuses this component instance. The run
  // state is stored with the operation it belongs to, so the previous
  // operation's result panel and validation state can never show under the new
  // operation's form — a run that completes after the switch stays filed under
  // the operation that started it. `inputController` is already keyed on the
  // asset.
  const runKey = `${venue?.venueId ?? ""}/${assetId}`;
  const [storedRun, setStoredRun] = useState<RunState & { key: string }>({ key: runKey, ...IDLE_RUN });
  const run = storedRun.key === runKey ? storedRun : IDLE_RUN;
  const updateRun = (patch: Partial<RunState>) =>
    setStoredRun((previous) => ({ ...(previous.key === runKey ? previous : IDLE_RUN), ...patch, key: runKey }));

  const operation = asset?.metadata?.operation as any;
  const adapter = adapterOfMetadata(operation);
  const { Icon: AdapterIcon, tile: adapterTile } = adapterLook(adapter);

  const runOperation = async () => {
    if (!asset || !venue) {
      updateRun({ invocationError: "This asset is not an operation and cannot be invoked" });
      return;
    }

    updateRun({ confirmationRequired: false, jobId: null });
    await executeJob({
      action: () => asset.invoke(inputController.input),
      failureTitle: "Unable to run operation",
      onError: (message) => updateRun({ invocationError: message }),
      navigate: false,
      onSuccess: (id) => updateRun({ jobId: id }),
    });
  };

  const requestRun = () => {
    if (!run.confirmationRequired) {
      const validationError = validateOperationInput(
        inputController.input,
        schema,
      );
      if (validationError) {
        updateRun({ invocationError: validationError, confirmationRequired: true });
        return;
      }
    }

    // The asset id, not metadata.name: an operation's name is free text its
    // author chose, and must not travel to an analytics vendor.
    gtmEvent.buttonClick("Invoke Operation", asset?.id || "unknown");
    void runOperation();
  };

  return (
    <ContentLayout>
      <TopBar
        venueId={venueId}
        assetOrJobName={asset?.metadata?.name}
        venueName={venue?.metadata.name}
      />
      <div className="flex flex-col w-full items-center justify-center">
        <AssetLoadState
          loading={assetLoading}
          error={loadError || null}
          notFound={notFound}
          notFoundMessage={`The asset ID "${assetId}" does not exist on this venue.`}
        />

        {asset && <AssetHeader asset={asset} />}

        {asset?.metadata?.operation && (
          <>
            {/* Signature hero — the operation's shape (in → out) at a glance. */}
            <div className="mb-3 flex w-full flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <TypeTile Icon={AdapterIcon} tile={adapterTile} className="size-10" iconSize={20} />
                {adapter && (
                  <span className="font-mono text-xs text-muted-foreground">{adapter} adapter</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <OperationSignature operation={operation} max={8} />
              </div>
            </div>

            <Tabs defaultValue="run" className="w-full">
              <TabsList>
                <TabsTrigger value="run">Run</TabsTrigger>
                <TabsTrigger value="code" data-testid="operation-code-tab">Code</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="run">
                {inputController.ready ? (
                  <OperationInputForm
                    schema={schema}
                    outputSchema={asset.metadata.operation.output}
                    controller={inputController}
                    errorMessage={run.invocationError}
                    loading={loading}
                    confirmationRequired={run.confirmationRequired}
                    isAuthenticated={isAuthenticated}
                    onRun={requestRun}
                    scheduleTarget={
                      venue ? { venue, operation: asset.id, input: inputController.input } : undefined
                    }
                  />
                ) : (
                  <div className="my-2 h-32 w-full animate-pulse rounded-xl bg-muted" />
                )}
                {asset.metadata.operation.steps && (
                  <DiagramViewer metadata={asset.metadata} />
                )}
                {run.jobId && venue && (
                  <div
                    className="mt-4 rounded-xl border bg-card p-4"
                    data-testid="operation-inline-result"
                  >
                    <OperationRunResult
                      jobId={run.jobId}
                      venueId={venue.venueId}
                      jobHref={`/venues/${encodeURIComponent(venue.venueId)}/jobs/${run.jobId}`}
                    />
                  </div>
                )}
              </TabsContent>
              <TabsContent value="code">
                {venue && (
                  <OperationCodeSnippets
                    baseUrl={venue.baseUrl}
                    assetId={asset.id}
                    schema={schema}
                    liveInput={inputController.input}
                  />
                )}
              </TabsContent>
              <TabsContent value="details">
                <MetadataViewer asset={asset} venue={venue} isAuthenticated={isAuthenticated} bare />
              </TabsContent>
            </Tabs>
          </>
        )}
        {asset && !asset.metadata?.operation && (
          <>
            <MetadataViewer asset={asset} venue={venue} isAuthenticated={isAuthenticated} />
            <div className="text-center p-4">
              <p className="text-destructive">
                This asset is not an operation and cannot be executed.
              </p>
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  );
}
