import { Venue } from "./Venue";
const cache = new Map<string, Venue>();

export class Grid {
  
   /**
   * Static method to connect to a venue
   * @param venueId - Can be a HTTP base URL, DNS name, or existing Venue instance
   * @returns {Venue} A new Venue instance configured appropriately
   */
  static  connectToVenue(venueId:string) {
    if (cache.has(venueId)) 
        return cache.get(venueId);
    else {
      Venue.connect(venueId).then((venue:Venue) => {
        cache.set(venueId, venue);
        return venue;
      })
   } 
  }
  
} 