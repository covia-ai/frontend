
class CoviaError extends Error {
  constructor(message, code = null) {
    super(message);
    this.name = 'CoviaError';
    this.code = code;
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
   * @returns {Promise<Asset>}
   */
  async createAsset(assetData) {
    if (!this.connected) {
      throw new CoviaError('Not connected to venue. Connect first');
    }
    
    try {
      
      const response = await this._makeRequest('POST', '/assets/create', assetData);
      const asset = new Asset(
        response.id,
        response.name,
        response.type,
        this,
        response.data
      );
      
      this.assets.set(asset.id, asset);
      return asset;
    } catch (error) {
      throw new CoviaError(`Failed to create asset: ${error.message}`);
    }
  }

  /**
   * Get asset by ID
   * @param {string} assetId - Asset identifier
   * @returns {Asset|null}
   */
  getAsset(assetId) {
    return this.assets.get(assetId) || null;
  }

  /**
   * Get all assets
   * @param {Object} filters - Optional filters
   * @returns {Asset[]}
   */
  getAssets() {
     fetch('http://localhost:8080/api/v1/assets/')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
       
        return response.json(); // or response.text() for text files
      })
      .then(data => {
        return data;
       
      })
      .catch(error => {
        console.error('Error fetching assets:', error);
      });
   
    
    return assets;
  }

  /**
   * Create a new operation
   * @param {Object} operationData - Operation configuration
   * @returns {Promise<Operation>}
   */
  getOperation(operationId) {
    return this.operations.get(operationId) || null;
  }

  /**
   * Get all operations
   * @param {Object} filters - Optional filters
   * @returns {Operation[]}
   */
  getOperations(filters = {}) {
    let operations = Array.from(this.operations.values());
    
    if (filters.type) {
      operations = operations.filter(op => op.type === filters.type);
    }
    
    if (filters.id) {
      operations = operations.filter(op => op.id === filters.id);
    }
    
    return operations;
  }

  /**
   * Get history of execution
   * @returns {Run[]}
   */
  async getExecutionHistory(filter = {}  ) {
    const response = await this._makeRequest('GET', '/run/', filter);
    const run = new Run(
      response.id,
      response.name,
      response.type,
      this,
      response.data
    );
          
  }

  // Private methods
  async _makeRequest(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: this.timeout
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    // Simulate API call for demo purposes
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock successful responses
        if (endpoint === '/venues/connect') {
          resolve({ name: `Venue ${data.venueId}`, metadata: {} });
        } else if (endpoint === '/assets') {
          resolve({ 
            id: `asset_${Date.now()}`, 
            name: data.name, 
            type: data.type, 
            data: data.data || {} 
          });
        } else if (endpoint === '/operations') {
          resolve({ 
            id: `op_${Date.now()}`, 
            name: data.name, 
            type: data.type, 
            config: data.config || {} 
          });
        } else {
          resolve({ success: true });
        }
      }, 100);
    });
  }

  async _loadAssets() {
     fetch('http://localhost:8080/api/v1/assets/458bf52b1b58c571bc9c6ed5239df938e549c1b1c2104e3757a64fc6942e6ab5')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json(); // or response.text() for text files
      })
      .then(data => {
        console.log(data)
        this.assets = data;
      })
      .catch(error => {
        console.error('Error fetching assets:', error);
      });



  }

  
  async _loadOperations() {
     const  op1 = new Asset();
        op1.id = "rand101";
        op1.name = "Random";
        op1.description = "Produces a random hex String of the specified length.";
        op1.type = "Mathematical";
        op1.venue = this;
        op1.data = "Prompt to scrap a website and give you summary";

        this.operations = [op1];
  }

}

class Asset {
  constructor(id, name, version,description, type, venue, data = {}, creator,license,) {
    this.id = id;
    this.name = name;
    this.version = version;
    this.description = description;
    this.type = type;
    this.creator = creator;
    this.venue = venue;
    this.license = license;
    this.data = data;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Update asset data
   * @param {Object} updates - Properties to update
   * @returns {Promise<Asset>}
   */
  async update(newName, newDescription, newLicense) {
     const cloneData = {
      name: newName,
      description: newDescription,
      license: newLicense,
      type: this.type,
      version: this.version+1,
      creator:this.creator,
      data: { ...this.data }
    };
    return await this.venue.createAsset(cloneData);
  }


  /**
   * Get asset metadata
   * @returns {Object}
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      creator: this.creator,
      venue:this.venue,
      license:this.license,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
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
}

class Operation {
  constructor(id, name, type, venue, inputs, results) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.venue = venue;
    this.inputs = inputs;
    this.results = results;
  
  }

  /**
   * Execute the operation
   * @param {Object} params - Operation parameters
   * @returns {Promise<any>}
   */
  async execute(inputs = {}, userId) {
    try {
      
      const response = await this.venue._makeRequest('POST', `/operations/${this.id}/execute`, {
        inputs,
        userId
      });
       const executionRun = new Run(
        response.id,
        this,
        this.venue,
        response.status,
        response.progress,
        response.inputs,
        response.results,
        userId
      );     
      return executionRun;
    } catch (error) {
      this.status = RunStatus.FAILED;
      this.error = error.message;
      throw new CoviaError(`Operation execution failed: ${error.message}`);
    }
  }
 
}
const RunStatus = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
};
class Run {
  constructor(id, operation, venue, progress, inputs, results, userId) {
    this.id = id;
    this.status = RunStatus.PENDING;
    this.progress = progress;
    this.operation = operation;
    this.venue = venue;
    this.inputs = inputs;
    this.results = results;
    this.userId = userId;
    this.executionDate = new Date();
  
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Venue, Asset, Operation, CoviaError };
} else {
  window.VenueClient = { Venue, Asset, Operation, CoviaError };
}