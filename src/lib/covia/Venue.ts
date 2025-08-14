import { CoviaError, VenueOptions, AssetMetadata, JobData, VenueInterface, AssetID } from './types';
import { Asset } from './Asset';
import { Operation } from './Operation';
import { DataAsset } from './DataAsset';
import { fetchWithError } from './Utils';
import { Credentials } from './Credentials';

// Cache for storing asset data
const cache = new Map<AssetID, any>();

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
   * Static method to connect to a venue
   * @param venueId - Can be a HTTP base URL, DNS name, or existing Venue instance
   * @param credentials - Optional credentials for venue authentication
   * @returns {Venue} A new Venue instance configured appropriately
   */
  static connect(venueId: string | Venue, credentials?: Credentials): Venue {
    if (venueId instanceof Venue) {
      // If it's already a Venue instance, return a new instance with the same configuration
      return new Venue({
        baseUrl: venueId.baseUrl,
        venueId: venueId.venueId
      });
    }

    // If it's a string, determine if it's a URL or DNS name
    if (typeof venueId === 'string') {
      let baseUrl: string;
      let venueIdStr: string;

      // Check if it's a valid HTTP/HTTPS URL
      if (venueId.startsWith('http://') || venueId.startsWith('https://')) {
        baseUrl = venueId;
        // Extract venue ID from URL (could be domain name or path)
        try {
          const url = new URL(venueId);
          venueIdStr = url.hostname || url.pathname || 'default';
        } catch {
          venueIdStr = 'default';
        }
      } else {
        // Assume it's a DNS name or venue identifier
        baseUrl = `https://${venueId}`;
        venueIdStr = venueId;
      }

      return new Venue({
        baseUrl,
        venueId: venueIdStr
      });
    }

    throw new CoviaError('Invalid venue ID parameter. Must be a string (URL/DNS) or Venue instance.');
  }

  /**
   * Create a new asset
   * @param assetData - Asset configuration
   * @returns {Promise<Asset>}
   */
  async createAsset(assetData: any): Promise<Asset> {
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
  async getAsset(assetId: AssetID): Promise<Asset> {
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
      // TODO: Do we actually need separate concrete classes?
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