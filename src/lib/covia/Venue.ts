import { CoviaError, VenueOptions, AssetMetadata, JobData, VenueInterface } from './types';
import { Asset } from './Asset';
import { Operation } from './Operation';
import { DataAsset } from './DataAsset';
import { fetchWithError } from './Utils';

// Cache for storing asset data
const cache = new Map<string, any>();

export class Venue implements VenueInterface {
  public baseUrl: string;
  public venueId: string;
  public name: string;
  public metadata: AssetMetadata;

  constructor(options: VenueOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:8080';
    this.venueId = options.venueId || "default";
    this.name = options.venueId || "default";
    this.metadata = {};
  }

  /**
   * Create a new asset
   * @param assetData - Asset configuration
   * @returns {Promise<Asset>}
   */
  async createAsset(assetData: any): Promise<Asset> {
    console.log(assetData);
    const response = await fetchWithError<any>(`${this.baseUrl}/api/v1/assets/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assetData),
    });
    return this.getAsset(response);
  }

  /**
   * Get asset by ID
   * @param assetId - Asset identifier
   * @returns {Promise<Asset>} Returns either an Operation or DataAsset based on the asset's metadata
   */
  async getAsset(assetId: string): Promise<Asset> {
    if (cache.has(assetId)) {
      const cachedData = cache.get(assetId);
      // Determine asset type from metadata and return appropriate concrete class
      if (cachedData.metadata?.operation) {
        return new Operation(assetId, this, cachedData);
      } else {
        return new DataAsset(assetId, this, cachedData);
      }
    } else {
      const data = await fetchWithError<any>(`${this.baseUrl}/api/v1/assets/${assetId}`);
      cache.set(assetId, data);
      
      // Determine asset type from metadata and return appropriate concrete class
      if (data.metadata?.operation) {
        return new Operation(assetId, this, data);
      } else {
        return new DataAsset(assetId, this, data);
      }
    }
  }

  /**
   * Get all assets
   * @returns {Promise<Asset[]>}
   */
  async getAssets(): Promise<Asset[]> {
    const assets: Asset[] = [];
    const assetIds = await fetchWithError<any>(`${this.baseUrl}/api/v1/assets/`);
    console.log(assetIds);
    for (const assetId of assetIds.items) {
      const asset = await this.getAsset(assetId);
      assets.push(asset);
    }
    return assets;
  }

  /**
   * Get all jobs
   * @returns {Promise<JobData[]>}
   */
  async getJobs(): Promise<JobData[]> {
    return fetchWithError<JobData[]>(`${this.baseUrl}/api/v1/jobs`);
  }

  /**
   * Get job by ID
   * @param jobId - Job identifier
   * @returns {Promise<JobData>}
   */
  async getJob(jobId: string): Promise<JobData> {
    return fetchWithError<JobData>(`${this.baseUrl}/api/v1/jobs/${jobId}`);
  }
} 