'use client'

import { Asset } from "@/lib/covia/covialib";
import { Calendar, Copy, Copyright, Download, Info, InfoIcon, Tag, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { JsonEditor } from "json-edit-react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { copyDataToClipBoard } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetadataViewerProps {
  assetsMetadata: Asset;
  content?: string;
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
      <div className="space-x-1">
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
const renderMetadataFields = (assetsMetadata: Asset, fields: MetadataFieldConfig[]) => {
  return fields.map((field) => {
    const value = getNestedValue(assetsMetadata, field.path);
    
    if (!value) return null;
    
    const IconComponent = field.icon;
    
    return (
      <div key={field.key} className="flex flex-row items-center space-x-2 my-1">
        <IconComponent size={18} />
        <span><strong>{field.label}</strong></span>
        <span>
          {field.renderValue ? field.renderValue(value) : value}
        </span>
      </div>
    );
  });
};

export const MetadataViewer = ({ assetsMetadata, content }: MetadataViewerProps) => {
  return (
    <div className="border-1 shadow-md rounded-md border-slate-200 p-2 items-center justify-between min-w-lg w-full">
      <div className="flex flex-row">
        <div className="flex flex-col flex-3 border-r-2 border-slate-200 px-2 ">
          {renderMetadataFields(assetsMetadata, METADATA_FIELDS)}
        </div>
        <div className="flex flex-col flex-2 px-2 ">
 
          {content?.length > 0 && (
            <div className="flex flex-row items-center space-x-2 my-2">
              <Download size={18}></Download>
              <span><strong>Data:</strong></span>
              <span>
                <Link href={content} className="text-secondary underline" >
                  Click to download content
                </Link>
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
                  
                    data={assetsMetadata?.metadata}
                    rootName="metadata"
                    rootFontSize="1em"
                    maxWidth="90vw"
                    restrictEdit={true}
                    restrictAdd={true}
                    restrictDelete={true}
                    collapse={1}
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