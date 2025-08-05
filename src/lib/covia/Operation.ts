import { Asset } from './Asset';
import { AssetMetadata, VenueInterface } from './types';

export class Operation extends Asset {
  constructor(id: string, venue: VenueInterface, metadata: AssetMetadata = {}) {
    super(id, venue, metadata);
  }

  // Operation-specific methods can be added here
  // For now, it inherits all functionality from Asset
} 