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
import { useEffect, useState } from "react";
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

export const CreateAssetComponent = ({venue: venueProp}: {venue?: Venue}) => {
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
    const [open, setOpen] = useState(false)
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
     const [contentType, encoding] = getContentTypeForFile(file.name);
     setFields((current) => ({
       ...current,
       name: file.name,
       contentType,
       encoding,
     }));
     
     setAssetFileData(file);
    }
    
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
    }, []);
    useEffect(() => {
          if(open == false)
              setStep(1)
      }, [open]);
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
                  <Button data-testid="create-asset-trigger" className="shrink-0 gap-2">
                        <PlusCircledIcon />
                        Create Asset
                  </Button>
          </DialogTrigger>
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
                              <Input type="file" required onChange={e => handleFileChange (e)} accept=".csv,.txt,.json"></Input>
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
