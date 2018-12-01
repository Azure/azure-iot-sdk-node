// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Stream } from 'stream';
import * as dbg from 'debug';
const debug = dbg('azure-iot-device:InternalClient');

import { AuthenticationProvider, RetryOperation, ConnectionString, results, Callback, ErrorCallback, callbackToPromise } from 'azure-iot-common';
import { InternalClient, DeviceTransport } from './internal_client';
import { BlobUploadClient } from './blob_upload';
import { SharedAccessSignatureAuthenticationProvider } from './sas_authentication_provider';
import { X509AuthenticationProvider } from './x509_authentication_provider';
import { SharedAccessKeyAuthenticationProvider } from './sak_authentication_provider';
import { DeviceMethodRequest, DeviceMethodResponse } from './device_method';

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
  private _c2dEnabled: boolean;
  private _deviceDisconnectHandler: (err?: Error, result?: any) => void;
  private blobUploadClient: BlobUploadClient; // Casing is wrong and should be corrected.
  /**
   * @constructor
   * @param {Object}  transport         An object that implements the interface
   *                                    expected of a transport object, e.g.,
   *                                    {@link azure-iot-device-http.Http|Http}.
   * @param {string}  connStr           A connection string (optional: when not provided, updateSharedAccessSignature must be called to set the SharedAccessSignature token directly).
   * @param {Object}  blobUploadClient  An object that is capable of uploading a stream to a blob.
   */
  constructor(transport: DeviceTransport, connStr?: string, blobUploadClient?: BlobUploadClient) {
    super(transport, connStr);
    this.blobUploadClient = blobUploadClient;
    this._c2dEnabled = false;

    this.on('removeListener', (eventName) => {
      if (eventName === 'message' && this.listeners('message').length === 0) {
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_005: [The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `message` event.]*/
        this._disableC2D((err) => {
          if (err) {
            this.emit('error', err);
          }
        });
      }
    });

    this.on('newListener', (eventName) => {
      if (eventName === 'message') {
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_004: [The client shall start listening for messages from the service whenever there is a listener subscribed to the `message` event.]*/
        this._enableC2D((err) => {
          if (err) {
            this.emit('error', err);
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
      debug('transport disconnect event: ' + (err ? err.toString() : 'no error'));
      if (err && this._retryPolicy.shouldRetry(err)) {
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_097: [If the transport emits a `disconnect` event while the client is subscribed to c2d messages the retry policy shall be used to reconnect and re-enable the feature using the transport `enableC2D` method.]*/
        if (this._c2dEnabled) {
          this._c2dEnabled = false;
          debug('re-enabling C2D link');
          this._enableC2D((err) => {
            if (err) {
              /*Codes_SRS_NODE_DEVICE_CLIENT_16_102: [If the retry policy fails to reestablish the C2D functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
              this.emit('disconnect', new results.Disconnected(err));
            }
          });
        }
      }
    };

    this._transport.on('disconnect', this._deviceDisconnectHandler);
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
      super.close(closeCallback);
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

      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_040: [The `uploadToBlob` method shall call the `_callback` callback with an `Error` object if the upload fails.]*/
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_041: [The `uploadToBlob` method shall call the `_callback` callback no parameters if the upload succeeds.]*/
        this.blobUploadClient.uploadToBlob(blobName, stream, streamLength, opCallback);
      }, (err, result) => {
        safeCallback(_callback, err, result);
      });
    }, callback);
  }

  private _enableC2D(callback: (err?: Error) => void): void {
    if (!this._c2dEnabled) {
      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        this._transport.enableC2D(opCallback);
      }, (err) => {
        if (!err) {
          this._c2dEnabled = true;
        }
        callback(err);
      });
    } else {
      callback();
    }
  }

  private _disableC2D(callback: (err?: Error) => void): void {
    if (this._c2dEnabled) {
      this._transport.disableC2D((err) => {
        if (!err) {
          this._c2dEnabled = false;
        }
        callback(err);
      });
    } else {
      callback();
    }
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
    return new Client(new transportCtor(authenticationProvider), null, new BlobUploadClient(authenticationProvider));
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
    return new Client(new transportCtor(authenticationProvider), null, new BlobUploadClient(authenticationProvider));
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
    return new Client(new transportCtor(authenticationProvider), null, new BlobUploadClient(authenticationProvider));
  }
}
