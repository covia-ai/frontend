// Credentials interface for venue authentication
// TODO: Better structure for arbitrary credentials

export interface Credentials {
  venueId: string;
  apiKey: string;
}

export class CredentialsHTTP implements Credentials {

  constructor(public venueId: string, public apiKey: string) {}
} 