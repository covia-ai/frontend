import { CoviaError, VenueOptions, AssetMetadata, VenueInterface, AssetID, StatsData, StatusData, VenueContructor, VenueConstructor } from './types';
import { Asset } from './Asset';
import { Operation } from './Operation';
import { DataAsset } from './DataAsset';
import { fetchStreamWithError, fetchWithError } from './Utils';
import { Credentials, CredentialsHTTP } from './Credentials';
import { Resolver } from 'did-resolver'
import { getResolver } from 'web-did-resolver'
import { Job } from './Job';

const webResolver = getResolver()
const resolver = new Resolver(webResolver)

// Cache for storing asset data
const cache = new Map<AssetID, any>();

export class Venue implements VenueInterface {
  public baseUrl: string;
  public venueId: string;
  public name: string;  
  public credentials: Credentials;
  public metadata: AssetMetadata;
  
  constructor(options: VenueOptions = {}) {
    
    
    this.baseUrl = options.baseUrl || 'https://venue-test.covia.ai';
    this.venueId = options.venueId || "default";
    this.name = options.name || "default";
    this.credentials  = options.credentials || new CredentialsHTTP(this.venueId,"","");
    this.metadata = {};
  }
 
  

  /**
   * Static method to connect to a venue
   * @param venueId - Can be a HTTP base URL, DNS name, or existing Venue instance
   * @param credentials - Optional credentials for venue authentication
   * @returns {Promise<Venue>} A new Venue instance configured appropriately
   */
  static async connect(venueId: string | Venue, credentials?: CredentialsHTTP): Promise<Venue> {

    if (venueId instanceof Venue) {
      // If it's already a Venue instance, return a new instance with the same configuration
      return new Venue({
        baseUrl: venueId.baseUrl,
        venueId: venueId.venueId,
        name: venueId.name,
        credentials: credentials
      });
    }

    // If it's a string, determine if it's a URL or DNS name
    if (typeof venueId === 'string') {
      let baseUrl: string;
      // Check if it's a valid HTTP/HTTPS URL
      if (venueId.startsWith('http:') || venueId.startsWith('https:')) {
        baseUrl = venueId;
        //If baseUrl ends with  / remove it
        if(baseUrl.endsWith("/"))
          baseUrl = baseUrl.substring(0, baseUrl.length - 1);
           
      } else if (venueId.startsWith('did:web:')) {
        // Resolve the DID document
        const didDoc = await resolver.resolve(venueId);
        if (!didDoc.didDocument) {
          throw new CoviaError('Invalid DID document');
        }
        const endpoint = didDoc.didDocument.service?.find(service => service.type === 'Covia.API.v1')?.serviceEndpoint;
        if (!endpoint) {
          throw new CoviaError('No endpoint found for DID');
        }
        baseUrl = endpoint.toString().replace(/\/api\/v1/, '');
      } else {
        // Assume it's a DNS name or venue identifier
        baseUrl = `https://${venueId}`;
      }
    const data = await fetchWithError<StatusData>(baseUrl+'/api/v1/status');
    return new Venue({
            baseUrl,
            venueId: data.did,
            name: data.name,
            credentials: credentials
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
    return fetchWithError<any>(`${this.baseUrl}/api/v1/assets/`, {
      method: 'POST',
      headers: this.setCredentialsInHeader(),
      body: JSON.stringify(assetData),
    }).then(response=>{return this.getAsset(response)});
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
      return fetchWithError<any>(`${this.baseUrl}/api/v1/assets/${assetId}`)
        .then(data => {
          cache.set(assetId, data);
          
          // Determine asset type from metadata and return appropriate concrete class
          // TODO: Do we actually need separate concrete classes?
          if (data.metadata?.operation) {
            return new Operation(assetId, this, data);
          } else {
            return new DataAsset(assetId, this, data);
          }
        });
    }
  }

  /**
   * Get all assets
   * @returns {Promise<Asset[]>}
   */
  getAssets(): Promise<Asset[]> {
    return fetchWithError<any>(`${this.baseUrl}/api/v1/assets/`)
      .then(assetIds => {
        // Fetch all assets in parallel
        const assetPromises = assetIds.items.map((assetId: AssetID) => this.getAsset(assetId));
        return Promise.all(assetPromises);
      });
  }

  /**
   * Get all jobs
   * @returns {Promise<string[]>}
   */
  async getJobs(): Promise<string[]> {
    return fetchWithError<string[]>(`${this.baseUrl}/api/v1/jobs`);
  }

  /**
   * Get job by ID
   * @param jobId - Job identifier
   * @returns {Promise<Job>}
   */
  async getJob(jobId: string): Promise<Job> {
    return fetchWithError<Job>(`${this.baseUrl}/api/v1/jobs/${jobId}`).then(data => {
            return new Job(jobId, this, data);
    });
  }

   /**
   * Cancel job by ID
   * @param jobId - Job identifier
   * @returns {Promise<number>}
   */
  async cancelJob(jobId: string):  Promise<number> {
     return fetchStreamWithError(`${this.baseUrl}/api/v1/jobs/${jobId}/cancel`, { method: 'PUT'})
     .then((response) =>{
        return response.status
    });
  }

   /**
   * Delete job by ID
   * @param jobId - Job identifier
   * @returns {Promise<number>}
   */
  async deleteJob(jobId: string):  Promise<number> {
     return fetchStreamWithError(`${this.baseUrl}/api/v1/jobs/${jobId}/delete`, { method: 'PUT'})
     .then((response) =>{
        return response.status
    });
  }


    /**
   * Get the DID (Decentralized Identifier) for this venue
   * @returns {string} DID in the format did:web:domain
   */
  getStats():Promise<StatusData> {
      return fetchWithError<StatusData>(`${this.baseUrl}/api/v1/status`);
  }

  
    /**
     * Get asset metadata
     * @returns {Promise<AssetMetadata>}
     */
    async getMetadata(assetId:string): Promise<AssetMetadata> {
      return await fetchWithError<AssetMetadata>(`${this.baseUrl}/api/v1/assets/${assetId}`);
    }

      /**
   * Upload content to asset
   * @param content - Content to upload
   * @returns {Promise<ReadableStream<Uint8Array> | null>}
   */
  async uploadContent(content: BodyInit, assetId:string): Promise<ReadableStream<Uint8Array> | null> {
    const response = await fetchStreamWithError(`${this.baseUrl}/api/v1/assets/${assetId}/content`, {
      method: 'PUT',
      headers: this.setCredentialsInHeader(),
      body: content,
    });
    return response.body;
  }

  /**
   * Get asset content
   * @returns {Promise<ReadableStream<Uint8Array> | null>}
   */
  async getContent(assetId:string): Promise<ReadableStream<Uint8Array> | null> {
    const response = await fetchStreamWithError(`${this.baseUrl}/api/v1/assets/${assetId}/content`);
    return response.body;
  }

  /**
     * Execute the operation
     * @param input - Operation input parameters
     * @returns {Promise<any>}
     */
    async run(assetId:string,input: any ): Promise<any> {
      const payload = {
        operation: assetId,
        input: input
      };
  
      let customHeader = {};
  
      if(this.credentials.userId && this.credentials.userId != "") {
          customHeader = {
            'Content-Type': 'application/json',
            'X-Covia-User' : this.credentials.userId,
          }
      }
      else {
           customHeader = {
            'Content-Type': 'application/json'
          }
      }
      try {
        return  await fetchWithError<any>(`${this.baseUrl}/api/v1/invoke/`, {
          method: 'POST',
          headers: customHeader,
          body: JSON.stringify(payload),
        });
      } catch (error) {
        throw error;
      }
    }

     /**
     * Execute the operation
     * @param input - Operation input parameters
     * @returns {Promise<Job>}
     */
    async invoke(assetId:string,input: any ): Promise<Job> {
      const payload = {
        operation: assetId,
        input: input
      };
      return fetchWithError<any>(`${this.baseUrl}/api/v1/invoke/`, {
        method: 'POST', 
        headers: this.setCredentialsInHeader(),
        body: JSON.stringify(payload),
      }).catch(error => {
        throw error;
      });
    }

    private setCredentialsInHeader() : any{  
      if(this.credentials.userId && this.credentials.userId != "") {
          return  (
            {
              'Content-Type': 'application/json',
              'X-Covia-User' : this.credentials.userId
            }
          )
      }
      else {
           return ( {'Content-Type': 'application/json'})
          }
    }
} 
const _MyVenueCheck: VenueConstructor = Venue;
