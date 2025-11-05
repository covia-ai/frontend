import { Asset } from "./Asset";
import { CredentialsHTTP } from "./Credentials";
import { Job } from "./Job";
import { Venue } from "./Venue";

export interface VenueOptions {
  baseUrl?: string;
  venueId?: string;
  name?:string;
}

export interface VenueInterface {
  baseUrl: string;
  venueId: string;
  name: string;
  metadata: AssetMetadata;
  connect(venueId: string | Venue, credentials?: CredentialsHTTP):Promise<Venue>;
  cancelJob(jobId:string):Promise<number>;
  deleteJob(jobId:string):Promise<number>;
  getStats():Promise<StatusData>;
  getJob(jobId:string):Promise<Job>;
  getJobs():Promise<string[]>;
  getAsset(assetId: AssetID): Promise<Asset>;
  createAsset(assetData: any, userEmail: string): Promise<Asset>;
  getAssets(): Promise<Asset[]>;
  getAssetMetadata(assetId:string): Promise<AssetMetadata>;
  uploadContentToAsset(content:BodyInit, assetId:string):Promise<ReadableStream<Uint8Array> | null>;
  getAssetContent(assetId:string):Promise<ReadableStream<Uint8Array> | null>;
  run(input:any, userId:string,assetId:string):Promise<any>;

}

export type AssetID = string;

export interface AssetMetadata {
  [key: string]: any;
  name?: string;
  description?: string;
  type?: string;
  created?: string;
  updated?: string;
  operation?: OperationDetails;
  content?: ContentDetails;
  input?: any;
  output?: any;
}

/** Type for metadata.operation */
export interface OperationDetails {
  [key: string]: any;
  adapter?: string;
  input?: any;
  output?: any;
  steps?: any[];
  result?: any;
}

/** Type for metadata.content */
export interface ContentDetails {
  [key: string]: any;
}

export interface OperationPayload {
  [key: string]: any;
}

export interface JobMetadata {
  id:string;
  status?: RunStatus;
  created?: string;
  updated?: string;
  input?: any;
  output?: any;
  [key: string]: any;
}

export interface InvokePayload {
  assetId: AssetID;
  payload: OperationPayload;
}

export enum RunStatus {
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
  PENDING = "PENDING",
  STARTED = "STARTED",
  CANCELLED = "CANCELLED",
  TIMEOUT = "TIMEOUT",
  REJECTED = "REJECTED",
  INPUT_REQUIRED= "INPUT_REQUIRED",
  AUTH_REQUIRED = "AUTH_REQUIRED",
  PAUSED = "PAUSED"
}


export interface StatusData {
  url?:string;
  ts?:string;
  status?:string;
  did?:string;
  name?:string;
  stats?:StatsData;

}
export interface StatsData {
  assets?: number;
  users?: number;
  ops?: number;
  jobs?: number;
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