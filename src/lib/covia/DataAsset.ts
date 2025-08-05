import { Asset } from './Asset';
import { AssetMetadata, VenueInterface } from './types';

export class DataAsset extends Asset {
  constructor(id: string, venue: VenueInterface, metadata: AssetMetadata = {}) {
    super(id, venue, metadata);
  }

  // DataAsset-specific methods can be added here
  // For now, it inherits all functionality from Asset
} 