import { Stream } from 'stream';
import { AuthenticationProvider, ErrorCallback } from 'azure-iot-common';
import { BlobUploaderInterface } from './blob_uploader';
import { FileUploadInterface } from './file_upload_api';
/**
 * @private
 */
/**
 * @private
 */
export interface BlobUpload {
    setOptions(options: any): void;
    uploadToBlob(blobName: string, stream: Stream, streamLength: number, done: (err?: Error) => void): void;
    uploadToBlob(blobName: string, stream: Stream, streamLength: number): Promise<void>;
}
/**
 * @private
 */
export declare class BlobUploadClient implements BlobUpload {
    private _fileUploadApi;
    private _authenticationProvider;
    private _blobUploader;
    constructor(authenticationProvider: AuthenticationProvider, fileUploadApi?: FileUploadInterface, blobUploader?: BlobUploaderInterface);
    setOptions(options: any): void;
    uploadToBlob(blobName: string, stream: Stream, streamLength: number, done: ErrorCallback): void;
    uploadToBlob(blobName: string, stream: Stream, streamLength: number): Promise<void>;
}
