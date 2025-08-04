'use client'

import { Asset } from "@/lib/covia/covialib";
import { Calendar, Copy, Copyright, Download, Info, InfoIcon, Tag, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { JsonEditor } from "json-edit-react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { copyDataToClipBoard } from "@/lib/utils";

interface MetadataViewerProps {
  assetsMetadata: Asset;
  content?: string;
}

export const MetadataViewer = ({ assetsMetadata, content }: MetadataViewerProps) => {
  return (
    <div className="flex flex-col border-1 shadow-md rounded-md border-slate-200 p-2 items-center justify-between min-w-lg w-full">
      <div className="flex flex-row">
        <div className="flex flex-col min-w-lg border-r-2 border-slate-200 px-2 ">
          {assetsMetadata?.metadata?.creator && (
            <div className="flex flex-row items-center space-x-2 my-2">
              <User size={18}></User>
              <span><strong>Creator:</strong>  </span>
              <span>{assetsMetadata?.metadata?.creator}</span>
            </div>
          )}
          {assetsMetadata?.metadata?.license && (
            <div className="flex flex-row items-center space-x-2 my-2">
              <Copyright size={18}></Copyright>
              <span><strong>License: </strong>  </span>
              <span>
                <Link className="hover:text-secondary hover:underline" href={assetsMetadata?.metadata?.license?.url}>
                  {assetsMetadata?.metadata?.license?.name}
                </Link>
              </span>
            </div>
          )}
          {assetsMetadata?.metadata?.dateCreated && (
            <div className="flex flex-row items-center space-x-2 my-2">
              <Calendar size={18}></Calendar>
              <span><strong>Created on:</strong>  </span>
              <span>{assetsMetadata?.metadata?.dateCreated}</span>
            </div>
          )}
          {assetsMetadata?.metadata?.dateModified && (
            <div className="flex flex-row items-center space-x-2 my-2">
              <Calendar size={18}></Calendar>
              <span><strong>Modified on:</strong>  </span>
              <span>{assetsMetadata?.metadata?.dateModified}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-lg px-2 ">
          {assetsMetadata?.metadata?.keyword && (
            <div className="flex flex-row items-center space-x-2 my-2">
              <Tag size={18}></Tag>
              <span><strong>Keywords:</strong> </span>
              <span className="space-x-2">
                {assetsMetadata?.metadata?.keywords?.map((keyword, index) => (
                  <Badge variant="secondary" key={index}>{keyword}</Badge>
                ))}
              </span>
            </div>
          )}
          {assetsMetadata?.metadata?.additionalInformation?.notes && (
            <div className="flex flex-row items-center space-x-2">
              <InfoIcon size={18}></InfoIcon>
              <span><strong>Comment:</strong></span>
              <span>{assetsMetadata?.metadata?.additionalInformation?.notes}</span>
            </div>
          )}
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
                  <span className="text-secondary underline"> Click to load metadata</span>
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