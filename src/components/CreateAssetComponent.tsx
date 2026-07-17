"use client";
import {
  Dialog,
  DialogClose,
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
import { PlusIcon }from "lucide-react";
import { TbCircleDashedNumber1, TbCircleDashedNumber3 }from "react-icons/tb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { JsonEditor } from "json-edit-react";
import { Button } from "./ui/button";
import { Asset, AssetMetadata, Venue } from "@covia/covia-sdk";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { getContentTypeForFile, getLicenseUrl, gtmEvent } from "@/lib/utils";
import { IconButton } from "./IconButton";
import { toast } from "sonner";

export const CreateAssetComponent = ({sendDataToParent, venue: venueProp}: {sendDataToParent: (status: boolean) => void; venue?: Venue}) => {
    const [step, setStep] = useState(0);
    const [jsonData, setJsonData] = useState<any>({});
    const [assetType, setAssetType] = useState("file");
    const [assetJSONData, setAssetJSONData] = useState<any>({});
    const [assetStringData, setAssetStringDate] = useState("");
    const [assetFileData, setAssetFileData] = useState<File | null>(null);
    const [name, setName] = useState("");
    const [creator, setCreator] = useState("");
    const [description, setDescription] = useState("");
    const [license, setLicense] = useState("")
    const [language, setLanguage] = useState("")
    const [keywords, setKeywords] = useState("")
    const [notes, setNotes] = useState("")
    const [contentType, setContentType] = useState("")
    const [encoding, setEncoding] = useState("")
    const [hash, setHash] = useState("");
    const [baseData, setBaseData] = useState<AssetMetadata>({});
    const [metadataUpdated, setMetadataUpdated] = useState(false);
    const [open, setOpen] = useState(false)
    const fallbackVenue = useAuthenticatedVenue();
    const venue = venueProp ?? fallbackVenue;
    
    async function createNewAsset(jsonData: AssetMetadata) {
        gtmEvent.buttonClick('Create Asset', jsonData.name!);
        if (!venue) return;

        try {
          const asset: Asset = await venue.assets.register(jsonData);
          if (assetType === "string") await asset.putContent(assetStringData);
          if (assetType === "json") await asset.putContent(JSON.stringify(assetJSONData));
          if (assetType === "file") {
            if (!assetFileData) throw new Error("Choose a file before continuing");
            await asset.putContent(assetFileData);
          }
          sendDataToParent(true);
          setStep(1);
        } catch (error: unknown) {
          toast("Unable to create asset", {
            description: error instanceof Error ? error.message : "Please try again.",
          });
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
          setContentType("text/plain");
        } else if (assetType === "json") {
          setHash(await getSHA256Hash(JSON.stringify(assetJSONData)));
          setContentType("application/json");
        } else if (assetType === "file") {
          if (!assetFileData) throw new Error("Choose a file before continuing");
          setHash(await getSHA256Hash(await assetFileData.arrayBuffer()));
        }
        setStep(2);
      } catch (error: unknown) {
        toast("Unable to read file", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
    }

    function handleFileChange (event: React.ChangeEvent<HTMLInputElement>) {
     const file = event.target.files?.[0];
     if (!file) return;
     setName(file.name)
     const [contentType, encoding] = getContentTypeForFile(file.name);
     setContentType(contentType);
     setEncoding(encoding)
     
     setAssetFileData(file);
    }
    
    function createMetadata(nextStep: number){

      const metadata: AssetMetadata = {};
        if(name.length > 0)
            metadata.name = name;
        if(creator.length > 0)
          metadata.creator = creator;
        if(description.length > 0)
          metadata.description = description;
        if(license.length >0 ) 
          metadata.license = {"name": license, "url" : getLicenseUrl(license)};
      
        
        if(keywords.length > 0)
            metadata.keywords = keywords.split(",");
        if(notes.length > 0)
            metadata.additionalInformationnotes = {"notes":[notes]}
        if(hash && hash.length> 0) {
          metadata.content = {
            "sha256" : hash,
          }
          if(contentType && contentType.length >0)
               metadata.content.contentType = contentType
          if(encoding && encoding.length >0)
               metadata.content.encoding = encoding
          if(language && language.length >0)
               metadata.content.inLanguage = language  
          }
        metadata.dateCreated = new Date().toISOString();
        setStep(nextStep)
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
    <div className="h-48 flex flex-center items-center justify-center ">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
                  <IconButton icon={PlusIcon} message="Add new asset" label="Add new asset"></IconButton>
          </DialogTrigger>
          <DialogContent className="bg-card text-card-foreground">
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
            <DialogContent className="bg-card text-card-foreground">
                  <DialogTitle>Provide Metadata</DialogTitle>
                  <div>
                    <Label>Name</Label>
                    <Input defaultValue={name} onChange={e => setName(e.target.value)} placeholder="Name"></Input>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input  onChange={e => setDescription(e.target.value)} placeholder="Description"></Input>
                  </div>
                  <div>
                    <Label>Creator {creator}</Label>
                    <Input defaultValue={creator}  onChange={e => setCreator(e.target.value)} placeholder="Creator"></Input>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input  onChange={e => setNotes(e.target.value)} placeholder="Notes"></Input>
                  </div>
                  <div className="flex flex-row space-x-2 items-center justify-between">
                    <div>
                      <Label>Content Type</Label>
                      <Input defaultValue={contentType} onChange={e => setContentType(e.target.value)} ></Input>
                    </div>
                      <div>
                      <Label>Encoding</Label>
                      <Input defaultValue={encoding} onChange={e => setEncoding(e.target.value)} ></Input>
                    </div>
                  </div>
                  <div>
                    <Label>Keywords <span className="text-xs text-muted-foreground">(comma seperated)</span></Label>
                    <Input  onChange={e => setKeywords(e.target.value)} placeholder="iris, dataset"></Input>
                  </div>
                  <div className="flex flex-row space-x-2 items-center justify-between">
                    <div>
                    <Label>Choose a language</Label>
                    <Select  onValueChange={(value) => setLanguage(value)}>
                    <SelectTrigger> <SelectValue placeholder="Select a language" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                            <SelectItem value="en-us">en-us</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                  </Select>
                  </div>
                  <div>
                  <Label>Choose a license</Label>
                  <Select onValueChange={(value) => setLicense(value)}>
                    <SelectTrigger> <SelectValue placeholder="Select a license" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                            <SelectItem value="CC BY 4.0">CC BY 4.0</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                  </Select>
                  </div>
                  </div>
                    <div className="flex flex-row items-center justify-between ">
                    <Button aria-label="back" role="button" type="button" onClick={(_e) => setStep(1)}>Go Back</Button>
                    
                    <Button aria-label="edit" role="button" type="button" onClick={(_e) => createMetadata(3)}>Edit </Button>
                    <DialogClose>
                      <Button aria-label="create asset" role="button" type="button" onClick={(_e) => createMetadata(0)}>Create Asset</Button>
                    </DialogClose>

                  </div>
            </DialogContent>            
          }
          { step ==3  && 
              <DialogContent className="h-11/12 min-w-10/12 bg-card text-card-foreground">
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
                                maxWidth="90vw"
                                minWidth="50vw"
                                    />
                              }
                                { JSON.stringify(jsonData) != "{}"  && <JsonEditor
                                data={ jsonData }
                                setData={ setJsonData }
                                rootName="metadata"
                                rootFontSize="1em"
                                collapse={false}
                                maxWidth="90vw"
                                minWidth="50vw"
                                onChange={({ newValue }) => { setMetadataUpdated(true); return newValue; }}
                                    />
                              }
                  <div className="flex flex-row items-center justify-between ">
                      <Button aria-label="back" role="button" type="button" onClick={(_e) => setStep(2)}>Go Back</Button>
                    <DialogClose>
                      {metadataUpdated && <Button aria-label="create asset" role="button" type="button" className="mx-2 w-32" onClick={() => createNewAsset(jsonData)}>Create Asset</Button>}
                      {!metadataUpdated && <Button aria-label="create asset" role="button" type="button" className="mx-2 w-32" onClick={() => createNewAsset(baseData)}>Create Asset</Button>}
                      
                    </DialogClose>
                
                  </div>
            </DialogContent>
            }
        </Dialog>
    </div>
    );
};
