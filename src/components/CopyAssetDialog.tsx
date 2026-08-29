"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JsonEditor } from "json-edit-react";
import { Asset, AssetMetadata, Venue } from "@covia/covia-sdk";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { gtmEvent } from "@/lib/utils";
import { notifyError } from "@/lib/notify";
import { FORM_DIALOG_CLASS, JSON_EDITOR_DIALOG_CLASS, JSON_EDITOR_MAX_WIDTH } from "@/lib/dialog-sizes";
import { AssetMetadataForm } from "@/components/AssetMetadataForm";
import { buildAssetMetadata, fieldsFromAssetMetadata } from "@/lib/asset-metadata-form";

interface CopyAssetDialogProps {
  asset: Asset;
  venue?: Venue;
  isAuthenticated: boolean;
}

// Mirrors CreateAssetComponent's "Provide Metadata" -> "Edit metadata" steps
// (relabeled "Review Metadata" here since these fields are prepopulated,
// not entered from scratch)
// (same field set, same two-stage form-then-JSON-review flow), but seeded
// from an existing asset's metadata instead of a fresh upload — there's no
// "choose type & upload content" step first, since the copy starts from
// content that already exists.
export function CopyAssetDialog({ asset, venue, isAuthenticated }: CopyAssetDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "json">("form");

  const [fields, setFields] = useState(() => fieldsFromAssetMetadata(asset.metadata));

  const [baseData, setBaseData] = useState<AssetMetadata>({});
  const [jsonData, setJsonData] = useState<any>({});
  const [metadataUpdated, setMetadataUpdated] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Starts from the original asset's full metadata — including fields the
  // form above doesn't expose (operation, skill, content.sha256/dlfs/
  // inline, ...) — so copying an asset the form has no field for doesn't
  // silently drop it. The form fields below then overlay their edits on
  // top of that clone.
  function buildMetadata(): AssetMetadata {
    return buildAssetMetadata(fields, { base: asset.metadata });
  }

  async function registerCopy(metadata: AssetMetadata) {
    if (!venue) return;
    setRegistering(true);
    try {
      const copiedAsset = await venue.assets.register(metadata);
      gtmEvent.createAsset(copiedAsset.id);
      setOpen(false);
      router.push(`/venues/${encodeURIComponent(venue.venueId)}/assets/${copiedAsset.id}`);
    } catch (error: unknown) {
      gtmEvent.createAssetFailed(
        error instanceof Error ? error.message : undefined,
      );
      notifyError("Unable to copy asset", error, venue.baseUrl);
    } finally {
      setRegistering(false);
    }
  }

  function goToReview() {
    setBaseData(buildMetadata());
    setJsonData({});
    setMetadataUpdated(false);
    setStep("json");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setStep("form");
  }

  if (!venue) return null;

  if (!isAuthenticated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" disabled>
              <Lock size={14} />
              Copy Asset
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Sign in to copy assets</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          <Copy size={14} />
          Copy Asset
        </Button>
      </DialogTrigger>

      {step === "form" && (
        <DialogContent className={FORM_DIALOG_CLASS}>
          <DialogTitle>Review Metadata</DialogTitle>
          <AssetMetadataForm fields={fields} onChange={setFields} />
          <div className="flex flex-row items-center justify-between">
            <DialogClose asChild>
              <Button aria-label="cancel" role="button" type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button aria-label="review" role="button" type="button" onClick={goToReview}>Review JSON</Button>
          </div>
        </DialogContent>
      )}

      {step === "json" && (
        <DialogContent className={JSON_EDITOR_DIALOG_CLASS}>
          <DialogTitle>Edit metadata</DialogTitle>
          {JSON.stringify(jsonData) === "{}" ? (
            <JsonEditor
              data={baseData}
              setData={setJsonData}
              rootName="metadata"
              rootFontSize="1em"
              collapse={false}
              maxWidth={JSON_EDITOR_MAX_WIDTH}
              minWidth="50vw"
            />
          ) : (
            <JsonEditor
              data={jsonData}
              setData={setJsonData}
              rootName="metadata"
              rootFontSize="1em"
              collapse={false}
              maxWidth={JSON_EDITOR_MAX_WIDTH}
              minWidth="50vw"
              onChange={({ newValue }) => { setMetadataUpdated(true); return newValue; }}
            />
          )}
          <div className="flex flex-row items-center justify-between">
            <Button aria-label="back" role="button" type="button" onClick={() => setStep("form")}>Go Back</Button>
            <Button
              aria-label="copy asset"
              data-testid="copy-asset-register"
              role="button"
              type="button"
              className="mx-2 w-32"
              disabled={registering}
              onClick={() => registerCopy(metadataUpdated ? jsonData : baseData)}
            >
              {registering ? "Copying…" : "Copy Asset"}
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
