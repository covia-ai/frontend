import { CoviaError, AssetMetadata, RunStatus, OperationPayload, VenueInterface } from './types';

// Cache for storing asset data
const cache = new Map<string, any>();

export abstract class Asset {
  public id: string;
  public venue: VenueInterface;
  public metadata: AssetMetadata;
  public status?: RunStatus;
  public error?: string;

  constructor(id: string, venue: VenueInterface, metadata: AssetMetadata = {}) {
    this.id = id;
    this.venue = venue;
    this.metadata = metadata;
  }

  /**
   * Get asset metadata
   * @returns {Promise<AssetMetadata>}
   */
  async getMetadata(): Promise<AssetMetadata> {
    try {
      if (cache.has(this.id)) {
        return cache.get(this.id);
      } else {
        const response = await fetch(`${this.venue.baseUrl}/api/v1/assets/${this.id}`);

        if (!response.ok) {
          throw new CoviaError(`Failed to get asset metadata! status: ${response.status}`);
        }
        const data = await response.json();
        cache.set(this.id, data);
        return data;
      }
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        throw new CoviaError(`Failed to get asset metadata: ${(error as Error).message}`);
      }
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
        console.log('Stream finished.');
        break;
      }
      // Process the 'value' (data chunk) here
      console.log('Received chunk:', value);
    }
  }

  /**
   * Upload content to asset
   * @param content - Content to upload
   * @returns {Promise<ReadableStream<Uint8Array> | null>}
   */
  async uploadContent(content: BodyInit): Promise<ReadableStream<Uint8Array> | null> {
    try {
      const response = await fetch(`${this.venue.baseUrl}/api/v1/assets/${this.id}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: content,
      });

      console.log(response);
      if (!response.ok) {
        response.text().then(function (text) {
          console.log(text);
        });
        throw new CoviaError(`Failed to upload content! status: ${response.status}`);
      }
      console.log(response.body);
      return response.body;
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        throw new CoviaError(`Failed to upload content: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get asset content
   * @returns {Promise<ReadableStream<Uint8Array> | null>}
   */
  async getContent(): Promise<ReadableStream<Uint8Array> | null> {
    try {
      const response = await fetch(`${this.venue.baseUrl}/api/v1/assets/${this.id}/content`);

      if (!response.ok) {
        throw new CoviaError(`Failed to get asset content! status: ${response.status}`);
      }
      return response.body;
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        throw new CoviaError(`Failed to get asset content: ${(error as Error).message}`);
      }
    }
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
   * @param payload - Operation parameters
   * @returns {Promise<any>}
   */
  async invoke(payload: OperationPayload): Promise<any> {
    try {
      const invokePayload = {
        assetId: this.id,
        payload: payload,
      };

      const response = await fetch(`${this.venue.baseUrl}/api/v1/invoke/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invokePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        throw new CoviaError(`Operation execution failed: ${errorText}`, status);
      } else {
        return await response.json();
      }
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        this.status = RunStatus.FAILED;
        this.error = (error as Error).message;
        throw new CoviaError(`Operation execution failed: ${(error as Error).message}`);
      }
    }
  }
}

import { Venue } from './Venue'; 