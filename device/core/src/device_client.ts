// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Stream } from 'stream';
import * as dbg from 'debug';
const debug = dbg('azure-iot-device:DeviceClient');
const debugErrors = dbg('azure-iot-device:DeviceClient:Errors');

import { AuthenticationProvider, RetryOperation, ConnectionString, results, Callback, ErrorCallback, callbackToPromise } from 'azure-iot-common';
import { InternalClient, DeviceTransport } from './internal_client';
import { BlobUploadClient, UploadParams, DefaultFileUploadApi, FileUploadInterface } from './blob_upload';
import { SharedAccessSignatureAuthenticationProvider } from './sas_authentication_provider';
import { X509AuthenticationProvider } from './x509_authentication_provider';
import { SharedAccessKeyAuthenticationProvider } from './sak_authentication_provider';
import { DeviceMethodRequest, DeviceMethodResponse } from './device_method';
import { DeviceClientOptions } from './interfaces';

function safeCallback(callback?: (err?: Error, result?: any) => void, error?: Error, result?: any): void {
  if (callback) callback(error, result);
}
/**
 * IoT Hub device client used to connect a device with an Azure IoT hub.
 *
 * Users of the SDK should call one of the factory methods,
 * {@link azure-iot-device.Client.fromConnectionString|fromConnectionString}
 * or {@link azure-iot-device.Client.fromSharedAccessSignature|fromSharedAccessSignature}
 * to create an IoT Hub device client.
 */
export class Client extends InternalClient {
  private _userRegisteredC2dListener: boolean;
  private _deviceDisconnectHandler: (err?: Error, result?: any) => void;
  private _blobUploadClient: BlobUploadClient;
  private _fileUploadApi: FileUploadInterface;

  /**
   * @constructor
   * @param {Object}  transport         An object that implements the interface
   *                                    expected of a transport object, e.g.,
   *                                    {@link azure-iot-device-http.Http|Http}.
   * @param {string}  connStr           A connection string (optional: when not provided, updateSharedAccessSignature must be called to set the SharedAccessSignature token directly).
   * @param {Object}  blobUploadClient  An object that is capable of uploading a stream to a blob.
   * @param {Object}  fileUploadApi     An object that is used for communicating with IoT Hub for Blob Storage related actions.
   */
  constructor(transport: DeviceTransport, connStr?: string, blobUploadClient?: BlobUploadClient, fileUploadApi?: FileUploadInterface) {
    super(transport, connStr);
    this._blobUploadClient = blobUploadClient;
    this._userRegisteredC2dListener = false;
    this._fileUploadApi = fileUploadApi;

    this.on('removeListener', () => {
      if (this.listenerCount('message') === 0) {
        this._userRegisteredC2dListener = false;
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_005: [The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `message` event.]*/
        debug('in removeListener, disabling C2D.');
        this._disableC2D((err) => {
          if (err) {
            debugErrors('in removeListener, error disabling C2D: ' + err);
            this.emit('error', err);
          } else {
            debug('removeListener successfully disabled C2D.');
          }
        });
      }
    });

    this.on('newListener', (eventName) => {
      if (eventName === 'message') {
        //
        // We want to always retain that the we want to have this feature enabled because the API (.on) doesn't really
        // provide for the capability to say it failed.  It can certainly fail because a network operation is required to
        // enable.
        // By saving this off, we are strictly honoring that the feature is enabled.  If it doesn't turn on we signal via
        // the emitted 'error' that something bad happened.
        // But if we ever again attain a connected state, this feature will be operational.
        //
        this._userRegisteredC2dListener = true;
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_004: [The client shall start listening for messages from the service whenever there is a listener subscribed to the `message` event.]*/
        debug('in newListener, enabling C2D.');
        this._enableC2D((err) => {
          if (err) {
            debugErrors('in newListener, error enabling C2D: ' + err);
            this.emit('error', err);
          } else {
            debug('in newListener, successfully enabled C2D');
          }
        });
      }
    });

    /*Codes_SRS_NODE_DEVICE_CLIENT_16_002: [The `message` event shall be emitted when a cloud-to-device message is received from the IoT Hub service.]*/
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_003: [The `message` event parameter shall be a `message` object.]*/
    this._transport.on('message', (msg) => {
      this.emit('message', msg);
    });

    this._deviceDisconnectHandler = (err) => {
      if (err) {
        debugErrors('transport disconnect event: ' + err);
      } else {
        debug('transport disconnect event: no error');
      }
      if (err && this._retryPolicy.shouldRetry(err)) {
        debugErrors('reconnect policy specifies a reconnect on error');
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_097: [If the transport emits a `disconnect` event while the client is subscribed to c2d messages the retry policy shall be used to reconnect and re-enable the feature using the transport `enableC2D` method.]*/
        if (this._userRegisteredC2dListener) {
          // turn on C2D
          debug('disconnectHandler re-enabling C2D');
          this._enableC2D((err) => {
            if (err) {
              /*Codes_SRS_NODE_DEVICE_CLIENT_16_102: [If the retry policy fails to reestablish the C2D functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
              debugErrors('error on _enableC2D in _deviceDisconnectHandler. Failed to reestablish C2D functionality: ' + err);
              this.emit('disconnect', new results.Disconnected(err));
            } else {
              debug('_deviceDisconnectHandler has enabled C2D');
            }
          });
        } else {
          debug('C2D has not been enabled on the device');
        }
      }
    };

    this._transport.on('disconnect', this._deviceDisconnectHandler);
  }

  setOptions(options: DeviceClientOptions, done: Callback<results.TransportConfigured>): void;
  setOptions(options: DeviceClientOptions): Promise<results.TransportConfigured>;
  setOptions(options: DeviceClientOptions, done?: Callback<results.TransportConfigured>): Promise<results.TransportConfigured> | void {
    if (!options) throw new ReferenceError('options cannot be falsy.');
    if (this._blobUploadClient) {
      /*Codes_SRS_NODE_DEVICE_CLIENT_99_103: [The `setOptions` method shall set `blobUploadClient` options.]*/
      this._blobUploadClient.setOptions(options);
    }
    if (this._fileUploadApi) {
      /* [The `setOptions` method shall set `fileUploadApi` options.]*/
      this._fileUploadApi.setOptions(options);
    }
    return super.setOptions(options, done);
  }

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
  close(closeCallback?: Callback<results.Disconnected>): Promise<results.Disconnected> | void {
    return callbackToPromise((_callback) => {
      this._transport.removeListener('disconnect', this._deviceDisconnectHandler);
      super.close(_callback);
    }, closeCallback);
  }

  /**
   * Registers a callback for a method named `methodName`.
   *
   * @param methodName Name of the method that will be handled by the callback
   * @param callback Function that shall be called whenever a method request for the method called `methodName` is received.
   */
  onDeviceMethod(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
    this._onDeviceMethod(methodName, callback);
  }

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
  uploadToBlob(blobName: string, stream: Stream, streamLength: number, callback?: ErrorCallback): Promise<void> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_037: [The `uploadToBlob` method shall throw a `ReferenceError` if `blobName` is falsy.]*/
      if (!blobName) throw new ReferenceError('blobName cannot be \'' + blobName + '\'');
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_038: [The `uploadToBlob` method shall throw a `ReferenceError` if `stream` is falsy.]*/
      if (!stream) throw new ReferenceError('stream cannot be \'' + stream + '\'');
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_039: [The `uploadToBlob` method shall throw a `ReferenceError` if `streamLength` is falsy.]*/
      if (!streamLength) throw new ReferenceError('streamLength cannot be \'' + streamLength + '\'');

      const retryOp = new RetryOperation('uploadToBlob', this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_040: [The `uploadToBlob` method shall call the `_callback` callback with an `Error` object if the upload fails.]*/
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_041: [The `uploadToBlob` method shall call the `_callback` callback no parameters if the upload succeeds.]*/
        this._blobUploadClient.uploadToBlob(blobName, stream, streamLength, opCallback);
      }, (err, result) => {
        safeCallback(_callback, err, result);
      });
    }, callback);
  }

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
  getBlobSharedAccessSignature(blobName: string, callback?: Callback<UploadParams>): Promise<UploadParams> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_41_001: [The `getBlobSharedAccessSignature` method shall throw a `ReferenceError` if `blobName` is falsy.]*/
      if (!blobName) throw new ReferenceError('blobName cannot be \'' + blobName + '\'');
      const retryOp = new RetryOperation('getBlobSharedAccessSignature', this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        /*Codes_SRS_NODE_DEVICE_CLIENT_41_002: [The `getBlobSharedAccessSignature` method shall call the `getBlobSharedAccessSignature` method in the instantiated `_fileUploadApi` class and pass in `blobName` as a parameter.]*/
        this._fileUploadApi.getBlobSharedAccessSignature(blobName, opCallback);
      }, (err, result) => {
        /*Codes_SRS_NODE_DEVICE_CLIENT_41_003: [The `getBlobSharedAccessSignature` method shall call the `_callback` callback with `err` and `result` from the call to `getBlobSharedAccessSignature`.]*/
        if (!err) {
          debug('got blob storage shared access signature.');
        } else {
          debugErrors('Could not obtain blob shared access signature: ' + err);
        }
        safeCallback(_callback, err, result);
      });
    }, callback);
  }

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
  notifyBlobUploadStatus(correlationId: string, isSuccess: boolean, statusCode: number, statusDescription: string, callback?: ErrorCallback): Promise<void> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_41_016: [The `notifyBlobUploadStatus` method shall throw a `ReferenceError` if `correlationId` is falsy.]*/
      /*Codes_SRS_NODE_DEVICE_CLIENT_41_005: [The `notifyBlobUploadStatus` method shall throw a `ReferenceError` if `isSuccess` is falsy but not the boolean false.]*/
      /*Codes_SRS_NODE_DEVICE_CLIENT_41_006: [The `notifyBlobUploadStatus` method shall throw a `ReferenceError` if `statusCode` is falsy but not the number 0.]*/
      /*Codes_SRS_NODE_DEVICE_CLIENT_41_007: [The `notifyBlobUploadStatus` method shall throw a `ReferenceError` if `statusDescription` is falsy but not an empty string.]*/
      if (!correlationId) throw new ReferenceError('correlationId cannot be \' ' + correlationId + ' \'');
      if (!isSuccess && typeof(isSuccess) !== 'boolean' ) throw new ReferenceError('isSuccess cannot be \' ' + isSuccess + ' \'');
      if (!statusCode && !(statusCode === 0)) throw new ReferenceError('statusCode cannot be \' ' + statusCode + ' \'');
      if (!statusDescription && statusDescription !== '') throw new ReferenceError('statusDescription cannot be \' ' + statusDescription + ' \'.');
      const retryOp = new RetryOperation('notifyBlobUploadStatus', this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        const uploadResult = { isSuccess: isSuccess, statusCode: statusCode, statusDescription: statusDescription };
        /*Codes_SRS_NODE_DEVICE_CLIENT_41_015: [The `notifyBlobUploadStatus` method shall call the `notifyUploadComplete` method via the internal `_fileUploadApi` class.]*/
        this._fileUploadApi.notifyUploadComplete(correlationId, uploadResult, opCallback);
      }, (err) => {
        /*Codes_SRS_NODE_DEVICE_CLIENT_41_008: [The `notifyBlobUploadStatus` method shall call the `_callback` callback with `err` if the notification fails.]*/
        /*Codes_SRS_NODE_DEVICE_CLIENT_41_009: [The `notifyBlobUploadStatus` method shall call the `_callback` callback with no parameters if the notification succeeds.]*/
        safeCallback(_callback, err);
      });
    }, callback);
  }


  private _enableC2D(callback: (err?: Error) => void): void {
    debug('enabling C2D');
    const retryOp = new RetryOperation('_enableC2D', this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.enableC2D(opCallback);
    }, (err) => {
      if (!err) {
        debug('enabled C2D');
      } else {
        debugErrors('Error while enabling C2D: ' + err);
      }
      callback(err);
    });
  }

  private _disableC2D(callback: (err?: Error) => void): void {
    debug('disabling C2D');
    this._transport.disableC2D((err) => {
      if (!err) {
        debug('disabled C2D');
      } else {
        debugErrors('Error while disabling C2D: ' + err);
      }
      callback(err);
    });
  }

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
  static fromConnectionString(connStr: string, transportCtor: any): Client {
    /*Codes_SRS_NODE_DEVICE_CLIENT_05_003: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
    if (!connStr) throw new ReferenceError('connStr is \'' + connStr + '\'');

    const cn = ConnectionString.parse(connStr);

    /*Codes_SRS_NODE_DEVICE_CLIENT_16_087: [The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor.]*/
    let authenticationProvider: AuthenticationProvider;

    if (cn.SharedAccessKey) {
      authenticationProvider = SharedAccessKeyAuthenticationProvider.fromConnectionString(connStr);
    } else if (cn.SharedAccessSignature) {
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_094: [The `fromConnectionString` method shall create a new `SharedAccessSignatureAuthenticationProvider` object with the connection string passed as argument if it contains a SharedAccessSignature parameter and pass this object to the transport constructor.]*/
      authenticationProvider = SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(cn.SharedAccessSignature);
    } else {
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_093: [The `fromConnectionString` method shall create a new `X509AuthorizationProvider` object with the connection string passed as argument if it contains an X509 parameter and pass this object to the transport constructor.]*/
      authenticationProvider = new X509AuthenticationProvider({
        host: cn.HostName,
        deviceId: cn.DeviceId
      });
    }

    /*Codes_SRS_NODE_DEVICE_CLIENT_05_006: [The fromConnectionString method shall return a new instance of the Client object, as by a call to new Client(new transportCtor(...)).]*/
    return new Client(new transportCtor(authenticationProvider), null, new BlobUploadClient(authenticationProvider), new DefaultFileUploadApi(authenticationProvider));
  }

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
  static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor: any): Client {
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_029: [The fromSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature argument is falsy.] */
    if (!sharedAccessSignature) throw new ReferenceError('sharedAccessSignature is \'' + sharedAccessSignature + '\'');

    /*Codes_SRS_NODE_DEVICE_CLIENT_16_088: [The `fromSharedAccessSignature` method shall create a new `SharedAccessSignatureAuthorizationProvider` object with the shared access signature passed as argument, and pass this object to the transport constructor.]*/
    const authenticationProvider = SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(sharedAccessSignature);

    /*Codes_SRS_NODE_DEVICE_CLIENT_16_030: [The fromSharedAccessSignature method shall return a new instance of the Client object] */
    return new Client(new transportCtor(authenticationProvider), null, new BlobUploadClient(authenticationProvider), new DefaultFileUploadApi(authenticationProvider));
  }

  /**
   * @method                        module:azure-iot-device.Client.fromAuthenticationMethod
   * @description                   Creates an IoT Hub device client from the given authentication method and using the given transport type.
   * @param authenticationProvider  Object used to obtain the authentication parameters for the IoT hub.
   * @param transportCtor           Transport protocol used to connect to IoT hub.
   */
  static fromAuthenticationProvider(authenticationProvider: AuthenticationProvider, transportCtor: any): Client {
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_089: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy.]*/
    if (!authenticationProvider) {
      throw new ReferenceError('authenticationMethod cannot be \'' + authenticationProvider + '\'');
    }

    /*Codes_SRS_NODE_DEVICE_CLIENT_16_092: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy.]*/
    if (!transportCtor) {
      throw new ReferenceError('transportCtor cannot be \'' + transportCtor + '\'');
    }

    /*Codes_SRS_NODE_DEVICE_CLIENT_16_090: [The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor.]*/
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_091: [The `fromAuthenticationProvider` method shall return a `Client` object configured with a new instance of a transport created using the `transportCtor` argument.]*/
    return new Client(new transportCtor(authenticationProvider), null, new BlobUploadClient(authenticationProvider), new DefaultFileUploadApi(authenticationProvider));
  }
}
