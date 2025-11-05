import { CoviaError, AssetMetadata, RunStatus, OperationPayload, VenueInterface, AssetID } from './types';

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
      return Promise.resolve(cache.get(this.id)!);
    } else {
      const data = this.venue.getAssetMetadata(this.id)
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
  uploadContent(content: BodyInit): Promise<ReadableStream<Uint8Array> | null> {
    return this.venue.uploadContentToAsset(content, this.id);
  }

  /**
   * Get asset content
   * @returns {Promise<ReadableStream<Uint8Array> | null>}
   */
  getContent(): Promise<ReadableStream<Uint8Array> | null> {
    return this.venue.getAssetContent(this.id);
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
  run(input: any, userId : string): Promise<any> {

    return this.venue.run(input,userId, this.id);
  }
}

