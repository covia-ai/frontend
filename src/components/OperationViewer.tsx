"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AssetHeader } from "@/components/AssetHeader";
import { AssetLoadState } from "@/components/AssetLoadState";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { TopBar } from "@/components/admin-panel/TopBar";
import { MetadataViewer } from "@/components/MetadataViewer";
import { OperationInputForm } from "@/components/OperationInputForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { FileJson } from "lucide-react";
import { useOperationAsset } from "@/hooks/use-operation-asset";
import { useOperationInput } from "@/hooks/use-operation-input";
import { useResolvedVenueContext } from "@/hooks/use-resolved-venue";
import {
  validateOperationInput,
  type OperationInputSchema,
} from "@/lib/operation-input";
import { cn, gtmEvent } from "@/lib/utils";
import { JSON_EDITOR_DIALOG_CLASS, JSON_EDITOR_MAX_WIDTH } from "@/lib/dialog-sizes";

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

const ThemedJsonEditor = dynamic(
  () => import("@/components/ThemedJsonEditor").then((module) => module.ThemedJsonEditor),
  { ssr: false },
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
  const { asset, errorMessage: loadError, notFound, loading: assetLoading } = useOperationAsset(
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
        <AssetLoadState
          loading={assetLoading}
          error={loadError || null}
          notFound={notFound}
          notFoundMessage={`The asset ID "${assetId}" does not exist on this venue.`}
        />

        {asset && <AssetHeader asset={asset} />}
        {asset && <MetadataViewer asset={asset} venue={venue} />}
        {asset?.metadata?.operation && (
          <>
            <div className="w-full flex justify-end mb-1">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                    <FileJson size={14} />
                    View Schema
                  </Button>
                </DialogTrigger>
                <DialogContent className={cn(JSON_EDITOR_DIALOG_CLASS, "content-start overflow-y-auto")}>
                  <DialogTitle>Operation Schema</DialogTitle>
                  <ThemedJsonEditor
                    data={{
                      input: asset.metadata.operation.input,
                      output: asset.metadata.operation.output,
                    }}
                    rootName="schema"
                    maxWidth={JSON_EDITOR_MAX_WIDTH}
                  />
                </DialogContent>
              </Dialog>
            </div>
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
