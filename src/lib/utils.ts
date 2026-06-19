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

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

// True for hosts that are reachable only locally (loopback, private ranges,
// mDNS). These default to http with an https fallback; everything else is https.
function hostIsLocal(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "::1" || h === "0.0.0.0") return true;
  if (/^127\./.test(h)) return true;                      // 127.0.0.0/8 loopback
  if (/^10\./.test(h)) return true;                       // 10.0.0.0/8
  if (/^192\.168\./.test(h)) return true;                 // 192.168.0.0/16
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;  // 172.16.0.0/12
  if (/^169\.254\./.test(h)) return true;                 // link-local
  return false;
}

/**
 * Normalise free-text venue input into an ordered list of connection targets
 * to try. Permissive about what users paste — accepts full URLs, did:* ids,
 * bare hostnames, IPs and host:port.
 *
 * Rules:
 *  - did:* and explicit http(s):// inputs are honoured exactly as given.
 *  - schemeless local hosts (localhost, loopback, private IPs) try http then https.
 *  - schemeless public hosts use https only (type http:// to force plain http).
 */
export function normalizeVenueInput(raw: string): string[] {
  const input = (raw ?? "").trim();
  if (!input) return [];

  // DID — pass through untouched.
  if (/^did:/i.test(input)) return [input];

  // Explicit scheme — honour it (lower-case the scheme, drop trailing slashes).
  const scheme = input.match(/^(https?):\/\//i);
  if (scheme) {
    return [stripTrailingSlash(`${scheme[1].toLowerCase()}://${input.slice(scheme[0].length)}`)];
  }

  // Schemeless: isolate the host (drop any path, then the port) to classify it.
  const authority = input.split("/")[0];
  const v6 = authority.match(/^\[([^\]]+)\]/);
  const host = v6 ? v6[1] : authority.split(":")[0];
  const bare = stripTrailingSlash(input);

  return hostIsLocal(host)
    ? [`http://${bare}`, `https://${bare}`]
    : [`https://${bare}`];
}
