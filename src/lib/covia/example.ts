import { Venue, Asset, Operation, DataAsset, CoviaError, RunStatus } from './index';

// Example usage of the Covia API
async function example() {
  try {
    // Create a venue connection
    const venue = new Venue({
      baseUrl: 'http://localhost:8080',
      venueId: 'my-venue'
    });

    // Get all assets
    const assets = await venue.getAssets();
    console.log('Found assets:', assets.length);

    // Get a specific asset
    const asset = await venue.getAsset('asset-id');
    console.log('Asset:', asset.id);

    // Get asset metadata
    const metadata = await asset.getMetadata();
    console.log('Asset metadata:', metadata);

    // Get assets (returns Operation or DataAsset based on metadata)
    const operation = await venue.getAsset('operation-id');
    console.log('Operation:', operation);

    // Get data asset
    const dataAsset = await venue.getAsset('data-asset-id');
    console.log('Data Asset:', dataAsset);

    // Upload content to data asset
    const content = new Blob(['Hello World'], { type: 'text/plain' });
    await dataAsset.uploadContent(content);

    // Get content from data asset
    const stream = await dataAsset.getContent();
    if (stream) {
      const reader = stream.getReader();
      await dataAsset.readStream(reader);
    }

    // Get all jobs
    const jobs = await venue.getJobs();
    console.log('Jobs:', jobs);

    // Get a specific job
    const job = await venue.getJob('job-id');
    console.log('Job:', job);

  } catch (error) {
    if (error instanceof CoviaError) {
      console.error('Covia error:', error.message, error.code);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

export { example }; 