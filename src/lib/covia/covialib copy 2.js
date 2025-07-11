
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
   * @returns {Venue}
   */
   connect() {
    try {      
      this.connected = true;
      
      return this;
    } catch (error) {
      throw new CoviaError(`Failed to connect to venue: ${error.message}`);
    }
  }

  /**
   * Disconnect from the venue
   * @returns {boolean}
   */
   disconnect() {
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
   * @returns {Promise<Asset>}
   */
  async createAsset(assetData) {
     try {
        console.log(assetData)
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
        return  this.getAsset(await response.json()); // Await the parsing of the JSON response
        
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
          return new Asset(assetId, this, cache.get(assetId));
        } else {
          const response = await fetch('http://localhost:8080/api/v1/assets/'+assetId)
      
          if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data =  await response.json(); // Await the parsing of the JSON response
          cache.set(assetId, data);
          return new Asset(assetId, this, data);
        }
      }
      catch(error) {
       throw new CoviaError(`Failed to get asset: ${error.message}`);
        
      }

  }
 

  /**
   * Get all assets
   * @param {Object} filters - Optional filters
   * @returns {Promise<Asset[]>}
   */
  async getAssets() {
     const assets = new Array();
     try {
       
        let response = await fetch('http://localhost:8080/api/v1/assets/');

        let assetIds = await response.json();
        assetIds.forEach(assetId => {
                  assets.push(new Asset(assetId, this, this.getAsset(assetId)))
        });
        return assets;
             
       
      }
      catch(error) {
         throw new CoviaError(`Failed to get asset: ${error.message}`);
      }
  }

 
 
 
 /**
   * Get all jobs
   * @returns {Promise<[]>}
   */
  async getJobs() {
     const jobs= new Array();
     try {
      
        const response = await fetch('http://localhost:8080/api/v1/jobs')
     
        if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
        
      }
      catch(error) {
       throw new CoviaError(`Failed to get asset: ${error.message}`);
       
      }
  }
 
   /**
   * Get  jobs
   * @returns {Promise<Object>}
   */
  async getJob(jobId) {
     try {
      
        const response = await fetch('http://localhost:8080/api/v1/jobs/'+jobId)
     
        if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
       
      }
      catch(error) {
       throw new CoviaError(`Failed to get asset: ${error.message}`);
       
      }
  }
}
const RunStatus = {
  COMPLETE: "COMPLETE",
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
   * @returns {Promise<Object>}
   */
  async getMetadata() {
   try {
        if (cache.has(this.id)) {
          // Check if result is already in cache
          return cache.get(this.id);
        } else {
          const response = await fetch('http://localhost:8080/api/v1/assets/'+this.id)
      
          if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.json(); // Await the parsing of the JSON response
          
        }
      }
      catch(error) {
       throw new CoviaError(`Failed to get asset: ${error.message}`);
        
      }
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
  module.exports = { Venue, Asset, Operation,CoviaError, RunStatus };
} else {
  window.VenueClient = { Venue, Asset, Operation,CoviaError, RunStatus };
}