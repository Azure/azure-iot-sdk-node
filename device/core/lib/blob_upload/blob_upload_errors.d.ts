/**
 * @private
 * @class         module:azure-iot-device.BlobSasError
 * @classdesc     Error used when the client fails to get a blob shared access signature from the IoT Hub service.
 *
 * @params        {string}  message  Error message
 * @augments      {Error}
 */
export declare class BlobSasError extends Error {
    innerError: Error;
    constructor(message: string);
}
/**
 * @private
 * @class         module:azure-iot-device.BlobUploadNotificationError
 * @classdesc     Error used when the client fails to notify the IoT Hub service that the upload is complete.
 *
 * @params        {string}  message  Error message
 * @augments      {Error}
 */
export declare class BlobUploadNotificationError extends Error {
    innerError: Error;
    constructor(message: string);
}
