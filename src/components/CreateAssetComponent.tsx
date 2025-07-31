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
import { PlusCircle, Router, User } from "lucide-react";
import { TbCircleDashedNumber1,  TbCircleDashedNumber2, TbCircleDashedNumber3} from "react-icons/tb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { JsonEditor } from "json-edit-react";
import { Button } from "./ui/button";

import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { Asset } from "@/lib/covia/covialib";
 
import { getContentTypeForFile, getLicenseUrl } from "@/lib/utils";
export const CreateAssetComponent = ({sendDataToParent}) => {
    const [step, setStep] = useState(0);
    const [jsonData, setJsonData] = useState({});
    const [assetType, setAssetType] = useState("file");
    const [assetJSONData, setAssetJSONData] = useState({});
    const [assetStringData, setAssetStringDate] = useState("");
    const [assetFileData, setAssetFileDate] = useState("");
    //Metadata
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
    const [baseData, setBaseData] = useState({});
    const [metadataUpdated, setMetadataUpdated] = useState(false);
    const venue = useStore(useVenue, (x) => x).venue;

    const [open, setOpen] = useState(false)

    if (!venue) return null;
    function createNewAsset(jsonData:JSON) {
        try {
       
          venue?.createAsset(jsonData).then( (asset: Asset) => {
                if(assetType == "string") {
                      asset.uploadContent(assetStringData).then((response) =>{
                      sendDataToParent(true)
                       setStep(1)

                    })
                  
                  }
                  if(assetType == "json") {
                      console.log(JSON.stringify(assetJSONData))
                      asset.uploadContent((JSON.stringify(assetJSONData))).then((response) =>{
                      sendDataToParent(true)
                       setStep(1)
                    })
                  
                  }
                  if(assetType == "file") {
                      asset.uploadContent(assetFileData).then((response) =>{
                      sendDataToParent(true)
                       setStep(1)
                    })
                  
                  }
                  
          })
        }
        catch(error) {
          console.log("Hello "+error)
        }
    }
  
    const getSHA256Hash = async (input) => {
      const textAsBuffer = new TextEncoder().encode(input);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", textAsBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray
        .map((item) => item.toString(16).padStart(2, "0"))
        .join("");
      return hash;
    };
     
    function uploadContent(event) {
       if(assetType == "string" ) {
        getSHA256Hash(assetStringData).then((hash) => {
                setHash(hash)
                setContentType("text/plain")
                setStep(2);  
        });
       
      }
      else if(assetType == "json"   ) {
        getSHA256Hash(JSON.stringify(assetJSONData)).then((hash) => {
        setHash(hash)
        setContentType("application/json")
        setStep(2);  
        });
      }
      else if(assetType == "file" ) {
        getSHA256Hash(assetFileData).then((hash) => {
        setHash(hash)
        setStep(2);  
        });
      }
      else {
        setStep(2)
      }
    }

    function handleFileChange (event) {
     const file = event.target.files[0]; // Get the selected file
     console.log(file.name)
     setName(file.name)
     const [contentType, encoding] = getContentTypeForFile(file.name);
     setContentType(contentType);
     setEncoding(encoding)
     
      if (file) {
      const reader = new FileReader(); // Create a new FileReader object

      reader.onload = (e) => {
        // When the file is loaded, set its content to state
        console.log(typeof(e.target.result))
        setAssetFileDate(e.target.result);
      };

      reader.readAsText(file); // Read the file as text
    }
    }
    
    function createMetadata(nextStep){

      const metadata = {};
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
          if(open == false)
              setStep(1)
      }, [open]);
  return (
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger><PlusCircle size={32} color="#636363"></PlusCircle></DialogTrigger>
                    <DialogContent className="">  
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
                                       <Button type="button" onClick={(e) => uploadContent(e)}>Upload Content</Button>
                                  </div> 
                                          
                    </DialogContent>
                    {step == 2 && 
                      <DialogContent>
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
                              <Label>Keywords <span className="text-xs text-slate-400">(comma seperated)</span></Label>
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
                              <Button type="button" onClick={(e) => setStep(1)}>Go Back</Button>
                              
                              <Button type="button" onClick={(e) => createMetadata(3)}>Edit </Button>
                              <DialogClose>
                                <Button type="button" onClick={(e) => createMetadata(0)}>Create Asset</Button>
                              </DialogClose>

                            </div>
                      </DialogContent>            
                    }
                    { step ==3  && 
                       <DialogContent className="h-11/12 min-w-10/12">
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
                                          onChange={setMetadataUpdated}
                                              />
                                        }
                            <div className="flex flex-row items-center justify-between ">
                                <Button type="button" onClick={(e) => setStep(2)}>Go Back</Button>
                              <DialogClose>
                                {metadataUpdated && <Button type="button" className="mx-2 w-32" onClick={() => createNewAsset(jsonData)}>Create Asset</Button>}
                                {!metadataUpdated && <Button type="button" className="mx-2 w-32" onClick={() => createNewAsset(baseData)}>Create Asset</Button>}
                                
                              </DialogClose>
                          
                            </div>
                      </DialogContent>
                     }
                  </Dialog>
  );
};
