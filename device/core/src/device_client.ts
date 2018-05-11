// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Stream } from 'stream';
import { EventEmitter } from 'events';

import { errors, results, Message, AuthenticationProvider, RetryPolicy } from 'azure-iot-common';
import { InternalClient, DeviceTransport } from './internal_client';
import { BlobUploadClient } from './blob_upload';
import { DeviceMethodRequest, DeviceMethodResponse } from './device_method';
import { DeviceClientOptions } from './interfaces';
import { Twin  } from './twin';

/**
 * IoT Hub device client used to connect a device with an Azure IoT hub.
 *
 * Users of the SDK should call one of the factory methods,
 * {@link azure-iot-device.Client.fromConnectionString|fromConnectionString}
 * or {@link azure-iot-device.Client.fromSharedAccessSignature|fromSharedAccessSignature}
 * to create an IoT Hub device client.
 */
export class Client extends EventEmitter {
  private _internalClient: InternalClient;

  /**
   * @constructor
   * @param {Object}  transport         An object that implements the interface
   *                                    expected of a transport object, e.g.,
   *                                    {@link azure-iot-device-http.Http|Http}.
   * @param {string}  connStr           A connection string (optional: when not provided, updateSharedAccessSignature must be called to set the SharedAccessSignature token directly).
   * @param {Object}  blobUploadClient  An object that is capable of uploading a stream to a blob.
   */
  constructor(transport: DeviceTransport, connStr?: string, blobUploadClient?: BlobUploadClient) {
    super();
    this._internalClient = new InternalClient(transport, connStr, blobUploadClient);

    this.on('newListener', (event, listener) => {
      if (event === 'inputMessage') {
        throw new errors.ArgumentError('The Client object does not support \'inputMessage\' events.  You need to use a ModuleClient object for that.');
      }
      this._internalClient.on(event, listener);
    });

    this.on('removeListener', (event, listener) => {
      this._internalClient.removeListener(event, listener);
    });
  }

  /**
   * @description       Registers the `callback` to be invoked when a
   *                    cloud-to-device method call is received by the client
   *                    for the given `methodName`.
   *
   * @param {String}   methodName   The name of the method for which the callback
   *                                is to be registered.
   * @param {Function} callback     The callback to be invoked when the C2D method
   *                                call is received.
   *
   * @throws {ReferenceError}       If the `methodName` or `callback` parameter
   *                                is falsy.
   * @throws {TypeError}            If the `methodName` parameter is not a string
   *                                or if the `callback` is not a function.
   */
  onDeviceMethod(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
    this._internalClient.onDeviceMethod(methodName, callback);
  }

  /**
   * @description       Updates the Shared Access Signature token used by the transport to authenticate with the IoT Hub service.
   *
   * @param {String}   sharedAccessSignature   The new SAS token to use.
   * @param {Function} done       The callback to be invoked when `updateSharedAccessSignature`
   *                              completes execution.
   *
   * @throws {ReferenceError}     If the sharedAccessSignature parameter is falsy.
   * @throws {ReferenceError}     If the client uses x509 authentication.
   */
  updateSharedAccessSignature(sharedAccessSignature: string, updateSasCallback?: (err?: Error, result?: results.SharedAccessSignatureUpdated) => void): void {
    this._internalClient.updateSharedAccessSignature(sharedAccessSignature, updateSasCallback);
  }

  /**
   * @description       Call the transport layer CONNECT function if the
   *                    transport layer implements it
   *
   * @param {Function} openCallback  The callback to be invoked when `open`
   *                                 completes execution.
   */
  open(openCallback: (err?: Error, result?: results.Connected) => void): void {
    this._internalClient.open(openCallback);
  }

  /**
   * @description       The [sendEvent]{@link sendEvent} method sends an event message
   *                    to the IoT Hub as the device indicated by the connection string passed
   *                    via the constructor.
   *
   * @param {azure-iot-common.Message}  message            The [message]{@link azure-iot-common.Message} to be sent.
   * @param {Function}                  sendEventCallback  The callback to be invoked when `sendEvent` completes execution.
   */
  sendEvent(message: Message, sendEventCallback?: (err?: Error, result?: results.MessageEnqueued) => void): void {
    this._internalClient.sendEvent(message, sendEventCallback);
  }

  /**
   * @description       The [sendEventBatch]{@link sendEventBatch} method sends a list
   *                    of event messages to the IoT Hub as the device indicated by the connection
   *                    string passed via the constructor.
   *
   * @param {array<Message>} messages               Array of [Message]{@link azure-iot-common.Message}
   *                                                objects to be sent as a batch.
   * @param {Function}      sendEventBatchCallback  The callback to be invoked when
   *                                                `sendEventBatch` completes execution.
   */
  sendEventBatch(messages: Message[], sendEventBatchCallback?: (err?: Error, result?: results.MessageEnqueued) => void): void {
    this._internalClient.sendEventBatch(messages, sendEventBatchCallback);
  }

  /**
   * @description      The `close` method directs the transport to close the current connection to the IoT Hub instance
   *
   * @param {Function} closeCallback    The callback to be invoked when the connection has been closed.
   */
  close(closeCallback?: (err?: Error, result?: results.Disconnected) => void): void {
    this._internalClient.close(closeCallback);
  }

  /**
   * @deprecated      Use Client.setOptions instead.
   * @description     The `setTransportOptions` method configures transport-specific options for the client and its underlying transport object.
   *
   * @param {Object}      options     The options that shall be set (see transports documentation).
   * @param {Function}    done        The callback that shall be invoked with either an error or a result object.
   */
  setTransportOptions(options: any, done?: (err?: Error, result?: results.TransportConfigured) => void): void {
    this._internalClient.setTransportOptions(options, done);
  }

  /**
   * @description     The `setOptions` method let the user configure the client.
   *
   * @param  {Object}    options  The options structure
   * @param  {Function}  done     The callback that shall be called when setOptions is finished.
   *
   * @throws {ReferenceError}     If the options structure is falsy
   */
  setOptions(options: DeviceClientOptions, done?: (err?: Error, result?: results.TransportConfigured) => void): void {
    this._internalClient.setOptions(options, done);
  }

  /**
   * @description      The `complete` method directs the transport to settle the message passed as argument as 'completed'.
   *
   * @param {Message}  message           The message to settle.
   * @param {Function} completeCallback  The callback to call when the message is completed.
   *
   * @throws {ReferenceError} If the message is falsy.
   */
  complete(message: Message, completeCallback: (err?: Error, result?: results.MessageCompleted) => void): void {
    this._internalClient.complete(message, completeCallback);
  }

  /**
   * @description      The `reject` method directs the transport to settle the message passed as argument as 'rejected'.
   *
   * @param {Message}  message         The message to settle.
   * @param {Function} rejectCallback  The callback to call when the message is rejected.
   *
   * @throws {ReferenceException} If the message is falsy.
   */
  reject(message: Message, rejectCallback: (err?: Error, result?: results.MessageRejected) => void): void {
    this._internalClient.reject(message, rejectCallback);
  }

  /**
   * @description      The `abandon` method directs the transport to settle the message passed as argument as 'abandoned'.
   *
   * @param {Message}  message          The message to settle.
   * @param {Function} abandonCallback  The callback to call when the message is abandoned.
   *
   * @throws {ReferenceException} If the message is falsy.
   */
  abandon(message: Message, abandonCallback: (err?: Error, result?: results.MessageAbandoned) => void): void {
    this._internalClient.abandon(message, abandonCallback);
  }

  /**
   * @description      The `uploadToBlob` method uploads a stream to a blob.
   *
   * @param {String}   blobName         The name to use for the blob that will be created with the content of the stream.
   * @param {Stream}   stream           The data to that should be uploaded to the blob.
   * @param {Number}   streamLength     The size of the data to that should be uploaded to the blob.
   * @param {Function} done             The callback to call when the upload is complete.
   *
   * @throws {ReferenceException} If blobName or stream or streamLength is falsy.
   */
  uploadToBlob(blobName: string, stream: Stream, streamLength: number, done: (err?: Error) => void): void {
    this._internalClient.uploadToBlob(blobName, stream, streamLength, done);
  }

  /**
   * @description      The `getTwin` method creates a Twin object and establishes a connection with the Twin service.
   *
   * @param {Function} done             The callback to call when the connection is established.
   *
   */
  getTwin(done: (err?: Error, twin?: Twin) => void): void {
    this._internalClient.getTwin(done);
  }

  /**
   * Sets the retry policy used by the client on all operations. The default is {@link azure-iot-common.ExponentialBackoffWithJitter|ExponentialBackoffWithJitter}.
   * @param policy {RetryPolicy}  The retry policy that should be used for all future operations.
   */
  setRetryPolicy(policy: RetryPolicy): void {
    this._internalClient.setRetryPolicy(policy);
  }

  /**
   * @description       Creates an IoT Hub device client from the given
   *                    connection string using the given transport type.
   *
   * @param {String}    connStr       A connection string which encapsulates "device
   *                                  connect" permissions on an IoT hub.
   * @param {Function}  Transport     A transport constructor.
   *
   * @throws {ReferenceError}         If the connStr parameter is falsy.
   *
   */
  static fromConnectionString(connStr: string, transportCtor: any): Client {
    return InternalClient.fromConnectionString(connStr, transportCtor, Client) as Client;
  }

  /**
   * @description       Creates an IoT Hub device client from the given
   *                    shared access signature using the given transport type.
   *
   * @param {String}    sharedAccessSignature      A shared access signature which encapsulates "device
   *                                  connect" permissions on an IoT hub.
   * @param {Function}  Transport     A transport constructor.
   *
   * @throws {ReferenceError}         If the connStr parameter is falsy.
   *
   */
  static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor: any): Client {
    return InternalClient.fromSharedAccessSignature(sharedAccessSignature, transportCtor, Client) as Client;
  }

  /**
   * @description                   Creates an IoT Hub device client from the given authentication method and using the given transport type.
   * @param authenticationProvider  Object used to obtain the authentication parameters for the IoT hub.
   * @param transportCtor           Transport protocol used to connect to IoT hub.
   */
  static fromAuthenticationProvider(authenticationProvider: AuthenticationProvider, transportCtor: any): Client {
    return InternalClient.fromAuthenticationProvider(authenticationProvider, transportCtor, Client) as Client;
  }
}
