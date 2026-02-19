import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as mime from 'mime-types'
import copy from 'copy-to-clipboard';
import { toast } from "sonner"
import { RunStatus } from "@covia/covialib";
import { sendGTMEvent } from '@next/third-parties/google'

export  const getStatusConfig = (status) => {
    switch(status) {
      case 'ACTIVE':
        return { variant: 'default', className: 'bg-blue-600 hover:bg-blue-700' };
      case 'COMPLETED':
        return { variant: 'default', className: 'bg-green-600 hover:bg-green-700' };
      case 'TERMINATED':
        return { variant: 'destructive', className: '' };
      default:
        return { variant: 'secondary', className: '' };
    }
  };
  
export function getViewerType() {
    
}
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLicenseUrl(licenseName : string) {
  if(licenseName.trim() ==  "CC BY 4.0")
    return "https://creativecommons.org/licenses/by/4.0/"
}
export function getContentTypeForFile(filename: string) {
 
    const mimeType =  mime.contentType(filename);
    const contentType = mimeType.split(';')[0];
    const charset  = mimeType.split(';')[1]?.split("=")[1];
    return [contentType,charset];
}
export function getExecutionTime(date1:string, date2:string) {
  const milliseconds1 = new Date(date1).getTime();
  const milliseconds2 = new Date(date2).getTime();
  const differenceInMilliseconds = milliseconds2 - milliseconds1;
  const differenceInSeconds = differenceInMilliseconds / 1000;
  const differenceInMinutes = differenceInMilliseconds / 60000;
  const differenceInHours = differenceInMilliseconds / 3600000;

  if(differenceInHours > 1)
    return Math.floor(differenceInHours) +" h"
  if(differenceInMinutes > 1)
     return differenceInMinutes +" min";
  if(differenceInSeconds > 1)
      return differenceInSeconds+" s";
  return differenceInMilliseconds+" ms";
}


export function copyDataToClipBoard(entityId:string, message:string) {
         const result = copy(entityId)
          if(result) {
            toast(message)
       }
      }

export function  colourForStatus(status: RunStatus): string {
        switch (status) {
            case RunStatus.COMPLETE:
                return "text-green-600";
            case RunStatus.CANCELLED:
            case RunStatus.REJECTED:
            case RunStatus.INPUT_REQUIRED:
            case RunStatus.AUTH_REQUIRED:
            case RunStatus.TIMEOUT:
            case RunStatus.FAILED:
                return "text-red-600";
            case RunStatus.PENDING:
            case RunStatus.PAUSED:
            case RunStatus.STARTED:
                return "text-blue-600";
            default:
                return "text-gray-600";
        }
    }


export const gtmEvent = {
  // Button clicks
  buttonClick: (buttonName: string, param:string) => {
    sendGTMEvent({
      event: 'button_click',
      button_name: buttonName,
      custom_param : param
    })
  },

  // Page views (for custom page tracking)
  pageView: (pagePath: string, pageTitle: string) => {
    sendGTMEvent({
      event: 'page_view',
      page_path: pagePath,
      page_title: pageTitle,
    })
  },

  // Form submissions
  formSubmit: (formName: string, formId?: string) => {
    sendGTMEvent({
      event: 'form_submit',
      form_name: formName,
      form_id: formId,
    })
  },


  custom: (eventName: string, params?: Record<string, any>) => {
    sendGTMEvent({
      event: eventName,
      ...params,
    })
  },
}