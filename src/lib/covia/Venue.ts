import { CoviaError, VenueOptions, AssetMetadata, JobData, VenueInterface } from './types';
import { Asset } from './Asset';
import { Operation } from './Operation';
import { DataAsset } from './DataAsset';

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
    try {
      console.log(assetData);
      const response = await fetch(`${this.baseUrl}/api/v1/assets/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assetData),
      });

      if (!response.ok) {
        throw new CoviaError(`Failed to create asset! status: ${response.status}`);
      }
      return this.getAsset(await response.json());
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        throw new CoviaError(`Failed to create asset: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get asset by ID
   * @param assetId - Asset identifier
   * @returns {Promise<Asset>} Returns either an Operation or DataAsset based on the asset's metadata
   */
  async getAsset(assetId: string): Promise<Asset> {
    try {
      if (cache.has(assetId)) {
        const cachedData = cache.get(assetId);
        // Determine asset type from metadata and return appropriate concrete class
        if (cachedData.metadata?.operation) {
          return new Operation(assetId, this, cachedData);
        } else {
          return new DataAsset(assetId, this, cachedData);
        }
      } else {
        const response = await fetch(`${this.baseUrl}/api/v1/assets/${assetId}`);

        if (!response.ok) {
          throw new CoviaError(`Failed to get asset with id: ${assetId}! status: ${response.status}`);
        }
        const data = await response.json();
        cache.set(assetId, data);
        
        // Determine asset type from metadata and return appropriate concrete class
        if (data.metadata?.operation) {
          return new Operation(assetId, this, data);
        } else {
          return new DataAsset(assetId, this, data);
        }
      }
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        throw new CoviaError(`Failed to get asset with id: ${assetId}! ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get all assets
   * @returns {Promise<Asset[]>}
   */
  async getAssets(): Promise<Asset[]> {
    const assets: Asset[] = [];
    try {
      let response = await fetch(`${this.baseUrl}/api/v1/assets/`);
      console.log(response);
      if (!response.ok) {
        throw new CoviaError(`Failed to fetch assets! status: ${response.status}`);
      }
      let assetIds = await response.json();
      console.log(assetIds);
      for (const assetId of assetIds.items) {
        const asset = await this.getAsset(assetId);
        assets.push(asset);
      }
      return assets;
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        throw new CoviaError(`Failed to fetch assets: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get all jobs
   * @returns {Promise<JobData[]>}
   */
  async getJobs(): Promise<JobData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/jobs`);

      if (!response.ok) {
        throw new CoviaError(`Failed to get jobs details! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        throw new CoviaError(`Failed to get jobs details: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get job by ID
   * @param jobId - Job identifier
   * @returns {Promise<JobData>}
   */
  async getJob(jobId: string): Promise<JobData> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/jobs/${jobId}`);

      if (!response.ok) {
        throw new CoviaError(`Failed to get job detail! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        throw new CoviaError(`Failed to get job detail: ${(error as Error).message}`);
      }
    }
  }
} 