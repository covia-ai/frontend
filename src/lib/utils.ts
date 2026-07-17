import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as mime from 'mime-types'
import copy from 'copy-to-clipboard';
import { toast } from "sonner"
import { sendGTMEvent } from '@next/third-parties/google'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fallback for operation schemas that don't mark a credential field
// `secret: true` — job records are immutable, so an unmasked field here is
// permanent. Complements, never replaces, the schema-driven flag.
// "token" only matches as a field-name suffix (accessToken, apiToken, ...) —
// a bare substring match would also catch legitimate LLM fields like
// maxTokens/inputTokens/tokenCount, which aren't credentials.
const SENSITIVE_FIELD_PATTERN = /api[-_]?key|secret|password|passwd|\bpwd\b|credential|private[-_]?key|authorization|bearer|token$/i;

export function looksLikeSecretField(key: string): boolean {
  return SENSITIVE_FIELD_PATTERN.test(key);
}

export function getLicenseUrl(licenseName : string) {
  if(licenseName.trim() ==  "CC BY 4.0")
    return "https://creativecommons.org/licenses/by/4.0/"
}
export function getContentTypeForFile(filename: string) {
 
    const mimeType =  mime.contentType(filename) || "";
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

// Scannable "3m ago" form for list views — pair with the exact timestamp in
// a tooltip rather than showing it alone, since relative time alone loses
// precision developers need for correlating with logs.
export function formatRelativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString();
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

