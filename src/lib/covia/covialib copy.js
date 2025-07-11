
const cache = new Map();

class CoviaError extends Error {
  constructor(message, code = null) {
    super(message);
    this.name = 'CoviaError';
    this.code = code;
    this.message = message;
  }
}

class Venue {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:8080';
    this.connected = false;
    this.venueId = options.venueId || "default";
    this.name = options.venueId || "default";
    this.metadata = {};
    
  }

  /**
   * Connect to the venue
   * @param {string} venueId - Venue identifier
   * @returns {Promise<Venue>}
   */
  async connect() {
    try {      
      this.connected = true;
      
      return this;
    } catch (error) {
      throw new CoviaError(`Failed to connect to venue: ${error.message}`);
    }
  }

  /**
   * Disconnect from the venue
   * @returns {Promise<boolean>}
   */
  async disconnect() {
    try {
      if (this.connected) {
        this.connected = false;
        this.venueId = null;
      }
      return true;
    } catch (error) {
      throw new CoviaError(`Failed to disconnect: ${error.message}`);
    }
  }

  /**
   * Create a new asset
   * @param {Object} assetData - Asset configuration
   * @returns {Promise<String>}
   */
  async createAsset(assetData) {
     try {
      
        const response = await fetch('http://localhost:8080/api/v1/assets/',{
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },

            body: JSON.stringify(assetData),
        })
     
        if (!response.ok) {
              throw new CoviaError(`Failed to create asset! status: ${response.status}`);
        }
         const data =  await response.json(); // Await the parsing of the JSON response
        
        return data;
      }
      catch(e) {
       if(e instanceof CoviaError)
          throw e;
       else 
           throw new CoviaError(`Failed to create asset: ${error.message}`);
        
      }
  }

  /**
   * Get asset by ID
   * @param {string} assetId - Asset identifier
   * @returns {Promise<Asset>}
   */
  async getAsset(assetId) {
 
     try {
        if (cache.has(assetId)) {
          // Check if result is already in cache
          return cache.get(assetId);
        } else {
          const response = await fetch('http://localhost:8080/api/v1/assets/'+assetId)
      
          if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data =  await response.json(); // Await the parsing of the JSON response
          const asset = new Asset(
              assetId,
              this,
              data
            );
          cache.set(assetId, asset);
          return asset;
        }
      }
      catch(error) {
       throw new CoviaError(`Failed to get asset: ${error.message}`);
        
      }

  }
  /**
   * Get asset by ID
   * @param {string} assetId - Asset identifier
   * @returns {Promise<Operation>}
   */
  async getOperation(assetId) {
     try {
        if (cache.has(assetId)) {
          // Check if result is already in cache
          return cache.get(assetId);
        } else {
          const response = await fetch('http://localhost:8080/api/v1/assets/'+assetId)
          if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data =  await response.json(); // Await the parsing of the JSON response
          const operation = new Operation(
              assetId,
              this,
              data
            );
            return operation;
        }
      }
      catch(error) {
       throw new CoviaError(`Failed to get operation: ${error.message}`);
        
      }

  }

  /**
   * Get all assets
   * @param {Object} filters - Optional filters
   * @returns {Promise<[]>}
   */
  async getAssets() {
     try {
      
        const response = await fetch('http://localhost:8080/api/v1/assets/')
     
        if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
        }
         const data =  response.json(); // Await the parsing of the JSON response
         return data;
      }
      catch(error) {
       throw new CoviaError(`Failed to get asset: ${error.message}`);
       
      }
       
   
  }

  async getJob(jobId) {
     try {
      
        const response = await fetch('http://localhost:8080/api/v1/jobs/'+jobId)
     
        if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
        }
         const data =  response.json(); // Await the parsing of the JSON response
         return data;
      }
      catch(error) {
       throw new CoviaError(`Failed to get asset: ${error.message}`);
       
      }
  }
 

  async getJobs() {
     try {
      
        const response = await fetch('http://localhost:8080/api/v1/jobs')
     
        if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
        }
         const data =  response.json(); // Await the parsing of the JSON response
         return data;
      }
      catch(error) {
       throw new CoviaError(`Failed to get asset: ${error.message}`);
       
      }
  }
 
}
const RunStatus = {
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  INPROGRESS: "INPROGRESS"
};
class Asset {
  constructor(id, venue, metadata= {}) {
    this.id = id;
    this.venue = venue;
    this.metadata = metadata
  }


  /**
   * Get asset metadata
   * @returns {Object}
   */
  getMetadata() {
    return this.metadata;
  }

  /**
   * Clone this asset
   * @param {string} newName - Name for the cloned asset
   * @returns {Promise<Asset>}
   */
  async clone(newName, newDescription, newLicense, newCreator) {
    const cloneData = {
      name: newName,
      description: newDescription,
      license: newLicense,
      type: this.type,
      version: 1.0,
      creator:newCreator,
      data: { ...this.data }
    };
    return await this.venue.createAsset(cloneData);
  }

   /**
   * Execute the operation
   * @param {Object} params - Operation parameters
   * @returns {Promise<any>}
   */
 
 async invoke(payload) {
      
     try {
      
        const response = await fetch('http://localhost:8080/api/v1/invoke/',{
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },

            body: JSON.stringify(payload),
        })
        if (!response.ok) {
           const errorText = await response.text();
           const status = response.status;
           throw new CoviaError(`Operation execution failed: ${errorText}`, status);
        }
        else {
          return  await response.json();
         }

    } catch (error) {
      if(error instanceof CoviaError)
          throw error;
      else {
        this.status = RunStatus.FAILED;
        this.error = error.message;
        throw new CoviaError(`Operation execution failed: ${error.message}`);
      }
    }
  }
}

class Operation extends Asset {
  constructor(id, venue, metadata) {
    super(id,venue,metadata);
  
  }

  
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Venue, Asset, Operation, CoviaError, RunStatus };
} else {
  window.VenueClient = { Venue, Asset, Operation, CoviaError, RunStatus };
}