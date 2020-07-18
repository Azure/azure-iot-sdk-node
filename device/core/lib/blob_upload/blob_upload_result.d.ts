import { RestErrorStub, BlobUploadCommonResponseStub } from './../interfaces';
/**
 * @private
 * @class         module:azure-iot-device.BlobUploadResult
 * @classdesc     Result object used by the {@link module:azure-iot-device.blobUpload.BlobUploader} class to describe a successful upload to a blob.
 *
 * @params        isSuccess          {Boolean} Indicates whether the upload was successful or failed
 * @params        statusCode         {Number}  Status code returned by the blob storage upload operation
 * @params        statusDescription  {String}  String containing useful information pertaining to the result of the blob upload.
 *
 * @augments      {Error}
 */
export declare class BlobUploadResult {
    isSuccess: boolean;
    statusCode: number;
    statusDescription: string;
    constructor(isSuccess: boolean, statusCode: number, statusDescription: string);
    /**
     * @method           module:azure-iot-device.BlobUploadResult#fromAzureStorageCallbackArgs
     * @description      The `fromAzureStorageCallbackArgs` static method creates a new BlobUploadResult instance from the arguments passed to the callback of the azure storage upload method.
     *
     * @param {Object}   err         The error object that is passed to the callback.
     * @param {Object}   body        The body of the HTTP response.
     * @param {Object}   response    The HTTP response object.
     *
     * @throws {ReferenceException} If err is null and uploadResponse is falsy.
     *
     * @returns {BlobUploadResult} Formatted response for sending directly to IoT Hub as a notification.
     */
    static fromAzureStorageCallbackArgs(err?: Error & RestErrorStub, uploadResponse?: BlobUploadCommonResponseStub): BlobUploadResult;
}
