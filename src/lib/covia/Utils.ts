import { CoviaError, RunStatus } from './types';

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
/**
 * Utility function to check if job is considered completed
 * @param jobStatus - The status of the job
 * @returns {boolean} - Returns false if job is not completed , else returns true
 */
export function isJobComplete(jobStatus:RunStatus): boolean {
  if(jobStatus == null)
      return false;
  return jobStatus == RunStatus.COMPLETE ? true:false
}
/**
 * Utility function to check if job is considered paused
 * @param jobStatus - The status of the job
 * @returns {boolean} - Returns false if job is not paused , else returns true
 */
export function isJobPaused(jobStatus:RunStatus): boolean {
  if(jobStatus == null)
      return false;
  return jobStatus == RunStatus.PAUSED ? true:false
}
/**
 * Utility function to check if job is considered finished
 * @param jobStatus - The status of the job
 * @returns {boolean} - Returns false if job is not finished , else returns true
 */
export function isJobFinished(jobStatus:RunStatus): boolean {
  if(jobStatus == null)
      return false;

  if (jobStatus == RunStatus.COMPLETE) return true;
  if (jobStatus == RunStatus.FAILED) return true;
  if (jobStatus == RunStatus.REJECTED) return true;
  if (jobStatus== RunStatus.CANCELLED) return true;

  return false;
}
/**
 * Utility function to parse the asset hex from the compelte assetId
 * @param assetId - The complete assetId
 * @returns {string} - Returns the parsed hexIdof the asset
 */
export function getParsedAssetId(assetId: string): string {
  if(assetId.startsWith("did:web")) {
    const parts = assetId.split("/");
    return  parts[parts.length - 1];
  }
  return assetId;
}
/**
 * Utility function to return complete assetId from hex and path
 * @param assetHex - The asset hex
 * @param assetPath - The asset path
 * @returns {string} - Returns the complete assetId
 */
export function getAssetIdFromPath(assetHex: string, assetPath:string): string {
  //Get did from path and append to asset for full id
  const venueDid = decodeURIComponent(assetPath.split("/")[4]);   
  return venueDid+"/a/"+assetHex;
}
export function getAssetIdFromVenueId(assetHex: string, venueId:string): string {
  //Get did from path and append to asset for full id
  return venueId+"/a/"+assetHex;
}

