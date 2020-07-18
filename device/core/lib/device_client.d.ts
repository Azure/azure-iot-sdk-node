import { Stream } from 'stream';
import { AuthenticationProvider, results, Callback, ErrorCallback } from 'azure-iot-common';
import { InternalClient, DeviceTransport } from './internal_client';
import { BlobUploadClient, UploadParams, FileUploadInterface } from './blob_upload';
import { DeviceMethodRequest, DeviceMethodResponse } from './device_method';
import { DeviceClientOptions } from './interfaces';
/**
 * IoT Hub device client used to connect a device with an Azure IoT hub.
 *
 * Users of the SDK should call one of the factory methods,
 * {@link azure-iot-device.Client.fromConnectionString|fromConnectionString}
 * or {@link azure-iot-device.Client.fromSharedAccessSignature|fromSharedAccessSignature}
 * to create an IoT Hub device client.
 */
export declare class Client extends InternalClient {
    private _c2dEnabled;
    private _deviceDisconnectHandler;
    private _blobUploadClient;
    private _fileUploadApi;
    /**
     * @constructor
     * @param {Object}  transport         An object that implements the interface
     *                                    expected of a transport object, e.g.,
     *                                    {@link azure-iot-device-http.Http|Http}.
     * @param {string}  connStr           A connection string (optional: when not provided, updateSharedAccessSignature must be called to set the SharedAccessSignature token directly).
     * @param {Object}  blobUploadClient  An object that is capable of uploading a stream to a blob.
     * @param {Object}  fileUploadApi     An object that is used for communicating with IoT Hub for Blob Storage related actions.
     */
    constructor(transport: DeviceTransport, connStr?: string, blobUploadClient?: BlobUploadClient, fileUploadApi?: FileUploadInterface);
    setOptions(options: DeviceClientOptions, done: Callback<results.TransportConfigured>): void;
    setOptions(options: DeviceClientOptions): Promise<results.TransportConfigured>;
    /**
     * Closes the transport connection and destroys the client resources.
     *
     * *Note: After calling this method the Client object cannot be reused.*
     *
     * @param {Callback<results.Disconnected>} [closeCallback] Optional function to call once the transport is disconnected and the client closed.
     * @returns {Promise<results.Disconnected> | void} Promise if no callback function was passed, void otherwise.
     */
    close(closeCallback: Callback<results.Disconnected>): void;
    close(): Promise<results.Disconnected>;
    /**
     * Registers a callback for a method named `methodName`.
     *
     * @param methodName Name of the method that will be handled by the callback
     * @param callback Function that shall be called whenever a method request for the method called `methodName` is received.
     */
    onDeviceMethod(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void;
    /**
     * @description      The `uploadToBlob` method uploads a stream to a blob.
     *
     * @param {String}   blobName         The name to use for the blob that will be created with the content of the stream.
     * @param {Stream}   stream           The data to that should be uploaded to the blob.
     * @param {Number}   streamLength     The size of the data to that should be uploaded to the blob.
     * @param {ErrorCallback} [done]      Optional callback to call when the upload is complete.
     * @returns {Promise<void> | void}    Promise if no callback function was passed, void otherwise.
     *
     * @throws {ReferenceException} If blobName or stream or streamLength is falsy.
     */
    uploadToBlob(blobName: string, stream: Stream, streamLength: number, callback: ErrorCallback): void;
    uploadToBlob(blobName: string, stream: Stream, streamLength: number): Promise<void>;
    /**
     * @description      The `getBlobSharedAccessSignature` gets the linked storage account SAS Token from IoT Hub
     *
     * @param {String}    blobName                The name to use for the blob that will be created with the content of the stream.
     * @param {Callback}  [callback]              Optional callback to call when the upload is complete.
     * @returns {Promise<UploadParams> | void}    Promise if no callback function was passed, void otherwise.
     *
     * @throws {ReferenceException} If blobName is falsy.
     */
    getBlobSharedAccessSignature(blobName: string, callback: Callback<UploadParams>): void;
    getBlobSharedAccessSignature(blobName: string): Promise<UploadParams>;
    /**
     * @description      The `notifyBlobUploadStatus` method sends IoT Hub the result of a blob upload.
     * @param {string}                         correlationId      An id for correlating a upload status to a specific blob. Generated during the call to `getBlobSharedAccessSignature`.
     * @param {boolean}                        isSuccess          The success or failure status from the storage blob operation result.
     * @param {number}                         statusCode         The HTTP status code associated with the storage blob result.
     * @param {string}                         statusDescription  The description of the HTTP status code.
     * @param {ErrorCallback}                  [callback]         Optional callback to call when the upload is complete.
     * @returns {Promise<void> | void}                            Promise if no callback function was passed, void otherwise.
     *
     * @throws {ReferenceException} If uploadResponse is falsy.
     */
    notifyBlobUploadStatus(correlationId: string, isSuccess: boolean, statusCode: number, statusDescription: string, callback: ErrorCallback): void;
    notifyBlobUploadStatus(correlationId: string, isSuccess: boolean, statusCode: number, statusDescription: string): Promise<void>;
    private _enableC2D;
    private _disableC2D;
    /**
     * Creates an IoT Hub device client from the given connection string using the given transport type.
     *
     * @param {String}    connStr        A connection string which encapsulates "device connect" permissions on an IoT hub.
     * @param {Function}  transportCtor  A transport constructor.
     *
     * @throws {ReferenceError}         If the connStr parameter is falsy.
     *
     * @returns {module:azure-iot-device.Client}
     */
    static fromConnectionString(connStr: string, transportCtor: any): Client;
    /**
     * @method            module:azure-iot-device.Client.fromSharedAccessSignature
     * @description       Creates an IoT Hub device client from the given
     *                    shared access signature using the given transport type.
     *
     * @param {String}    sharedAccessSignature      A shared access signature which encapsulates "device
     *                                  connect" permissions on an IoT hub.
     * @param {Function}  Transport     A transport constructor.
     *
     * @throws {ReferenceError}         If the connStr parameter is falsy.
     *
     * @returns {module:azure-iothub.Client}
     */
    static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor: any): Client;
    /**
     * @method                        module:azure-iot-device.Client.fromAuthenticationMethod
     * @description                   Creates an IoT Hub device client from the given authentication method and using the given transport type.
     * @param authenticationProvider  Object used to obtain the authentication parameters for the IoT hub.
     * @param transportCtor           Transport protocol used to connect to IoT hub.
     */
    static fromAuthenticationProvider(authenticationProvider: AuthenticationProvider, transportCtor: any): Client;
}
