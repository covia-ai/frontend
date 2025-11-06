import { JobMetadata,  VenueInterface } from "./types";

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
   return this.venue.cancelJob(this.id);
  }
  
  async deleteJob():  Promise<number> {
     return this.venue.deleteJob(this.id);
  }
}