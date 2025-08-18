import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as mime from 'mime-types'
import copy from 'copy-to-clipboard';
import { toast } from "sonner"

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