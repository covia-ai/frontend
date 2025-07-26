// Type definitions
interface VenueOptions {
  baseUrl?: string;
  venueId?: string;
}

interface AssetData {
  [key: string]: any;
}

interface JobData {
  [key: string]: any;
}

interface InvokePayload {
  [key: string]: any;
}

interface AssetMetadata {
  [key: string]: any;
}

interface JobsResponse {
  items: string[];
  [key: string]: any;
}

// Cache for storing asset data
const cache = new Map<string, AssetMetadata>();

// Custom error class
class CoviaError extends Error {
  public code: number | null;
  
  constructor(message: string, code: number | null = null) {
    super(message);
    this.name = 'CoviaError';
    this.code = code;
    this.message = message;
  }
}

// Run status enum
enum RunStatus {
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
  PENDING = "PENDING",
  STARTED = "STARTED"
}

// Asset class
class Asset {
  public id: string;
  public venue: Venue;
  public metadata: AssetMetadata;
  public status?: RunStatus;
  public error?: string;

  constructor(id: string, venue: Venue, metadata: AssetMetadata = {}) {
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
        return cache.get(this.id)!;
      } else {
        const response = await fetch(`http://localhost:8080/api/v1/assets/${this.id}`);
      
        if (!response.ok) {
          throw new CoviaError(`Failed to get asset metadata! status: ${response.status}`);
        }
        const data: AssetMetadata = await response.json();
        cache.set(this.id, data);
        return data;
      }
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new CoviaError(`Failed to get asset metadata: ${errorMessage}`);
      }
    }
  }

  /**
   * Read stream data
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
      const response = await fetch(`http://localhost:8080/api/v1/assets/${this.id}/content`, {
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new CoviaError(`Failed to upload content: ${errorMessage}`);
      }
    }
  }

  /**
   * Get asset content
   * @returns {Promise<ReadableStream<Uint8Array> | null>}
   */
  async getContent(): Promise<ReadableStream<Uint8Array> | null> {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/assets/${this.id}/content`);
      
      if (!response.ok) {
        throw new CoviaError(`Failed to get asset content! status: ${response.status}`);
      }
      return response.body;
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new CoviaError(`Failed to get asset content: ${errorMessage}`);
      }
    }
  }

  /**
   * Execute the operation
   * @param payload - Operation parameters
   * @returns {Promise<any>}
   */
  async invoke(payload: InvokePayload): Promise<any> {
    try {
      const response = await fetch('http://localhost:8080/api/v1/invoke/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
        this.error = error instanceof Error ? error.message : 'Unknown error';
        throw new CoviaError(`Operation execution failed: ${this.error}`);
      }
    }
  }
}

// Operation class extends Asset
class Operation extends Asset {
  constructor(id: string, venue: Venue, metadata: AssetMetadata) {
    super(id, venue, metadata);
  }
}

// Venue class
class Venue {
  public baseUrl: string;
  public connected: boolean;
  public venueId: string | null;
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new CoviaError(`Failed to connect to venue: ${errorMessage}`);
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
        this.venueId = null;
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new CoviaError(`Failed to disconnect: ${errorMessage}`);
    }
  }

  /**
   * Create a new asset
   * @param assetData - Asset configuration
   * @returns {Promise<Asset>}
   */
  async createAsset(assetData: AssetData): Promise<Asset> {
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
      const responseData = await response.json();
      return this.getAsset(responseData);
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new CoviaError(`Failed to create asset: ${errorMessage}`);
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
        return new Asset(assetId, this, cache.get(assetId)!);
      } else {
        const response = await fetch(`http://localhost:8080/api/v1/assets/${assetId}`);
      
        if (!response.ok) {
          throw new CoviaError(`Failed to get asset with id: ${assetId}! status: ${response.status}`);
        }
        const data: AssetMetadata = await response.json();
        cache.set(assetId, data);
        return new Asset(assetId, this, data);
      }
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new CoviaError(`Failed to get asset with id: ${assetId}! ${errorMessage}`);
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
      const response = await fetch('http://localhost:8080/api/v1/assets/');
      console.log(response);
      if (!response.ok) {
        throw new CoviaError(`Failed to fetch assets! status: ${response.status}`);
      }
      const assetIds: JobsResponse = await response.json();
      console.log(assetIds);
      assetIds.items.forEach((assetId: string) => {
        assets.push(new Asset(assetId, this));
      });
      return assets;
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new CoviaError(`Failed to fetch assets: ${errorMessage}`);
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new CoviaError(`Failed to get jobs details: ${errorMessage}`);
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
      return await response.json();
    } catch (error) {
      if (error instanceof CoviaError) {
        throw error;
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new CoviaError(`Failed to get job detail: ${errorMessage}`);
      }
    }
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Venue, Asset, Operation, CoviaError, RunStatus };
} else {
  // Export for browser
  (window as any).VenueClient = { Venue, Asset, Operation, CoviaError, RunStatus };
}

// TypeScript exports
export { Venue, Asset, Operation, CoviaError, RunStatus };
export type { VenueOptions, AssetData, JobData, InvokePayload, AssetMetadata, JobsResponse }; 