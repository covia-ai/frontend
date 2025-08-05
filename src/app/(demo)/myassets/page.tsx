"use client";


import Link from "next/link";

import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Search } from "@/components/search";
import { PlusCircle, X, Upload,  CircleArrowRight, Edit2, Save, Eraser} from "lucide-react";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  
} from "@/components/ui/tooltip";

import { Toaster, toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {  useRouter, useSearchParams } from 'next/navigation'


import { JsonEditor } from 'json-edit-react'
import { Venue } from "@/lib/covia";
import { DialogClose } from "@radix-ui/react-dialog";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
 
export default function AssetPage() {
  const router = useRouter();

  const { data: session } = useSession();
  if (!session?.user) {
      router.push("/signUp");
  }
  const searchParams = useSearchParams()
  const search = searchParams.get('search');
  const baseData = {
    "name":"",
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
  };
  const [jsonData, setJsonData] = useState({});


  function createAsset() {
     const venue = new Venue();
     venue.createAsset(jsonData).then((asset) => {
         if(asset) {
           router.push("/assets");
         }
     });
  }
  return (
    <ContentLayout title="Assets">
      <SmartBreadcrumb />
        <div className="flex flex-col items-center justify-center">
                    <div className="flex flex-row items-center justify-center w-full space-x-2 ">
                        <Search></Search>  
                        <Toaster />
                        <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                        <Dialog >
                          <DialogTrigger><PlusCircle size={32} color="#636363"></PlusCircle></DialogTrigger>
                          <DialogContent className="h-11/12 min-w-10/12 my-2">
                               <DialogTitle className="">
                                      Create asset
                                      <div className="flex flex-row-reverse ">
                                         <DialogClose>
                                              {JSON.stringify(jsonData) != "{}" && 
                                              <Button type="button" className="mx-2" onClick={() => createAsset()}> <Save></Save></Button>
                                            }
                                              {JSON.stringify(jsonData) == "{}" && 
                                                <Button type="button" className="mx-2" disabled><Save></Save></Button>
                                            }
                                          </DialogClose>
                                          <Button type="button" className="mx-2" onClick={() => setJsonData({})}><Eraser></Eraser></Button>
                                     
                                     </div>
                                     
                                  </DialogTitle>
                                              {JSON.stringify(jsonData) == "{}"  && <JsonEditor
                                                data={ baseData }
                                                setData={ setJsonData }
                                                rootName="metadata"
                                                rootFontSize="1em"
                                                collapse={false}
                                                maxWidth="90vw"
                                                minWidth="50vw"
                                                   />
                                              }
                                               {JSON.stringify(jsonData) != "{}"  && <JsonEditor
                                                data={ jsonData }
                                                setData={ setJsonData }
                                                rootName="metadata"
                                                rootFontSize="1em"
                                                collapse={false}
                                                maxWidth="90vw"
                                                minWidth="50vw"
                                                   />
                                              }
                                              <Input type="file"></Input>
                          </DialogContent>
                          </Dialog>
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" alignOffset={2}>
                                Add New Asset
                          </TooltipContent>
                        </Tooltip>
                    </div>
               
        </div>
    </ContentLayout>
  );
}
