"use client";



import { ContentLayout } from "@/components/admin-panel/content-layout";
import { SmartBreadcrumb } from "@/components/ui/smart-breadcrumb";
import { Dialog, DialogContent, DialogTitle, DialogTrigger }from "@/components/ui/dialog";

import { PlusCircle, Save, Eraser }from "lucide-react";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  
} from "@/components/ui/tooltip";

import { Toaster }from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {  useRouter, useSearchParams } from 'next/navigation'


import { JsonEditor } from 'json-edit-react'
import { DialogClose } from "@radix-ui/react-dialog";
import { useAuthStore } from "@/hooks/use-auth";
import { useAuthenticatedVenue } from "@/hooks/use-authenticated-venue";
import { Input } from "@/components/ui/input";

export default function AssetPage() {
  const router = useRouter();

  const auth = useAuthStore((x) => x.auth);
  if (!auth) {
      router.push("/signUp");
  }
  const venue = useAuthenticatedVenue();
  const searchParams = useSearchParams()
  const _search = searchParams.get('search');
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
  const [jsonData, setJsonData] = useState<any>({});


  function createAsset() {
     if (!venue) {
       router.push("/signUp");
       return;
     }
     venue.assets.register(jsonData).then((asset) => {
         if(asset) {
           router.push("/assets");
         }
     });
  }
  return (
    <ContentLayout>
      <SmartBreadcrumb />
        <div className="flex flex-col items-center justify-center">
                    <div className="flex flex-row items-center justify-center w-full space-x-2 ">
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
