import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as mime from 'mime-types'
import copy from 'copy-to-clipboard';
import { toast } from "sonner"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseJsonForReactFlow(json:JSON) {
  let initialX=100, initialY=150;
  let initalNode = new Array(), initialEdge = new Array();
  const myMap = new Map(Object.entries(json));
  const outputInputMap = new Map();
  let index=1, YIncrement=200, XPos = initialX, YPos=initialY;
  
  for (const [taskName, task] of myMap) {
            
  
    let nodeJson = {
          id: index+"",
          position: { x: XPos, y: YPos },
          type:'taskNode',
          data: {  label:taskName, inputLabel:task.input, outputLabel:task.output},
    };
    initalNode.push(nodeJson)
    outputInputMap.set(index,task.output);
    
    index = index + 1;
    YPos = YPos + YIncrement;
  }
  
  return initalNode;
}
export function getLicenseUrl(licenseName : string) {
  console.log(licenseName)
  if(licenseName.trim() ==  "CC BY 4.0")
    return "https://creativecommons.org/licenses/by/4.0/"
}
export function getContentTypeForFile(filename: string) {
 
    const mimeType =  mime.contentType(filename);
    const contentType = mimeType.split(';')[0];
    const charset  = mimeType.split(';')[1]?.split("=")[1];
    return [contentType,charset];
}
export function getExecutionTime(date1, date2) {
  const milliseconds1 = new Date(date1).getTime();
  const milliseconds2 = new Date(date2).getTime();
  const differenceInMilliseconds = milliseconds2 - milliseconds1;
  const differenceInSeconds = differenceInMilliseconds / 1000;
  console.log(differenceInSeconds)
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