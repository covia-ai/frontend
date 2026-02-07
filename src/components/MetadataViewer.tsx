'use client'

import React, { useEffect, useState } from "react";
import { Asset } from "@covia-ai/covialib";
import { Calendar, Copy, Copyright, Download, Info, InfoIcon, Tag, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { JsonEditor } from "json-edit-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "./ui/dialog";
import { LucideIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { ScrollBar } from "./ui/scroll-area";
interface MetadataViewerProps {
  asset: Asset;
}

interface MetadataFieldConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  renderValue?: (value: any) => React.ReactNode;
}

const METADATA_FIELDS: MetadataFieldConfig[] = [
  {
    key: 'creator',
    label: 'Creator:',
    icon: User,
    path: 'metadata.creator'
  },
  {
    key: 'license',
    label: 'License:',
    icon: Copyright,
    path: 'metadata.license',
    renderValue: (value) => (
      <Link className="hover:text-secondary hover:underline" href={value?.url}>
        {value?.name}
      </Link>
    )
  },
  {
    key: 'dateCreated',
    label: 'Created on:',
    icon: Calendar,
    path: 'metadata.dateCreated'
  },
  {
    key: 'dateModified',
    label: 'Modified on:',
    icon: Calendar,
    path: 'metadata.dateModified'
  },
  {
    key: 'keywords',
    label: 'Keywords:',
    icon: Tag,
    path: 'metadata.keywords',
    renderValue: (value) => (
      <div className="flex space-x-1">
        {value?.map((keyword: string, index: number) => (
          <Badge variant="secondary" className="text-white dark:bg-muted" key={index}>{keyword}</Badge>
        ))}
      </div>
    )
  },
  {
    key: 'notes',
    label: 'Comment:',
    icon: InfoIcon,
    path: 'metadata.additionalInformation.notes'
  }
];

// Utility function to get nested object values by path
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Utility function to render metadata fields
const renderMetadataFields = (asset: Asset, fields: MetadataFieldConfig[]) => {
  const validFields = fields.filter((field) => {
    const value = getNestedValue(asset, field.path);
    return value;
  });

  if (validFields.length === 0) return null;

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
      {validFields.map((field) => {
        const value = getNestedValue(asset, field.path);
        const IconComponent = field.icon;
         
        return (
          <React.Fragment key={field.key}>
            <div className="flex items-center space-x-2">
              <IconComponent size={18} />
              <span data-testid={field.key+"_label"} className="whitespace-nowrap text-md">{field.label}</span>
            </div>
            <div className="text-card-foreground" data-testid={field.key+"_value"}>
              {field.renderValue ? field.renderValue(value) : value}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const MetadataViewer = ({ asset }: MetadataViewerProps) => {
  const [contentURL, setContentUrl] = useState("");
  const [defaultValue, setDefaultValue] = useState("metadata");

  useEffect(() => { 
  if(asset.metadata.operation != undefined) {
    setContentUrl('NA');
    setDefaultValue('NA');
  }
  else {
    asset.getContent().then((response) => {
    }).catch((error) => {
      console.log(error)
     setContentUrl('NA');
    })
  }
  },[])
  
  return (
     <Accordion
      type="single"
      collapsible
      className=" w-full "
      defaultValue={defaultValue}
    >
       <AccordionItem value="metadata">
         <AccordionTrigger className="py-1 px-2 bg-card rounded-none">Asset Metadata</AccordionTrigger>
         <AccordionContent>
              <div className="text-sm p-2 items-center justify-between min-w-lg w-full">
                <div className="flex flex-col md:flex-row lg:flex-row">
                  <div className="flex flex-col flex-3 md:border-r-2 lg:border-r-2 border-slate-200 px-2 ">
                    {renderMetadataFields(asset, METADATA_FIELDS)}
                  </div>
                  <div className="flex flex-col flex-2 px-2 ">
                    {contentURL &&  contentURL !='NA'  && (
                      <div className="flex flex-row items-center space-x-2 my-2">
                        <Download size={18}></Download>
                        <span className="text-md">Data:</span>
                        <span>
                          <Link href={contentURL} className="text-secondary dark:text-secondary-light underline" download={true}>
                            Download
                          </Link>
                        </span>
                        <span>
                          <a href={contentURL + '?inline=true'} 
                          target="_blank" rel="noopener noreferrer" className="text-secondary dark:text-secondary-light underline" >
                            View
                          </a>
                        </span>
                      </div>
                    )}
                    <div className="flex flex-row items-center space-x-2">
                      <Info size={18}></Info>
                      <span className="text-md">Metadata:</span>
                      <span>
                        <Dialog>
                          <DialogTrigger>
                            <span className="text-card-foreground dark:text-secondary-light underline underline"> View metadata</span>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogTitle>Asset Metadata</DialogTitle>
                            <JsonEditor 
                              data={asset.metadata}
                              rootName="metadata"
                              rootFontSize="1em"
                              maxWidth="120vw"
                              restrictEdit={true}
                              restrictAdd={true}
                              restrictDelete={true}
                              collapse={3}
                            />
                          </DialogContent>
                        </Dialog>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
         
         </AccordionContent>
    </AccordionItem>
    </Accordion>
  );
}; 