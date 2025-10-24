  import { CoviaError, JobData, RunStatus } from './types';
import { Venue } from './Venue';

/**
 * Utility function to handle API calls with consistent error handling
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns {Promise<T>} The response data
 */
export function fetchWithError<T>(url: string, options?: RequestInit): Promise<T> {
  return fetch(url, options)
    .then(response => {
      if (!response.ok) {
        throw new CoviaError(`Request failed! status: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      throw error instanceof CoviaError
        ? error
        : new CoviaError(`Request failed: ${(error as Error).message}`);
    });
}

/**
 * Utility function to handle fetch requests that return streams
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
export function fetchStreamWithError(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, options)
    .then(response => {
      if (!response.ok) {
        throw new CoviaError(`Request failed! status: ${response.status}`);
      }
      return response;
    })
    .catch(error => {
      throw error instanceof CoviaError
        ? error
        : new CoviaError(`Request failed: ${(error as Error).message}`);
    });
} 

export function isJobComplete(jobData:JobData) {
  if(jobData.status == null)
      return false;
  return jobData.status == RunStatus.COMPLETE ? true:false
}

export function isJobPaused(jobData:JobData) {
  if(jobData.status == null)
      return false;
  return jobData.status == RunStatus.PAUSED ? true:false
}

export function isJobFinished(jobData:JobData) {
  if(jobData.status == null)
      return false;

  if (jobData.status == RunStatus.COMPLETE) return true;
  if (jobData.status == RunStatus.FAILED) return true;
  if (jobData.status == RunStatus.REJECTED) return true;
  if (jobData.status == RunStatus.CANCELLED) return true;

  return false;
}
export function getParsedAssetId(assetId: string) {
  if(assetId.startsWith("did:web")) {
    const parts = assetId.split("/");
    return  parts[parts.length - 1];
  }
  return assetId;
}
export function getCompleteAssetId(assetHex: string, assetPath:string) {
  //Get did from path and append to asset for full id
  const venueDid = decodeURIComponent(assetPath.split("/")[4]);   
  return venueDid+":"+assetHex;
}
