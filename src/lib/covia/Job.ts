import { JobMetadata,  VenueInterface } from "./types";
import { fetchStreamWithError } from "./Utils";

export class Job {
  public id: string;
  public venue: VenueInterface;
  public metadata: JobMetadata;

  constructor(id: string, venue: VenueInterface, metadata: JobMetadata) {
    this.id = id;
    this.venue = venue;
    this.metadata = metadata;
  }

  async cancelJob(): Promise<number> {
    return fetchStreamWithError(`${this.venue.baseUrl}/api/v1/jobs/${this.id}/cancel`, { method: 'PUT'})
         .then((response) =>{
            return response.status
        });
  }
  
  async deleteJob():  Promise<number> {
     return fetchStreamWithError(`${this.venue.baseUrl}/api/v1/jobs/${this.id}/delete`, { method: 'PUT'})
     .then((response) =>{
        return response.status
  });
  }
}