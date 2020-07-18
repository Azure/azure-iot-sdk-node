import { Stream } from 'stream';
import { TripleValueCallback } from 'azure-iot-common';
/**
 * @private
 */
export interface UploadParams {
    hostName?: string;
    containerName?: string;
    blobName?: string;
    sasToken?: string;
    correlationId: string;
}
/**
 * @private
 */
export interface BlobUploaderInterface {
    uploadToBlob(uploadParams: UploadParams, stream: Stream, streamLength: number, done: TripleValueCallback<any, BlobResponse>): void;
    uploadToBlob(uploadParams: UploadParams, stream: Stream, streamLength: number): Promise<any>;
}
/**
 * @private
 */
export interface Aborter {
    timeout(time: number): any;
}
/**
 * @private
 */
export declare type BlobResponse = {
    statusCode: number;
    body: string;
};
/**
 * @private
 */
export interface BlobService {
    createBlockBlobFromStream(containerName: string, blobName: string, stream: Stream, streamLength: number, done: (err: Error, body?: any, result?: BlobResponse) => void): void;
}
/**
 * @private
 */
export interface BlockBlobClient {
    uploadStream(stream: Stream, bufferSize?: undefined | number, maxConcurrancy?: undefined | number, options?: any): Promise<any>;
}
/**
 * @private
 */
export interface StorageApi {
    newPipeline: any;
    AnonymousCredential: any;
    BlockBlobClient(url: string, pipeline: any): void;
}
/**
 * @private
 */
export declare class BlobUploader implements BlobUploaderInterface {
    storageApi: StorageApi;
    constructor(storageApi?: StorageApi);
    uploadToBlob(blobInfo: UploadParams, stream: Stream, streamLength: number, done: TripleValueCallback<any, BlobResponse>): void;
    uploadToBlob(blobInfo: UploadParams, stream: Stream, streamLength: number): Promise<{
        body: any;
        result: BlobResponse;
    }>;
}
