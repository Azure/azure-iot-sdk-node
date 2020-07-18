import { AuthenticationProvider, Callback, ErrorCallback } from 'azure-iot-common';
import { UploadParams } from './blob_uploader';
import { BlobUploadResult } from './blob_upload_result';
/**
 * @private
 * @class         module:azure-iot-device.FileUploadApi
 * @classdesc     Provides methods to use Azure IoT Hub APIs that enable simple upload to a blob.
 *
 * @params        {String}  deviceId   Device identifier.
 * @params        {String}  hostname   Hostname of the Azure IoT Hub instance.
 * @params        {Object}  transport  Transport layer that shall be used (HTTP or mock).
 *
 * @throws        {ReferenceError}     Thrown if one of the parameters is falsy.
 */
/**
 * @private
 */
export interface FileUploadInterface {
    setOptions(options: any): void;
    getBlobSharedAccessSignature(blobName: string, done: Callback<UploadParams>): void;
    getBlobSharedAccessSignature(blobName: string): Promise<UploadParams>;
    notifyUploadComplete(correlationId: string, uploadResult: BlobUploadResult, done: (err?: Error) => void): void;
    notifyUploadComplete(correlationId: string, uploadResult: BlobUploadResult): Promise<void>;
}
/**
 * @private
 */
export declare class FileUploadApi implements FileUploadInterface {
    _authenticationProvider: AuthenticationProvider;
    http: any;
    constructor(authenticationProvider: AuthenticationProvider, httpTransport?: any);
    setOptions(options: any): void;
    getBlobSharedAccessSignature(blobName: string, done: Callback<UploadParams>): void;
    getBlobSharedAccessSignature(blobName: string): Promise<UploadParams>;
    notifyUploadComplete(correlationId: string, uploadResult: BlobUploadResult, done: ErrorCallback): void;
    notifyUploadComplete(correlationId: string, uploadResult: BlobUploadResult): Promise<void>;
}
