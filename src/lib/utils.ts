import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as mime from 'mime-types'
import copy from 'copy-to-clipboard';
import { toast } from "sonner"
import { RunStatus } from "@covia/covia-sdk";
import { sendGTMEvent } from '@next/third-parties/google'

export  const getStatusConfig = (status) => {
    switch(status) {
      case 'ACTIVE':
        return { variant: 'default', className: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' };
      case 'COMPLETED':
        return { variant: 'default', className: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600' };
      case 'TERMINATED':
        return { variant: 'destructive', className: 'dark:bg-red-600 dark:hover:bg-red-700' };
      default:
        return { variant: 'secondary', className: 'dark:bg-gray-600 dark:hover:bg-gray-700' };
    }
  };
  
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

  if(differenceInHours >= 1) {
    const hours = Math.floor(differenceInHours);
    const mins = Math.round((differenceInHours - hours) * 60);
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }
  if(differenceInMinutes >= 1) {
    const mins = Math.floor(differenceInMinutes);
    const secs = Math.round((differenceInMinutes - mins) * 60);
    return secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
  }
  if(differenceInSeconds >= 1)
    return `${Math.round(differenceInSeconds)} sec`;
  return `${Math.round(differenceInMilliseconds)} ms`;
}

// List a venue's MCP tools via its native MCP endpoint (JSON-RPC tools/list).
// Job-free: the invoke-based v/ops/mcp/tools-list persists a job per call.
export async function listMcpTools(baseUrl: string): Promise<any[]> {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  if (!res.ok) throw new Error(`MCP tools/list failed: ${res.status}`);
  const body = await res.json();
  return Array.isArray(body?.result?.tools) ? body.result.tools : [];
}

export function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function friendlyError(error: string): { summary: string; detail: string } {
  const lower = error?.toLowerCase() || '';
  let summary = 'Something went wrong';
  if (lower.includes('timeout') || lower.includes('timed out'))
    summary = 'The operation timed out';
  else if (lower.includes('401') || lower.includes('unauthorized'))
    summary = 'Authentication failed';
  else if (lower.includes('403') || lower.includes('forbidden'))
    summary = 'Access denied';
  else if (lower.includes('404') || lower.includes('not found'))
    summary = 'Resource not found';
  else if (lower.includes('500') || lower.includes('internal server'))
    summary = 'Server error';
  else if (lower.includes('network') || lower.includes('econnrefused') || lower.includes('fetch'))
    summary = 'Connection error';
  else if (lower.includes('parse') || lower.includes('json') || lower.includes('syntax'))
    summary = 'Invalid data format';
  return { summary, detail: error };
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
                return "text-green-600 dark:text-green-400";
            case RunStatus.CANCELLED:
            case RunStatus.REJECTED:
            case RunStatus.INPUT_REQUIRED:
            case RunStatus.AUTH_REQUIRED:
            case RunStatus.TIMEOUT:
            case RunStatus.FAILED:
                return "text-red-600 dark:text-red-400";
            case RunStatus.PENDING:
            case RunStatus.PAUSED:
            case RunStatus.STARTED:
                return "text-blue-600 dark:text-blue-400";
            default:
                return "text-gray-600 dark:text-gray-400";
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

