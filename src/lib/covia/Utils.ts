  import { CoviaError } from './types';

/**
 * Utility function to handle API calls with consistent error handling
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns {Promise<T>} The response data
 */
export function fetchWithError<T>(url: string, options?: RequestInit): Promise<T> {
  return fetch(url, options)
    .then(response => {
      console.log(response)
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