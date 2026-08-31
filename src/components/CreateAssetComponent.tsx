"use client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { TbCircleDashedNumber1, TbCircleDashedNumber3 }from "react-icons/tb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JsonEditor } from "json-edit-react";
import { Button } from "./ui/button";
import { Asset, AssetMetadata, Venue } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { getContentTypeForFile, gtmEvent } from "@/lib/utils";
import { notifyError } from "@/lib/notify";
import { FORM_DIALOG_CLASS, JSON_EDITOR_DIALOG_CLASS, JSON_EDITOR_MAX_WIDTH } from "@/lib/dialog-sizes";
import { AssetMetadataForm } from "@/components/AssetMetadataForm";
import { buildAssetMetadata, EMPTY_ASSET_METADATA_FIELDS } from "@/lib/asset-metadata-form";
import { ACCEPT_ATTRIBUTE, formatMaxUploadSize, isAllowedUploadFile, MAX_UPLOAD_BYTES } from "@/lib/upload-constraints";

export const CreateAssetComponent = ({
    venue: venueProp,
    open: controlledOpen,
    onOpenChange,
    initialFile,
}: {
    venue?: Venue;
    /** Controlled-mode escape hatch for the global drop-to-asset flow — when
     *  provided (with `onOpenChange`), the dialog has no trigger button and
     *  its open state is owned by the caller. Omit both for normal usage. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** A file already validated by the caller (type/size) — jumps straight
     *  to the one-click fast path instead of the manual file picker. */
    initialFile?: File;
}) => {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [jsonData, setJsonData] = useState<any>({});
    const [assetType, setAssetType] = useState("file");
    const [assetJSONData, setAssetJSONData] = useState<any>({});
    const [assetStringData, setAssetStringDate] = useState("");
    const [assetFileData, setAssetFileData] = useState<File | null>(null);
    const [fields, setFields] = useState({ ...EMPTY_ASSET_METADATA_FIELDS });
    const [hash, setHash] = useState("");
    const [baseData, setBaseData] = useState<AssetMetadata>({});
    const [metadataUpdated, setMetadataUpdated] = useState(false);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = useCallback((next: boolean) => {
      if (isControlled) onOpenChange?.(next);
      else setUncontrolledOpen(next);
    }, [isControlled, onOpenChange]);
    const [creating, setCreating] = useState(false);
    const fallbackVenue = useAuthenticatedVenue();
    const venue = venueProp ?? fallbackVenue;

    async function createNewAsset(jsonData: AssetMetadata) {
        if (!venue) return;

        setCreating(true);
        try {
          const asset: Asset = await venue.assets.register(jsonData);
          if (assetType === "string") await asset.putContent(assetStringData);
          if (assetType === "json") await asset.putContent(JSON.stringify(assetJSONData));
          if (assetType === "file") {
            if (!assetFileData) throw new Error("Choose a file before continuing");
            await asset.putContent(assetFileData);
          }
          gtmEvent.createAsset(asset.id);
          setOpen(false);
          router.push(`/venues/${encodeURIComponent(venue.venueId)}/assets/${asset.id}`);
        } catch (error: unknown) {
          gtmEvent.createAssetFailed(
            error instanceof Error ? error.message : undefined,
          );
          notifyError("Unable to create asset", error, venue?.baseUrl);
        } finally {
          setCreating(false);
        }
    }
  
    const getSHA256Hash = async (input: string | ArrayBuffer) => {
      const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", bytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray
        .map((item) => item.toString(16).padStart(2, "0"))
        .join("");
      return hash;
    };
     
    async function uploadContent(_event: React.MouseEvent) {
      try {
        if (assetType === "string") {
          setHash(await getSHA256Hash(assetStringData));
          setFields((current) => ({ ...current, contentType: "text/plain" }));
        } else if (assetType === "json") {
          setHash(await getSHA256Hash(JSON.stringify(assetJSONData)));
          setFields((current) => ({ ...current, contentType: "application/json" }));
        } else if (assetType === "file") {
          if (!assetFileData) throw new Error("Choose a file before continuing");
          setHash(await getSHA256Hash(await assetFileData.arrayBuffer()));
        }
        setStep(2);
      } catch (error: unknown) {
        notifyError("Unable to read file", error);
      }
    }

    function handleFileChange (event: React.ChangeEvent<HTMLInputElement>) {
     const file = event.target.files?.[0];
     if (!file) return;
     // `accept` on the input is advisory only — a user can still pick "All
     // Files" — so the allowlist/size cap are enforced here too, not just
     // via the attribute.
     if (!isAllowedUploadFile(file)) {
       notifyError("Unsupported file type", `"${file.name}" isn't an accepted file type for assets.`);
       event.target.value = "";
       return;
     }
     if (file.size > MAX_UPLOAD_BYTES) {
       notifyError("File too large", `"${file.name}" is over the ${formatMaxUploadSize()} upload limit.`);
       event.target.value = "";
       return;
     }
     const [contentType, encoding] = getContentTypeForFile(file.name);
     setFields((current) => ({
       ...current,
       name: file.name,
       contentType,
       encoding,
     }));

     setAssetFileData(file);
    }

    // Fast path: an already-validated file arrived via `initialFile` (the
    // global drop listener already checked type/size) — compute its hash in
    // the background while the register screen below is already showing
    // (its "computing…" placeholder covers the gap), instead of making the
    // user step through the manual type-choice screen. Runs once per
    // mounted instance; the caller remounts this component (via `key`) for
    // each new drop rather than changing `initialFile` under an existing
    // instance.
    useEffect(() => {
      if (!initialFile) return;
      let cancelled = false;
      (async () => {
        try {
          const [contentType, encoding] = getContentTypeForFile(initialFile.name);
          setFields((current) => ({ ...current, name: initialFile.name, contentType, encoding }));
          setAssetType("file");
          setAssetFileData(initialFile);
          const computedHash = await getSHA256Hash(await initialFile.arrayBuffer());
          if (cancelled) return;
          setHash(computedHash);
        } catch (error: unknown) {
          notifyError("Unable to read file", error);
        }
      })();
      return () => { cancelled = true; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function createMetadata(nextStep: number){

      const metadata = buildAssetMetadata(fields, { sha256: hash });
        if (nextStep > 0) setStep(nextStep)
        setBaseData(metadata)
        if(nextStep ==0)
            createNewAsset(metadata)
      
    
      
    }
  
     useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
       
        // Ctrl/Cmd + K: Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setOpen(true)
      }
      }
  
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setOpen]);
    useEffect(() => {
          if(open == false)
              setStep(1)
      }, [open]);
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
          {!isControlled &&
            <DialogTrigger asChild>
                    <Button data-testid="create-asset-trigger" className="shrink-0 gap-2">
                          <PlusCircledIcon />
                          Create Asset
                    </Button>
            </DialogTrigger>
          }
          {!initialFile &&
          <DialogContent className={FORM_DIALOG_CLASS}>
                <DialogTitle className="flex flex-row items-center space-x-2">
                        <TbCircleDashedNumber1 size={32}></TbCircleDashedNumber1>
                        <Label>Choose Asset Type & Upload Content </Label>
                </DialogTitle>
                      
                        <div className="flex flex-col items-center justify-between space-y-4">
                          <div className="w-full flex flex-row items-center justify-evenly">                                        
                              <Select onValueChange={(value) => setAssetType(value)} defaultValue={assetType}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectLabel>Metadata Type</SelectLabel>
                                    <SelectItem value="file">File</SelectItem>     
                                    <SelectItem value="json">JSON</SelectItem>     
                                    <SelectItem value="string">String</SelectItem>           
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                          </div>
                            {assetType == "file" && <div className="w-full flex flex-row items-center justify-evenly">
                              <Input type="file" required onChange={e => handleFileChange (e)} accept={ACCEPT_ATTRIBUTE}></Input>
                            </div> 
                            }
                            {assetType == "string" && <div className="w-full flex flex-row items-center justify-evenly">
                              <Input required onChange={e => setAssetStringDate(e.target.value)} placeholder="Add string content here"></Input>
                            </div> 
                            }
                            {assetType == "json" && <div className="w-full flex flex-row items-center justify-evenly">
                                  <JsonEditor
                                data={assetJSONData  }
                                setData={ setAssetJSONData }
                                rootName="content"
                                rootFontSize="1em"
                                collapse={2}
                                className="w-full"
                                    />
                                    
                              
                            </div> 
                            }
                              <Button aria-label="upload" role="button" type="button" onClick={(e) => uploadContent(e)}>Upload Content</Button>
                        </div>

          </DialogContent>
          }
          {!!initialFile && step !== 2 && step !== 3 &&
            <DialogContent className={FORM_DIALOG_CLASS}>
                  <DialogTitle className="flex flex-row items-center space-x-2">
                          <TbCircleDashedNumber1 size={32}></TbCircleDashedNumber1>
                          <Label>Register as Asset</Label>
                  </DialogTitle>
                  <div className="flex flex-col space-y-3">
                    <div className="text-sm space-y-1">
                      <div><span className="text-muted-foreground">File: </span>{fields.name}</div>
                      <div><span className="text-muted-foreground">Type: </span>{fields.contentType || "unknown"}</div>
                      <div className="font-mono text-xs break-all">
                        <span className="text-muted-foreground">SHA-256: </span>{hash || "computing…"}
                      </div>
                    </div>
                    <div className="flex flex-row items-center justify-between">
                      <Button aria-label="edit details" role="button" type="button" onClick={(_e) => setStep(2)}>
                        Edit details
                      </Button>
                      <Button
                        aria-label="register asset"
                        role="button"
                        type="button"
                        disabled={creating || !hash}
                        onClick={(_e) => createMetadata(0)}
                      >
                        {creating ? "Registering…" : "Register Asset"}
                      </Button>
                    </div>
                  </div>
            </DialogContent>
          }
          {step == 2 &&
            <DialogContent className={FORM_DIALOG_CLASS}>
                  <DialogTitle>Provide Metadata</DialogTitle>
                  <AssetMetadataForm fields={fields} onChange={setFields} />
                    <div className="flex flex-row items-center justify-between ">
                    <Button aria-label="back" role="button" type="button" onClick={(_e) => setStep(1)}>Go Back</Button>
                    
                    <Button aria-label="edit" role="button" type="button" onClick={(_e) => createMetadata(3)}>Edit </Button>
                    <Button aria-label="create asset" role="button" type="button" disabled={creating} onClick={(_e) => createMetadata(0)}>
                      {creating ? "Creating…" : "Create Asset"}
                    </Button>

                  </div>
            </DialogContent>            
          }
          { step ==3  &&
              <DialogContent className={JSON_EDITOR_DIALOG_CLASS}>
              <DialogTitle className="flex flex-row items-center space-x-2">
                      <TbCircleDashedNumber3 size={32}></TbCircleDashedNumber3>
                      <Label> Edit metadata </Label>

                </DialogTitle>

                { JSON.stringify(jsonData) == "{}"  && <JsonEditor
                                data={ baseData }
                                setData={ setJsonData }
                                rootName="metadata"
                                rootFontSize="1em"
                                collapse={false}
                                maxWidth={JSON_EDITOR_MAX_WIDTH}
                                minWidth="50vw"
                                    />
                              }
                                { JSON.stringify(jsonData) != "{}"  && <JsonEditor
                                data={ jsonData }
                                setData={ setJsonData }
                                rootName="metadata"
                                rootFontSize="1em"
                                collapse={false}
                                maxWidth={JSON_EDITOR_MAX_WIDTH}
                                minWidth="50vw"
                                onChange={({ newValue }) => { setMetadataUpdated(true); return newValue; }}
                                    />
                              }
                  <div className="flex flex-row items-center justify-between ">
                      <Button aria-label="back" role="button" type="button" onClick={(_e) => setStep(2)}>Go Back</Button>
                      {metadataUpdated && <Button aria-label="create asset" role="button" type="button" className="mx-2 w-32" disabled={creating} onClick={() => createNewAsset(jsonData)}>{creating ? "Creating…" : "Create Asset"}</Button>}
                      {!metadataUpdated && <Button aria-label="create asset" role="button" type="button" className="mx-2 w-32" disabled={creating} onClick={() => createNewAsset(baseData)}>{creating ? "Creating…" : "Create Asset"}</Button>}
                
                  </div>
            </DialogContent>
            }
        </Dialog>
    );
};
