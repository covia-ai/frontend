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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getLicenseUrl, gtmEvent } from "@/lib/utils";
import { notifyError } from "@/lib/notify";
import { FORM_DIALOG_CLASS, JSON_EDITOR_DIALOG_CLASS, JSON_EDITOR_MAX_WIDTH } from "@/lib/dialog-sizes";

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

  const [name, setName] = useState(asset.metadata?.name ?? "");
  const [description, setDescription] = useState(asset.metadata?.description ?? "");
  const [creator, setCreator] = useState(asset.metadata?.creator ?? "");
  const [notes, setNotes] = useState(
    Array.isArray(asset.metadata?.additionalInformation?.notes)
      ? asset.metadata.additionalInformation.notes.join(", ")
      : ""
  );
  const [keywords, setKeywords] = useState(
    Array.isArray(asset.metadata?.keywords) ? asset.metadata.keywords.join(", ") : ""
  );
  const [contentType, setContentType] = useState(asset.metadata?.content?.contentType ?? "");
  const [encoding, setEncoding] = useState(asset.metadata?.content?.encoding ?? "");
  const [language, setLanguage] = useState(asset.metadata?.content?.inLanguage ?? "");
  const [license, setLicense] = useState(asset.metadata?.license?.name ?? "");

  const [baseData, setBaseData] = useState<AssetMetadata>({});
  const [jsonData, setJsonData] = useState<any>({});
  const [metadataUpdated, setMetadataUpdated] = useState(false);

  // Starts from the original asset's full metadata — including fields the
  // form above doesn't expose (operation, skill, content.sha256/dlfs/
  // inline, ...) — so copying an asset the form has no field for doesn't
  // silently drop it. The form fields below then overlay their edits on
  // top of that clone.
  function buildMetadata(): AssetMetadata {
    const merged: AssetMetadata = { ...asset.metadata };

    if (name.trim()) merged.name = name.trim();
    else delete merged.name;

    if (description.trim()) merged.description = description.trim();
    else delete merged.description;

    if (creator.trim()) merged.creator = creator.trim();
    else delete merged.creator;

    if (keywords.trim()) merged.keywords = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    else delete merged.keywords;

    if (notes.trim()) {
      merged.additionalInformation = { ...merged.additionalInformation, notes: [notes.trim()] };
    } else if (merged.additionalInformation) {
      const { notes: _notes, ...rest } = merged.additionalInformation;
      merged.additionalInformation = Object.keys(rest).length > 0 ? rest : undefined;
    }

    if (license.trim()) merged.license = { name: license, url: getLicenseUrl(license) };
    else delete merged.license;

    if (contentType.trim() || encoding.trim() || language.trim()) {
      merged.content = { ...merged.content };
      if (contentType.trim()) merged.content.contentType = contentType.trim();
      if (encoding.trim()) merged.content.encoding = encoding.trim();
      if (language.trim()) merged.content.inLanguage = language.trim();
    }

    merged.dateCreated = new Date().toISOString();
    delete merged.dateModified;
    return merged;
  }

  async function registerCopy(metadata: AssetMetadata) {
    if (!venue) return;
    try {
      const copiedAsset = await venue.assets.register(metadata);
      gtmEvent.createAsset(metadata.name ?? copiedAsset.id);
      setOpen(false);
      router.push(`/venues/${encodeURIComponent(venue.venueId)}/assets/${copiedAsset.id}`);
    } catch (error: unknown) {
      gtmEvent.createAssetFailed(
        metadata.name ?? "unknown",
        error instanceof Error ? error.message : undefined,
      );
      notifyError("Unable to copy asset", error, venue.baseUrl);
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
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>
          <div>
            <Label>Creator</Label>
            <Input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Creator" />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
          </div>
          <div className="flex flex-row space-x-2 items-center justify-between">
            <div>
              <Label>Content Type</Label>
              <Input value={contentType} onChange={(e) => setContentType(e.target.value)} />
            </div>
            <div>
              <Label>Encoding</Label>
              <Input value={encoding} onChange={(e) => setEncoding(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Keywords <span className="text-xs text-muted-foreground">(comma separated)</span></Label>
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="iris, dataset" />
          </div>
          <div className="flex flex-row space-x-2 items-center justify-between">
            <div>
              <Label>Choose a language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue placeholder="Select a language" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="en-us">en-us</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Choose a license</Label>
              <Select value={license} onValueChange={setLicense}>
                <SelectTrigger><SelectValue placeholder="Select a license" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="CC BY 4.0">CC BY 4.0</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
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
              onClick={() => registerCopy(metadataUpdated ? jsonData : baseData)}
            >
              Copy Asset
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
