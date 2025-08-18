import { CoviaError, AssetMetadata, RunStatus, OperationPayload, VenueInterface, AssetID } from './types';
import { fetchWithError, fetchStreamWithError } from './Utils';

// Cache for storing asset data
const cache = new Map<AssetID, AssetMetadata>();

export abstract class Asset {
  public id: AssetID;
  public venue: VenueInterface;
  public metadata: AssetMetadata;
  public status?: RunStatus;
  public error?: string;

  constructor(id: AssetID, venue: VenueInterface, metadata: AssetMetadata = {}) {
    this.id = id;
    this.venue = venue;
    this.metadata = metadata;
  }

  /**
   * Get asset metadata
   * @returns {Promise<AssetMetadata>}
   */
  async getMetadata(): Promise<AssetMetadata> {
    if (cache.has(this.id)) {
      return cache.get(this.id)!;
    } else {
      const data = await fetchWithError<AssetMetadata>(`${this.venue.baseUrl}/api/v1/assets/${this.id}`);
      if (data) {
        cache.set(this.id, data);
      }
      return data;
    }
  }

  /**
   * Read stream from asset
   * @param reader - ReadableStreamDefaultReader
   */
  async readStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      // Process the 'value' (data chunk) here
    }
  }

  /**
   * Upload content to asset
   * @param content - Content to upload
   * @returns {Promise<ReadableStream<Uint8Array> | null>}
   */
  async uploadContent(content: BodyInit): Promise<ReadableStream<Uint8Array> | null> {
    const response = await fetchStreamWithError(`${this.venue.baseUrl}/api/v1/assets/${this.id}/content`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: content,
    });

    return response.body;
  }

  /**
   * Get asset content
   * @returns {Promise<ReadableStream<Uint8Array> | null>}
   */
  async getContent(): Promise<ReadableStream<Uint8Array> | null> {
    const response = await fetchStreamWithError(`${this.venue.baseUrl}/api/v1/assets/${this.id}/content`);
    return response.body;
  }

  /**
   * Get the URL for downloading asset content
   * @returns {string} The URL for downloading the asset content
   */
  getContentURL(): string {
    return `${this.venue.baseUrl}/api/v1/assets/${this.id}/content`;
  }

  /**
   * Execute the operation
   * @param input - Operation input parameters
   * @returns {Promise<any>}
   */
  async run(input: Record<string, any>): Promise<any> {
    const payload = {
      operation: this.id,
      input: input
    };

    try {
      return await fetchWithError<any>(`${this.venue.baseUrl}/api/v1/invoke/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      this.status = RunStatus.FAILED;
      this.error = (error as Error).message;
      throw error;
    }
  }
}

import { Venue } from './Venue'; 