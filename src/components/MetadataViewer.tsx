'use client'

import React from "react";
import { Asset } from "@/lib/covia";
import { Calendar, Copy, Copyright, Download, Info, InfoIcon, Tag, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { JsonEditor } from "json-edit-react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { copyDataToClipBoard } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

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
          <Badge variant="secondary" key={index}>{keyword}</Badge>
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
              <span className="font-medium whitespace-nowrap"><strong>{field.label}</strong></span>
            </div>
            <div >
              {field.renderValue ? field.renderValue(value) : value}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const MetadataViewer = ({ asset }: MetadataViewerProps) => {
  const contentURL = asset.getContentURL();
  
  return (
    <div className="text-sm border-1 shadow-md rounded-md border-slate-200 p-2 items-center justify-between min-w-lg w-full">
      <div className="flex flex-row">
        <div className="flex flex-col flex-3 border-r-2 border-slate-200 px-2 ">
          {renderMetadataFields(asset, METADATA_FIELDS)}
        </div>
        <div className="flex flex-col flex-2 px-2 ">
 
          {contentURL && (
            <div className="flex flex-row items-center space-x-2 my-2">
              <Download size={18}></Download>
              <span><strong>Data:</strong></span>
              <span>
                <Link href={contentURL} className="text-secondary underline" download={true}>
                  Download
                </Link>
              </span>
              <span>
                <a href={contentURL + '?inline=true'} 
                target="_blank" rel="noopener noreferrer" className="text-secondary underline" >
                  View
                </a>
              </span>
            </div>
          )}
          <div className="flex flex-row items-center space-x-2">
            <Info size={18}></Info>
            <span><strong>Metadata:</strong></span>
            <span>
              <Dialog>
                <DialogTrigger>
                  <span className="text-secondary underline"> View metadata</span>
                </DialogTrigger>
                <DialogContent>
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
  );
}; 