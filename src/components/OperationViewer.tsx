"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AssetHeader } from "@/components/AssetHeader";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { MetadataViewer } from "@/components/MetadataViewer";
import { OperationInputForm } from "@/components/OperationInputForm";
import { Button } from "@/components/ui/button";
import { useOperationAsset } from "@/hooks/use-operation-asset";
import { useOperationInput } from "@/hooks/use-operation-input";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import {
  validateOperationInput,
  type OperationInputSchema,
} from "@/lib/operation-input";
import { gtmEvent } from "@/lib/utils";

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
};

export function OperationViewer({
  assetId,
  venueId,
}: OperationViewerProps) {
  const router = useRouter();
  const { venue, isAuthenticated } = useResolvedVenueContext(venueId);
  const { asset, errorMessage: loadError, notFound } = useOperationAsset(
    venue,
    assetId,
  );
  const schema = useMemo(
    () =>
      asset?.metadata?.operation
        ? ((asset.metadata.operation.input ?? {}) as OperationInputSchema)
        : undefined,
    [asset],
  );
  const inputController = useOperationInput(venue?.venueId, assetId, schema);
  const [invocationError, setInvocationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  const runOperation = async () => {
    if (!asset || !venue) {
      setInvocationError("This asset is not an operation and cannot be invoked");
      return;
    }

    setLoading(true);
    setInvocationError("");
    setConfirmationRequired(false);
    try {
      const response = await asset.invoke(inputController.input);
      if (response?.id) {
        router.push(
          `/venues/${encodeURIComponent(venue.venueId)}/jobs/${response.id}`,
        );
      } else {
        setInvocationError(
          "The operation completed without returning a job ID",
        );
      }
    } catch (error: unknown) {
      setInvocationError(
        error instanceof Error ? error.message : "Unable to run operation",
      );
    } finally {
      setLoading(false);
    }
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
        assetOrJobName={asset?.metadata?.name}
        venueName={venue?.metadata.name}
      />
      <div className="flex flex-col w-full items-center justify-center">
        {loadError && <ErrorDisplay error={loadError} className="mb-4" />}

        {notFound && (
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Asset Not Found
            </h2>
            <p className="text-muted-foreground">
              The asset ID &quot;{assetId}&quot; does not exist on this venue.
            </p>
          </div>
        )}

        {!notFound && asset && <AssetHeader asset={asset} />}
        {!notFound && asset && <MetadataViewer asset={asset} venue={venue} />}
        {!notFound && asset?.metadata?.operation && (
          <>
            <div className="w-full flex justify-end mb-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSchema((visible) => !visible)}
              >
                {showSchema ? "Hide Schema" : "View Schema"}
              </Button>
            </div>
            {showSchema && (
              <pre className="w-full text-xs bg-muted rounded-md p-4 overflow-x-auto whitespace-pre-wrap break-all mb-2">
                {JSON.stringify(
                  {
                    input: asset.metadata.operation.input,
                    output: asset.metadata.operation.output,
                  },
                  null,
                  2,
                )}
              </pre>
            )}
            {inputController.ready ? (
              <OperationInputForm
                schema={schema}
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
        {!notFound && asset && !asset.metadata?.operation && (
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
