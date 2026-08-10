import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as mime from 'mime-types'
import copy from 'copy-to-clipboard';
import { notifySuccess } from "@/lib/notify"
import { sendGTMEvent } from '@next/third-parties/google'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

// Upstream services a venue calls out to (model providers, for one) fail with
// their own JSON error envelope embedded in the venue's message. Surface the
// human-readable message rather than dumping the raw blob at the user.
function embeddedMessage(error: string): string | null {
  const start = error?.indexOf('{') ?? -1;
  if (start === -1) return null;
  try {
    const parsed = JSON.parse(error.slice(start));
    const message = parsed?.error?.message ?? parsed?.message;
    return typeof message === 'string' && message ? message : null;
  } catch {
    return null;
  }
}

export function friendlyError(error: string): { summary: string; detail: string } {
  const lower = error?.toLowerCase() || '';
  let summary = 'Something went wrong';
  if (lower.includes('timeout') || lower.includes('timed out'))
    summary = 'The operation timed out';
  else if (
    lower.includes('401') || lower.includes('unauthorized') ||
    lower.includes('authentication_error') || lower.includes('api key')
  )
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
  return { summary, detail: embeddedMessage(error) ?? error };
}

// "did:key:z6MkmZJJ…TkBR" — middle-elided identifier: first `chars` characters,
// then an ellipsis, then the last 4 (the tail is what humans compare, the head
// names the scheme). Short values pass through unchanged. This is the standard
// elision for DIDs and public keys — render them via components/DidDisplay.
export function abbreviateDid(did: string, chars = 16): string {
  if (did.length <= chars + 5) return did;
  return `${did.slice(0, chars)}…${did.slice(-4)}`;
}

export async function copyDataToClipBoard(entityId: string, message: string) {
  const result = await copy(entityId);
  if (result) {
    notifySuccess(message);
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

  // GA4 recommended sign_up event: https://support.google.com/analytics/answer/9267735
  signUp: (method: string) => {
    sendGTMEvent({
      event: 'sign_up',
      method,
    })
  },

  connectVenue: (venueId: string) => {
    sendGTMEvent({
      event: 'connect_venue',
      venue_id: venueId,
    })
  },

  connectVenueFailed: (venueId: string, reason?: string) => {
    sendGTMEvent({
      event: 'connect_venue_failed',
      venue_id: venueId,
      reason,
    })
  },

  removeVenue: (venueId: string) => {
    sendGTMEvent({
      event: 'remove_venue',
      venue_id: venueId,
    })
  },

  createAsset: (assetName: string) => {
    sendGTMEvent({
      event: 'create_asset',
      asset_name: assetName,
    })
  },

  createAssetFailed: (assetName: string, reason?: string) => {
    sendGTMEvent({
      event: 'create_asset_failed',
      asset_name: assetName,
      reason,
    })
  },

  createAgent: (agentId: string, provider?: string) => {
    sendGTMEvent({
      event: 'create_agent',
      agent_id: agentId,
      provider,
    })
  },

  createAgentFailed: (agentId?: string, reason?: string) => {
    sendGTMEvent({
      event: 'create_agent_failed',
      agent_id: agentId,
      reason,
    })
  },

  deleteAgent: (agentId: string) => {
    sendGTMEvent({
      event: 'delete_agent',
      agent_id: agentId,
    })
  },

  deleteAgentFailed: (agentId: string, reason?: string) => {
    sendGTMEvent({
      event: 'delete_agent_failed',
      agent_id: agentId,
      reason,
    })
  },

  suspendAgent: (agentId: string) => {
    sendGTMEvent({
      event: 'suspend_agent',
      agent_id: agentId,
    })
  },

  suspendAgentFailed: (agentId: string, reason?: string) => {
    sendGTMEvent({
      event: 'suspend_agent_failed',
      agent_id: agentId,
      reason,
    })
  },

  resumeAgent: (agentId: string) => {
    sendGTMEvent({
      event: 'resume_agent',
      agent_id: agentId,
    })
  },

  resumeAgentFailed: (agentId: string, reason?: string) => {
    sendGTMEvent({
      event: 'resume_agent_failed',
      agent_id: agentId,
      reason,
    })
  },

  sendAgentMessage: (agentId: string) => {
    sendGTMEvent({
      event: 'send_agent_message',
      agent_id: agentId,
    })
  },

  sendAgentMessageFailed: (agentId: string, reason?: string) => {
    sendGTMEvent({
      event: 'send_agent_message_failed',
      agent_id: agentId,
      reason,
    })
  },
}

