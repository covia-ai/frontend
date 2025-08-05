# Covia TypeScript API

This directory contains the TypeScript implementation of the Covia grid API, extracted from the original JavaScript implementation.

## File Structure

- **`types.ts`** - TypeScript interfaces, types, and the `CoviaError` class
- **`Asset.ts`** - Abstract base class for all assets
- **`Operation.ts`** - Extends `Asset` for operation-specific functionality
- **`DataAsset.ts`** - Extends `Asset` for data asset-specific functionality
- **`Venue.ts`** - Manages connections and provides factory methods
- **`index.ts`** - Exports all classes and types
- **`example.ts`** - Usage examples

## Inheritance Structure

```
Asset (abstract base class)
├── Operation (extends Asset)
└── DataAsset (extends Asset)
```

## Usage

```typescript
import { Venue, Asset, Operation, DataAsset } from '@/lib/covia';

// Create venue and connect
const venue = new Venue({ 
  baseUrl: 'http://localhost:8080',
  venueId: 'my-venue' 
});
venue.connect();

// Get assets
const assets = await venue.getAssets();
const operation = await venue.getOperation('op-id');
const dataAsset = await venue.getDataAsset('data-id');

// Use inherited functionality
await operation.invoke({ param: 'value' });
await dataAsset.uploadContent(content);
```

## Key Features

- **Type Safety**: Full TypeScript support with proper interfaces
- **Inheritance**: `Operation` and `DataAsset` inherit all functionality from `Asset`
- **Caching**: Built-in caching for improved performance
- **Error Handling**: Typed `CoviaError` class for proper error management
- **Stream Support**: Built-in support for content streaming

## Migration from JavaScript

The old `covialib.js` file has been removed. All imports have been updated to use the new TypeScript API:

```typescript
// Old
import { Venue } from '@/lib/covia/covialib';

// New
import { Venue } from '@/lib/covia';
``` 