export interface VenueOptions {
  baseUrl?: string;
  venueId?: string;
}

export interface VenueInterface {
  baseUrl: string;
  venueId: string;
  name: string;
  metadata: AssetMetadata;
}

export interface AssetMetadata {
  [key: string]: any;
}

export interface AssetData {
  id: string;
  metadata?: AssetMetadata;
  [key: string]: any;
}

export interface OperationPayload {
  [key: string]: any;
}

export interface JobData {
  [key: string]: any;
}

export interface InvokePayload {
  assetId: string;
  payload: OperationPayload;
}

export enum RunStatus {
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
  PENDING = "PENDING",
  STARTED = "STARTED"
}

export class CoviaError extends Error {
  public code: number | null;

  constructor(message: string, code: number | null = null) {
    super(message);
    this.name = 'CoviaError';
    this.code = code;
    this.message = message;
  }
} 