"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AssetHeader } from "@/components/AssetHeader";
import { AssetLoadState } from "@/components/AssetLoadState";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { MetadataViewer } from "@/components/MetadataViewer";
import { OperationInputForm } from "@/components/OperationInputForm";
import { useOperationAsset } from "@/hooks/use-operation-asset";
import { useOperationInput } from "@/hooks/use-operation-input";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import {
  validateOperationInput,
  type OperationInputSchema,
} from "@/lib/operation-input";
import { gtmEvent } from "@/lib/utils";
import { useJobExecution } from "@/hooks/use-job-execution";

const DiagramViewer = dynamic(
  () =>
    import("@/components/DiagramViewer").then(
      (module) => module.DiagramViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-100 animate-pulse rounded-md bg-muted" />
    ),
  },
);

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

  useEffect(() => {
    if (notFound) onNotFound?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notFound]);
  const schema = useMemo(
    () =>
      asset?.metadata?.operation
        ? ((asset.metadata.operation.input ?? {}) as OperationInputSchema)
        : undefined,
    [asset],
  );
  const inputController = useOperationInput(venue?.venueId, assetId, schema);
  const [invocationError, setInvocationError] = useState("");
  const { execute: executeJob, running: loading } = useJobExecution(venue);
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const runOperation = async () => {
    if (!asset || !venue) {
      setInvocationError("This asset is not an operation and cannot be invoked");
      return;
    }

    setConfirmationRequired(false);
    await executeJob({
      action: () => asset.invoke(inputController.input),
      failureTitle: "Unable to run operation",
      onError: setInvocationError,
    });
  };

  const requestRun = (requiredKeys: string[]) => {
    if (!confirmationRequired) {
      const validationError = validateOperationInput(
        inputController.input,
        requiredKeys,
      );
      if (validationError) {
        setInvocationError(validationError);
        setConfirmationRequired(true);
        return;
      }
    }

    gtmEvent.buttonClick(
      "Invoke Operation",
      asset?.metadata?.name || asset?.id || "unknown",
    );
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
        {asset && <MetadataViewer asset={asset} venue={venue} isAuthenticated={isAuthenticated} />}
        {asset?.metadata?.operation && (
          <>
            {inputController.ready ? (
              <OperationInputForm
                schema={schema}
                outputSchema={asset.metadata.operation.output}
                controller={inputController}
                errorMessage={invocationError}
                loading={loading}
                confirmationRequired={confirmationRequired}
                isAuthenticated={isAuthenticated}
                onRun={requestRun}
              />
            ) : (
              <div className="my-2 h-32 w-full animate-pulse rounded-md bg-muted" />
            )}
            {asset.metadata.operation.steps && (
              <DiagramViewer metadata={asset.metadata} />
            )}
          </>
        )}
        {asset && !asset.metadata?.operation && (
          <div className="text-center p-4">
            <p className="text-destructive">
              This asset is not an operation and cannot be executed.
            </p>
          </div>
        )}
      </div>
    </ContentLayout>
  );
}
