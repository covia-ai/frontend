"use client";


import Link from "next/link";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Search } from "@/components/search";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Eraser, PlusCircle, CircleArrowRight, CopyIcon, Save, AlertCircle, CheckCircle2Icon } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

import { Venue,Asset } from "@/lib/covia/covialib";
import { JsonEditor } from "json-edit-react";

import { useStore } from "zustand";
import { useVenue } from "@/hooks/use-venue";
import { TbCircleDashedNumber1,  TbCircleDashedNumber2} from "react-icons/tb";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export default function AssetPage() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const [jsonData, setJsonData] = useState({});
  const [step, setStep] = useState(1);
  const [assetType, setAssetType] = useState("file");
  const [assetJSONData, setAssetJSONData] = useState({});
  const [assetStringData, setAssetStringDate] = useState({});
  const [baseData, setBaseData] = useState({ "name":"",
        "creator":"",
        "description":"",
        "license": {
            "name": "",
            "url": ""
          },
        "inLanguage":"en-GB",
        "keywords":[],
        "additionalInformation":{
          "notes":[""]
        }
  });
  const [assetCreated, setAssetCreated] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Asset[]>([]);
  const [newJsonData, setNewJsonData] = useState({});

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
 
 const handlePageChange = (page: number) => {
    if(page >= 1)
         setCurrentPage(page)
  }
  const venue = useStore(useVenue, (x) => x).venue;
  if (!venue) return null;

    function fetchAssets() {
       setAssetsMetadata([]);
        venue.getAssets().then((assets) => {
           
              assets.forEach((asset : Asset) => {
               asset.getMetadata().then((metadata: Object) => {
                     if(metadata.name != undefined && metadata.operation == undefined)
                      setAssetsMetadata(prevArray => [...prevArray, new Asset(asset.id, asset.venue, metadata)]);
               })
                 
                              
               })
                
          })  
             
    }
    useEffect(() => {
            setAssetsMetadata([]);
            venue.getAssets().then((assets) => {
           
              assets.forEach((asset : Asset) => {
               asset.getMetadata().then((metadata: Object) => {
                     if(metadata.name != undefined && metadata.operation == undefined)
                      setAssetsMetadata(prevArray => [...prevArray, new Asset(asset.id, asset.venue, metadata)]);
               })
                 
                              
               })
                
          })  
      }, []);

  useEffect(() => {
    setTotalItems(assetsMetadata.length)
    setTotalPages(Math.ceil(assetsMetadata.length / itemsPerPage))
  },[assetsMetadata])
        
  function copyAsset(jsonData:JSON) {
    try {
      console.log(jsonData)
      venue?.createAsset(jsonData).then( (asset:Asset) => {
             console.log(asset)
             if(asset != undefined && asset != null) {
                     setNewJsonData({})
                     setAssetCreated(true);
                     fetchAssets();
                     setStep(0)
              }  
      })
    }
    catch(error) {
      setAssetCreated(false);
      console.log(error)
        setStep(0)
    }
  }   
        
  function createNewAsset() {
    try {
      console.log(jsonData)
      venue?.createAsset(jsonData).then( (asset: Asset) => {
            console.log(asset)
             if(asset != undefined && asset != null) {
                     setNewJsonData({})
                    setAssetCreated(true);
                     fetchAssets();
                       setStep(0)
              }
              else {
                setAssetCreated(false);
                  setStep(0)
              }
              
      })
    }
    catch(error) {
      console.log("Hello "+error)
    }
  } 
  function str2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
  async function createHashOfContent(fileContent) {
    try {
        // Use SHA-256 for a strong cryptographic hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', str2ab(fileContent)); 
        
        // Convert the ArrayBuffer hash to a hexadecimal string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        console.log('SHA-256 Hash:', hexHash);
        return hexHash;
        // You can display this hash in the UI or use it for further operations
    } catch (error) {
        console.error('Error creating hash:', error);
        return "";
    }
}  
  function uploadContent() {
 
     if(assetType == "string") {
      createHashOfContent(assetStringData).then((hash) => {
        console.log(hash)
        baseData.content = {
          "sha256" : hash
      }
      console.log(baseData)
      setBaseData(baseData)
      setStep(2);
     });
    }
    
  }
  return (
    <ContentLayout title="Assets">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Assets</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
                            {assetCreated &&  <Alert className="my-4">
                              <CheckCircle2Icon />
                              <AlertTitle>Success! Asset Created</AlertTitle>
                            
                            </Alert>}
          <div className="flex flex-col items-center justify-center">
              <div className="flex flex-row items-center justify-center w-full space-x-2 ">
                <Search/>
                  <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                  <Dialog >
                    <DialogTrigger><PlusCircle size={32} color="#636363"></PlusCircle></DialogTrigger>
                    {step ==1 && <DialogContent className="">  
                          <DialogTitle className="flex flex-row items-center space-x-2">
                                  <TbCircleDashedNumber1 size={32}></TbCircleDashedNumber1>
                                  <Label>Choose Asset Type & Upload Content</Label>
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
                                        <Input type="file" required onChange={e => setAssetStringDate(e.target.value)} accept=".csv,.txt,.json"></Input>
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
                                       <Button type="button" onClick={(e) => uploadContent()}>Upload Content</Button>
                                  </div> 
                                          
                    </DialogContent>}
                    {step == 2 && 
                    <DialogContent className="h-11/12 min-w-10/12">
                        <DialogTitle className="flex flex-row items-center space-x-2">
                                <TbCircleDashedNumber2 size={32}></TbCircleDashedNumber2> 
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
                                          {step ==2 &&  JSON.stringify(jsonData) != "{}"  && <JsonEditor
                                          data={ jsonData }
                                          setData={ setJsonData }
                                          rootName="metadata"
                                          rootFontSize="1em"
                                          collapse={false}
                                          maxWidth="90vw"
                                          minWidth="50vw"
                                              />
                                        }
                          {JSON.stringify(jsonData) != "{}" && <Button type="button" className="mx-2 w-32" onClick={() => createNewAsset()}>Create Asset</Button>}
                          </DialogContent>
                    }
                    
                    </Dialog>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="start" alignOffset={2}>
                          Add New Asset
                    </TooltipContent>
                  </Tooltip>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-center justify-center gap-4">
              {assetsMetadata.slice((currentPage-1)*itemsPerPage, (currentPage-1)*itemsPerPage+itemsPerPage).map((asset, index) => ( 
                  
                   <Card key={index} className="px-2  shadow-md bg-slate-100 flex flex-col rounded-md  hover:-translate-1 hover:shadow-xl ">
                        <CardTitle  className="px-2 flex flex-row items-center justify-between">

                        <div>{asset.metadata.name}</div>
                        <Dialog>
                                 <DialogTrigger><CopyIcon></CopyIcon></DialogTrigger>
                                 <DialogContent className="h-11/12 min-w-10/12 ">
                                  <DialogTitle className="flex flex-row items-center justify-between mr-4">
                                      Copy asset 
                                       <DialogClose>
                                        {JSON.stringify(newJsonData) != "{}" && 
                                        <Button type="button" onClick={() => copyAsset(newJsonData)}> <Save></Save></Button>
                                       }
                                        {JSON.stringify(newJsonData) == "{}" && 
                                          <Button type="button" disabled><Save></Save></Button>
                                      }
                                     
                                     </DialogClose>
                                  </DialogTitle>
                                       {Object.keys(newJsonData).length ==0 && <JsonEditor data={asset.metadata}
                                        setData={setNewJsonData}
                                        rootName="metadata"
                                        rootFontSize="1em"
                                        collapse={1}
                                        maxWidth="90vw"
                                     /> }
                                        {Object.keys(newJsonData).length > 0 && <JsonEditor data={newJsonData}
                                        setData={setNewJsonData}
                                        rootName="metadata"
                                        rootFontSize="1em"
                                        collapse={1}
                                        maxWidth="90vw"
                                        /> }     
                                 </DialogContent>
                        </Dialog>
                        </CardTitle>
                        <CardContent className="flex flex-col px-2"> 
                                <div className="text-xs text-slate-600 line-clamp-1">{asset.metadata.description}</div>
                                <div className="flex flex-row mt-4 space-x-2">
                                  {asset.metadata?.keywords?.map((keyword,index) => (
                                        
                                        index <2 && <Badge className="text-xs"  key={index}>{keyword}</Badge>
                                  ))}
                                </div>
                                <div className="flex flex-row items-center justify-between mt-4">
                                    <CircleArrowRight onClick={() => {redirect("/venues/default/assets/"+asset.id)}}/>
                                </div>
                          </CardContent>
                    </Card>           
                         
                 ))}
             
             </div>
              <Pagination>
              <PaginationContent className="mt-8">
                {currentPage != 1 && <PaginationItem>
                  <PaginationPrevious href="#" onClick={() => handlePageChange(currentPage - 1)}/>
                </PaginationItem>}
                {currentPage != totalPages && currentPage < totalPages && <PaginationItem>
                  <PaginationNext href="#" onClick={() => handlePageChange(currentPage + 1)} />
                </PaginationItem>}
              </PaginationContent>
            </Pagination>
          </div>
    </ContentLayout>
  );
}