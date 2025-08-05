import { CoviaError, VenueOptions, AssetMetadata, JobData, VenueInterface } from './types';
import { Asset } from './Asset';
import { Operation } from './Operation';
import { DataAsset } from './DataAsset';

// Cache for storing asset data
const cache = new Map<string, any>();

export class Venue implements VenueInterface {
  public baseUrl: string;
  public connected: boolean;
  public venueId: string;
  public name: string;
  public metadata: AssetMetadata;

  constructor(options: VenueOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:8080';
    this.connected = false;
    this.venueId = options.venueId || "default";
    this.name = options.venueId || "default";
    this.metadata = {};
  }

  /**
   * Connect to the venue
   * @returns {Venue}
   */
  connect(): Venue {
    try {
      this.connected = true;
      return this;
    } catch (error) {
      throw new CoviaError(`Failed to connect to venue: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from the venue
   * @returns {boolean}
   */
  disconnect(): boolean {
    try {
      if (this.connected) {
        this.connected = false;
        this.venueId = null as any;
      }
      return true;
    } catch (error) {
      throw new CoviaError(`Failed to disconnect: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new asset
   * @param assetData - Asset configuration
   * @returns {Promise<Asset>}
   */
  async createAsset(assetData: any): Promise<Asset> {
    try {
      console.log(assetData);
      const response = await fetch('http://localhost:8080/api/v1/assets/', {
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
   * @returns {Promise<Asset>}
   */
  async getAsset(assetId: string): Promise<Asset> {
    try {
      if (cache.has(assetId)) {
        return new Asset(assetId, this, cache.get(assetId));
      } else {
        const response = await fetch(`http://localhost:8080/api/v1/assets/${assetId}`);

        if (!response.ok) {
          throw new CoviaError(`Failed to get asset with id: ${assetId}! status: ${response.status}`);
        }
        const data = await response.json();
        cache.set(assetId, data);
        return new Asset(assetId, this, data);
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
   * Get operation by ID
   * @param operationId - Operation identifier
   * @returns {Promise<Operation>}
   */
  async getOperation(operationId: string): Promise<Operation> {
    try {
      if (cache.has(operationId)) {
        return new Operation(operationId, this, cache.get(operationId));
      } else {
        const response = await fetch(`http://localhost:8080/api/v1/assets/${operationId}`);

        if (!response.ok) {
          throw new CoviaError(`Failed to get operation with id: ${operationId}! status: ${response.status}`);
        }
        const data = await response.json();
        cache.set(operationId, data);
        return new Operation(operationId, this, data);
      }
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        throw new CoviaError(`Failed to get operation with id: ${operationId}! ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get data asset by ID
   * @param dataAssetId - Data asset identifier
   * @returns {Promise<DataAsset>}
   */
  async getDataAsset(dataAssetId: string): Promise<DataAsset> {
    try {
      if (cache.has(dataAssetId)) {
        return new DataAsset(dataAssetId, this, cache.get(dataAssetId));
      } else {
        const response = await fetch(`http://localhost:8080/api/v1/assets/${dataAssetId}`);

        if (!response.ok) {
          throw new CoviaError(`Failed to get data asset with id: ${dataAssetId}! status: ${response.status}`);
        }
        const data = await response.json();
        cache.set(dataAssetId, data);
        return new DataAsset(dataAssetId, this, data);
      }
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        throw new CoviaError(`Failed to get data asset with id: ${dataAssetId}! ${(error as Error).message}`);
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
      let response = await fetch('http://localhost:8080/api/v1/assets/');
      console.log(response);
      if (!response.ok) {
        throw new CoviaError(`Failed to fetch assets! status: ${response.status}`);
      }
      let assetIds = await response.json();
      console.log(assetIds);
      assetIds.items.forEach((assetId: string) => {
        assets.push(new Asset(assetId, this));
      });
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
      const response = await fetch('http://localhost:8080/api/v1/jobs');

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
      const response = await fetch(`http://localhost:8080/api/v1/jobs/${jobId}`);

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