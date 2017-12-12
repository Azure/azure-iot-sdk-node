// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Stream } from 'stream';
import { EventEmitter } from 'events';
import * as dbg from 'debug';
const debug = dbg('azure-iot-device:Client');

import { anHourFromNow, results, errors, Message, X509 } from 'azure-iot-common';
import { SharedAccessSignature as CommonSharedAccessSignature } from 'azure-iot-common';
import { ExponentialBackOffWithJitter, RetryPolicy, RetryOperation } from 'azure-iot-common';
import * as ConnectionString from './connection_string.js';
import * as SharedAccessSignature from './shared_access_signature.js';
import { BlobUploadClient } from './blob_upload';
import { DeviceMethodRequest, DeviceMethodResponse } from './device_method';
import { Twin } from './twin';
import { DiagnosticClient } from './client_diagnostic';

/**
 * @private
 * Default maximum operation timeout for client operations: 4 minutes.
 */
const MAX_OPERATION_TIMEOUT = 240000;

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
export class Client extends EventEmitter {
  // SAS token created by the client have a lifetime of 60 minutes, renew every 45 minutes
  /**
   * @private
   */
  static sasRenewalInterval: number = 2700000;

  // Can't be marked private because they are used in the Twin class.
  /**
   * @private
   */
  _transport: Client.Transport;
  /**
   * @private
   */
  _twin: Twin;

  /**
   * @private
   * Maximum timeout (in milliseconds) used to consider an operation failed.
   * The operation will be retried according to the retry policy set with {@link azure-iot-device.Client.setRetryPolicy} method (or {@link azure-iot-common.ExponentialBackoffWithJitter} by default) until this value is reached.)
   */
  private _maxOperationTimeout: number;

  private _connectionString: string;
  private _useAutomaticRenewal: boolean;
  private _sasRenewalTimeout: number;
  private _methodCallbackMap: any;
  private _disconnectHandler: (err?: Error, result?: any) => void;
  private blobUploadClient: BlobUploadClient; // TODO: wrong casing/naming convention
  private _c2dEnabled: boolean;
  private _methodsEnabled: boolean;

  private _retryPolicy: RetryPolicy;
  private _diagnosticClient: DiagnosticClient;

  /**
   * @constructor
   * @param {Object}  transport         An object that implements the interface
   *                                    expected of a transport object, e.g.,
   *                                    {@link azure-iot-device-http.Http|Http}.
   * @param {string}  connStr           A connection string (optional: when not provided, updateSharedAccessSignature must be called to set the SharedAccessSignature token directly).
   * @param {Object}  blobUploadClient  An object that is capable of uploading a stream to a blob.
   */
  constructor(transport: Client.Transport, connStr?: string, blobUploadClient?: BlobUploadClient) {
    /*Codes_SRS_NODE_DEVICE_CLIENT_05_001: [The Client constructor shall throw ReferenceError if the transport argument is falsy.]*/
    if (!transport) throw new ReferenceError('transport is \'' + transport + '\'');

    super();
    this._c2dEnabled = false;
    this._methodsEnabled = false;
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_026: [The Client constructor shall accept a connection string as an optional second argument] */
    this._connectionString = connStr;

    /*Codes_SRS_NODE_DEVICE_CLIENT_16_027: [If a connection string argument is provided and is using SharedAccessKey authentication, the Client shall automatically generate and renew SAS tokens.] */
    this._useAutomaticRenewal = !!(this._connectionString && ConnectionString.parse(this._connectionString).SharedAccessKey);

    this.blobUploadClient = blobUploadClient;

    this._transport = transport;
    this._transport.on('message', (msg) => {
      this.emit('message', msg);
    });

    this._transport.on('error', (err) => {
      // errors right now bubble up through the disconnect handler.
      // ultimately we would like to get rid of that disconnect event and rely on the error event instead
      debug('Transport error: ' + err.toString());
    });

    this._methodCallbackMap = {};

    this.on('removeListener', (eventName) => {
      if (eventName === 'message' && this.listeners('message').length === 0) {
        this._disableC2D((err) => {
          if (err) {
            this.emit('error', err);
          }
        });
      }
    });

    this.on('newListener', (eventName) => {
      if (eventName === 'message') {
        this._enableC2D((err) => {
          if (err) {
            this.emit('error', err);
          }
        });
      }
    });

    if (this._useAutomaticRenewal) {
      this._sasRenewalTimeout = setTimeout(this._renewSharedAccessSignature.bind(this), Client.sasRenewalInterval);
    }

    this._disconnectHandler = (err) => {
      debug('transport disconnect event: ' + (err ? err.toString() : 'no error'));
      if (err && this._retryPolicy.shouldRetry(err)) {
        if (this._c2dEnabled) {
          this._c2dEnabled = false;
          debug('re-enabling C2D link');
          this._enableC2D((err) => {
            if (err) {
              this.emit('disconnect', new results.Disconnected(err));
            }
          });
        }

        if (this._methodsEnabled) {
          this._methodsEnabled = false;
          debug('re-enabling Methods link');
          this._enableMethods((err) => {
            if (err) {
              this.emit('disconnect', new results.Disconnected(err));
            }
          });
        }
      } else {
        this.emit('disconnect', new results.Disconnected(err));
      }
    };
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_045: [If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.]*/
    this._transport.on('disconnect', this._disconnectHandler);

    this._retryPolicy = new ExponentialBackOffWithJitter();
    this._maxOperationTimeout = MAX_OPERATION_TIMEOUT;
  }

  /**
   * @method            module:azure-iot-device.Client#onDeviceMethod
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
    // validate input args
    this._validateDeviceMethodInputs(methodName, callback);

    this._methodCallbackMap[methodName] = callback;
    this._addMethodCallback(methodName, callback);

    this._enableMethods((err) => {
      if (err) {
        this.emit('error', err);
      }
    });
  }

  /*Codes_SRS_NODE_DEVICE_CLIENT_05_016: [When a Client method encounters an error in the transport, the callback function (indicated by the done argument) shall be invoked with the following arguments:
  err - the standard JavaScript Error object, with a response property that points to a transport-specific response object, and a responseBody property that contains the body of the transport response.]*/
  /*Codes_SRS_NODE_DEVICE_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
  err - null
  response - a transport-specific response object]*/

  /**
   * @method            module:azure-iot-device.Client#updateSharedAccessSignature
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
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_031: [The updateSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature parameter is falsy.]*/
    if (!sharedAccessSignature) throw new ReferenceError('sharedAccessSignature is falsy');
    if (this._useAutomaticRenewal) debug('calling updateSharedAccessSignature while using automatic sas renewal');
    /*Codes_SRS_NODE_DEVICE_CLIENT_06_002: [The `updateSharedAccessSignature` method shall throw a `ReferenceError` if the client was created using x509.]*/
    if (this._connectionString && ConnectionString.parse(this._connectionString).x509) throw new ReferenceError('client uses x509');


    this.blobUploadClient.updateSharedAccessSignature(sharedAccessSignature);

    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.updateSharedAccessSignature(sharedAccessSignature, opCallback);
    }, (err, result) => {
      if (!err) {
        this.emit('_sharedAccessSignatureUpdated');
      }
      safeCallback(updateSasCallback, err, result);
    });
  }

  /**
   * @method            module:azure-iot-device.Client#open
   * @description       Call the transport layer CONNECT function if the
   *                    transport layer implements it
   *
   * @param {Function} openCallback  The callback to be invoked when `open`
   *                                 completes execution.
   */
  open(openCallback: (err?: Error, result?: results.Connected) => void): void {
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.connect(opCallback);
    }, (connectErr, connectResult) => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_060: [The `open` method shall call the `openCallback` callback with a null error object and a `results.Connected()` result object if the transport is already connected, doesn't need to connect or has just connected successfully.]*/
      safeCallback(openCallback, connectErr, connectResult);
    });
  }

  /**
   * @method            module:azure-iot-device.Client#sendEvent
   * @description       The [sendEvent]{@link azure-iot-device.Client.sendEvent} method sends an event message
   *                    to the IoT Hub as the device indicated by the connection string passed
   *                    via the constructor.
   *
   * @param {azure-iot-common.Message}  message            The [message]{@link azure-iot-common.Message} to be sent.
   * @param {Function}                  sendEventCallback  The callback to be invoked when `sendEvent` completes execution.
   */
  sendEvent(message: Message, sendEventCallback?: (err?: Error, result?: results.MessageEnqueued) => void): void {
    /* Codes_SRS_NODE_DEVICE_CLIENT_26_002: [The sendEvent method shall add diagnostic information if necessary.] */
    if (this._diagnosticClient) {
      this._diagnosticClient.addDiagnosticInfoIfNecessary(message);
    }
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_05_007: [The sendEvent method shall send the event indicated by the message argument via the transport associated with the Client instance.]*/
      this._transport.sendEvent(message, opCallback);
    }, (err, result) => {
      safeCallback(sendEventCallback, err, result);
    });
  }

  /**
   * @method            module:azure-iot-device.Client#sendEventBatch
   * @description       The [sendEventBatch]{@link azure-iot-device.Client.sendEventBatch} method sends a list
   *                    of event messages to the IoT Hub as the device indicated by the connection
   *                    string passed via the constructor.
   *
   * @param {array<Message>} messages               Array of [Message]{@link azure-iot-common.Message}
   *                                                objects to be sent as a batch.
   * @param {Function}      sendEventBatchCallback  The callback to be invoked when
   *                                                `sendEventBatch` completes execution.
   */
  sendEventBatch(messages: Message[], sendEventBatchCallback?: (err?: Error, result?: results.MessageEnqueued) => void): void {
    /* Codes_SRS_NODE_DEVICE_CLIENT_26_003: [The sendEventBatch method shall add diagnostic information to all messages if necessary.] */
    if (this._diagnosticClient) {
      for (let message of messages) {
        this._diagnosticClient.addDiagnosticInfoIfNecessary(message);
      }
    }
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_05_008: [The sendEventBatch method shall send the list of events (indicated by the messages argument) via the transport associated with the Client instance.]*/
      this._transport.sendEventBatch(messages, opCallback);
    }, (err, result) => {
      safeCallback(sendEventBatchCallback, err, result);
    });
  }

  /**
   * @method           module:azure-iot-device.Client#close
   * @description      The `close` method directs the transport to close the current connection to the IoT Hub instance
   *
   * @param {Function} closeCallback    The callback to be invoked when the connection has been closed.
   */
  close(closeCallback?: (err?: Error, result?: results.Disconnected) => void): void {
    this._closeTransport((err, result) => {
      safeCallback(closeCallback, err, result);
    });
  }

  /**
   * @deprecated      Use Client.setOptions instead.
   * @method          module:azure-iot-device.Client#setTransportOptions
   * @description     The `setTransportOptions` method configures transport-specific options for the client and its underlying transport object.
   *
   * @param {Object}      options     The options that shall be set (see transports documentation).
   * @param {Function}    done        The callback that shall be invoked with either an error or a result object.
   */
  setTransportOptions(options: any, done?: (err?: Error, result?: results.TransportConfigured) => void): void {
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_024: [The ‘setTransportOptions’ method shall throw a ‘ReferenceError’ if the options object is falsy] */
    if (!options) throw new ReferenceError('options cannot be falsy.');
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_025: [The ‘setTransportOptions’ method shall throw a ‘NotImplementedError’ if the transport doesn’t implement a ‘setOption’ method.] */
    if (typeof this._transport.setOptions !== 'function') throw new errors.NotImplementedError('setOptions does not exist on this transport');

    const clientOptions = {
      http: {
        receivePolicy: options
      }
    };

    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_021: [The ‘setTransportOptions’ method shall call the ‘setOptions’ method on the transport object.]*/
      this._transport.setOptions(clientOptions, opCallback);
    }, (err) => {
      if (err) {
        safeCallback(done, err);
      } else {
        safeCallback(done, null, new results.TransportConfigured());
      }
    });
  }

  /**
   * @method          module:azure-iot-device.Client#setOptions
   * @description     The `setOptions` method let the user configure the client.
   *
   * @param  {Object}    options  The options structure
   * @param  {Function}  done     The callback that shall be called when setOptions is finished.
   *
   * @throws {ReferenceError}     If the options structure is falsy
   */
  setOptions(options: any, done?: (err?: Error, result?: results.TransportConfigured) => void): void {
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_042: [The `setOptions` method shall throw a `ReferenceError` if the options object is falsy.]*/
    if (!options) throw new ReferenceError('options cannot be falsy.');

    // Making this an operation that can be retried because we cannot assume the transport's behavior (whether it's going to disconnect/reconnect, etc).
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.setOptions(options, opCallback);
    }, (err) => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_043: [The `done` callback shall be invoked no parameters when it has successfully finished setting the client and/or transport options.]*/
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_044: [The `done` callback shall be invoked with a standard javascript `Error` object and no result object if the client could not be configured as requested.]*/
      safeCallback(done, err);
    });
  }

  /**
   * @method           module:azure-iot-device.Client#complete
   * @description      The `complete` method directs the transport to settle the message passed as argument as 'completed'.
   *
   * @param {Message}  message           The message to settle.
   * @param {Function} completeCallback  The callback to call when the message is completed.
   *
   * @throws {ReferenceError} If the message is falsy.
   */
  complete(message: Message, completeCallback: (err?: Error, result?: results.MessageCompleted) => void): void {
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_016: [The ‘complete’ method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
    if (!message) throw new ReferenceError('message is \'' + message + '\'');

    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.complete(message, opCallback);
    }, (err, result) => {
      safeCallback(completeCallback, err, result);
    });
  }

  /**
   * @method           module:azure-iot-device.Client#reject
   * @description      The `reject` method directs the transport to settle the message passed as argument as 'rejected'.
   *
   * @param {Message}  message         The message to settle.
   * @param {Function} rejectCallback  The callback to call when the message is rejected.
   *
   * @throws {ReferenceException} If the message is falsy.
   */
  reject(message: Message, rejectCallback: (err?: Error, result?: results.MessageRejected) => void): void {
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_018: [The reject method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
    if (!message) throw new ReferenceError('message is \'' + message + '\'');
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.reject(message, opCallback);
    }, (err, result) => {
      safeCallback(rejectCallback, err, result);
    });
  }

  /**
   * @method           module:azure-iot-device.Client#abandon
   * @description      The `abandon` method directs the transport to settle the message passed as argument as 'abandoned'.
   *
   * @param {Message}  message          The message to settle.
   * @param {Function} abandonCallback  The callback to call when the message is abandoned.
   *
   * @throws {ReferenceException} If the message is falsy.
   */
  abandon(message: Message, abandonCallback: (err?: Error, result?: results.MessageAbandoned) => void): void {
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_017: [The abandon method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
    if (!message) throw new ReferenceError('message is \'' + message + '\'');

    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.abandon(message, opCallback);
    }, (err, result) => {
      safeCallback(abandonCallback, err, result);
    });
  }

  /**
   * @method           module:azure-iot-device.Client#uploadToBlob
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
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_037: [The `uploadToBlob` method shall throw a `ReferenceError` if `blobName` is falsy.]*/
    if (!blobName) throw new ReferenceError('blobName cannot be \'' + blobName + '\'');
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_038: [The `uploadToBlob` method shall throw a `ReferenceError` if `stream` is falsy.]*/
    if (!stream) throw new ReferenceError('stream cannot be \'' + stream + '\'');
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_039: [The `uploadToBlob` method shall throw a `ReferenceError` if `streamLength` is falsy.]*/
    if (!streamLength) throw new ReferenceError('streamLength cannot be \'' + streamLength + '\'');

    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_040: [The `uploadToBlob` method shall call the `done` callback with an `Error` object if the upload fails.]*/
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_041: [The `uploadToBlob` method shall call the `done` callback no parameters if the upload succeeds.]*/
      this.blobUploadClient.uploadToBlob(blobName, stream, streamLength, opCallback);
    }, (err, result) => {
      safeCallback(done, err, result);
    });
  }

  /**
   * @method           module:azure-iot-device.Client#getTwin
   * @description      The `getTwin` method creates a Twin object and establishes a connection with the Twin service.
   *
   * @param {Function} done             The callback to call when the connection is established.
   *
   */
  getTwin(done: (err?: Error, twin?: Twin) => void, twin?: Twin): void {
    /* Codes_SRS_NODE_DEVICE_CLIENT_18_001: [** The `getTwin` method shall call the `azure-iot-device-core!Twin.fromDeviceClient` method to create the device client object. **]** */
    /* Codes_SRS_NODE_DEVICE_CLIENT_18_002: [** The `getTwin` method shall pass itself as the first parameter to `fromDeviceClient` and it shall pass the `done` method as the second parameter. **]**  */
    /* Codes_SRS_NODE_DEVICE_CLIENT_18_003: [** The `getTwin` method shall use the second parameter (if it is not falsy) to call `fromDeviceClient` on. **]**    */
    (twin || require('./twin.js').Twin).fromDeviceClient(this, done);
  }

  /**
   * Sets the retry policy used by the client on all operations. The default is {@link azure-iot-common.ExponentialBackoffWithJitter|ExponentialBackoffWithJitter}.
   * @param policy {RetryPolicy}  The retry policy that should be used for all future operations.
   */
  setRetryPolicy(policy: RetryPolicy): void {
    /*Codes_SRS_NODE_DEVICE_CLIENT_16_083: [The `setRetryPolicy` method shall throw a `ReferenceError` if the policy object is falsy.]*/
    if (!policy) {
      throw new ReferenceError('\'policy\' cannot be \'' + policy + '\'');
    } else {
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_084: [The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `shouldRetry` method.]*/
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_085: [The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `nextRetryTimeout` method.]*/
      if (typeof policy.shouldRetry !== 'function' || typeof policy.nextRetryTimeout !== 'function') {
        throw new errors.ArgumentError('A policy object must have a maxTimeout property that is a number and a nextRetryTimeout method.');
      }
    }

    /*Codes_SRS_NODE_DEVICE_CLIENT_16_086: [Any operation happening after a `setRetryPolicy` call should use the policy set during that call.]*/
    this._retryPolicy = policy;
  }

  /**
   * @method           module:azure-iot-device.Client#enableDiagnostics
   * @description      The `enableDiagnostics` method will set percentage value for diagnostic sampling
   *
   * @param {number}    percentage                            The value of diagnostic sampling rate.If not provided, will fetch from device twin.
   * @param {Function}  enableDiagnosticsCallback             The callback to call when enabled diagnostics.
   */
  enableDiagnostics(percentage?: number, enableDiagnosticsCallback?: (err?: Error) => void): void {
    // Codes_SRS_NODE_DEVICE_CLIENT_26_004: [The enableDiagnostics method shall throw an InvalidOperationError if the method is called twice.]
    if (this._diagnosticClient) {
      safeCallback(enableDiagnosticsCallback, new errors.InvalidOperationError('enableDiagnostics only allowed to be called once.'));
      return;
    }
    this._diagnosticClient = new DiagnosticClient();
    if (percentage !== null && typeof percentage !== 'undefined') {
      // Codes_SRS_NODE_DEVICE_CLIENT_26_005: [The enableDiagnostics method shall set percentage of diagnosticClient if percentage is provided.]
      this._diagnosticClient.setDiagSamplingPercentage(percentage);
      safeCallback(enableDiagnosticsCallback);
    } else {
      // Codes_SRS_NODE_DEVICE_CLIENT_26_006: [The enableDiagnostics method shall fetch cloud settings if percentage is not provided.]
      this.getTwin((error, twin) => {
        twin.on('properties.desired.' + DiagnosticClient.DIAGNOSTIC_TWIN_KEY_SAMPLING_PERCENTAGE, this._diagnosticClient.onDesiredTwinUpdate.bind(this._diagnosticClient, twin));
        safeCallback(enableDiagnosticsCallback);
      });
    }
  }

  private _validateDeviceMethodInputs(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
    // Codes_SRS_NODE_DEVICE_CLIENT_13_020: [ onDeviceMethod shall throw a ReferenceError if methodName is falsy. ]
    if (!methodName) {
      throw new ReferenceError('methodName cannot be \'' + methodName + '\'');
    }
    // Codes_SRS_NODE_DEVICE_CLIENT_13_024: [ onDeviceMethod shall throw a TypeError if methodName is not a string. ]
    if (typeof(methodName) !== 'string') {
      throw new TypeError('methodName\'s type is \'' + typeof(methodName) + '\'. A string was expected.');
    }

    // Codes_SRS_NODE_DEVICE_CLIENT_13_022: [ onDeviceMethod shall throw a ReferenceError if callback is falsy. ]
    if (!callback) {
      throw new ReferenceError('callback cannot be \'' + callback + '\'');
    }

    // Codes_SRS_NODE_DEVICE_CLIENT_13_025: [ onDeviceMethod shall throw a TypeError if callback is not a Function. ]
    if (typeof(callback) !== 'function') {
      throw new TypeError('callback\'s type is \'' + typeof(callback) + '\'. A function reference was expected.');
    }

    // Codes_SRS_NODE_DEVICE_CLIENT_13_023: [ onDeviceMethod shall throw an Error if a listener is already subscribed for a given method call. ]
    if (!!(this._methodCallbackMap[methodName])) {
      throw new Error('A handler for this method has already been registered with the client.');
    }
  }

  private _addMethodCallback(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
    const self = this;
    this._transport.onDeviceMethod(methodName, (message) => {
      // build the request object
      const request = new DeviceMethodRequest(
        message.requestId,
        message.methods.methodName,
        message.body
      );

      // build the response object
      const response = new DeviceMethodResponse(message.requestId, self._transport);

      // Codes_SRS_NODE_DEVICE_CLIENT_13_001: [ The onDeviceMethod method shall cause the callback function to be invoked when a cloud-to-device method invocation signal is received from the IoT Hub service. ]
      callback(request, response);
    });
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

  private _enableMethods(callback: (err?: Error) => void): void {
    if (!this._methodsEnabled) {
      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
        retryOp.retry((opCallback) => {
      this._transport.enableMethods(opCallback);
      }, (err) => {
        if (!err) {
          this._methodsEnabled = true;
        }
        callback(err);
      });
    } else {
      callback();
    }
  }

  // Currently there is no code making use of this function, because there is no "removeDeviceMethod" corresponding to "onDeviceMethod"
  // private _disableMethods(callback: (err?: Error) => void): void {
  //   if (this._methodsEnabled) {
  //     this._transport.disableMethods((err) => {
  //       if (!err) {
  //         this._methodsEnabled = false;
  //       }
  //       callback(err);
  //     });
  //   } else {
  //     callback();
  //   }
  // }

  private _renewSharedAccessSignature(): void {
    const cn = ConnectionString.parse(this._connectionString);
    const sas = SharedAccessSignature.create(cn.HostName, cn.DeviceId, cn.SharedAccessKey, anHourFromNow());
    this.updateSharedAccessSignature(sas.toString(), (err) => {
      if (this._useAutomaticRenewal) {
        this._sasRenewalTimeout = setTimeout(this._renewSharedAccessSignature.bind(this), Client.sasRenewalInterval);
      }
      if (err) {
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_006: [The ‘error’ event shall be emitted when an error occurred within the client code.] */
        this.emit('error', err);
      } else {
        this.emit('_sharedAccessSignatureUpdated');
      }
    });
  }

  private _closeTransport(closeCallback: (err?: Error, result?: any) => void): void {
    const onDisconnected = (err?: Error, result?: any): void => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_056: [The `close` method shall not throw if the `closeCallback` is not passed.]*/
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_055: [The `close` method shall call the `closeCallback` function when done with either a single Error object if it failed or null and a results.Disconnected object if successful.]*/
      safeCallback(closeCallback, err, result);
    };

    if (this._sasRenewalTimeout) {
      clearTimeout(this._sasRenewalTimeout);
    }

    this._disableC2D(() => {
      /*Codes_SRS_NODE_DEVICE_CLIENT_16_001: [The `close` function shall call the transport's `disconnect` function if it exists.]*/
      this._transport.disconnect((disconnectError, disconnectResult) => {
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_046: [The `close` method shall remove the listener that has been attached to the transport `disconnect` event.]*/
        this._transport.removeListener('disconnect', this._disconnectHandler);
        onDisconnected(disconnectError, disconnectResult);
      });
    });
  }

  /**
   * @method            module:azure-iot-device.Client.fromConnectionString
   * @description       Creates an IoT Hub device client from the given
   *                    connection string using the given transport type.
   *
   * @param {String}    connStr       A connection string which encapsulates "device
   *                                  connect" permissions on an IoT hub.
   * @param {Function}  Transport     A transport constructor.
   *
   * @throws {ReferenceError}         If the connStr parameter is falsy.
   *
   * @returns {module:azure-iothub.Client}
   */
  static fromConnectionString(connStr: string, transportCtor: any): Client {
    /*Codes_SRS_NODE_DEVICE_CLIENT_05_003: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
    if (!connStr) throw new ReferenceError('connStr is \'' + connStr + '\'');

    /*Codes_SRS_NODE_DEVICE_CLIENT_05_005: [fromConnectionString shall derive and transform the needed parts from the connection string in order to create a new instance of transportCtor.]*/
    const cn = ConnectionString.parse(connStr);

    let config: Client.Config = {
      host: cn.HostName,
      deviceId: cn.DeviceId
    };

    if (cn.hasOwnProperty('SharedAccessKey')) {
      const sas = SharedAccessSignature.create(cn.HostName, cn.DeviceId, cn.SharedAccessKey, anHourFromNow());
      config.sharedAccessSignature = sas.toString();
    }

    /*Codes_SRS_NODE_DEVICE_CLIENT_05_006: [The fromConnectionString method shall return a new instance of the Client object, as by a call to new Client(new transportCtor(...)).]*/
    return new Client(new transportCtor(config), connStr, new BlobUploadClient(config));
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

    const sas = SharedAccessSignature.parse(sharedAccessSignature);
    const decodedUri = decodeURIComponent(sas.sr);
    const uriSegments = decodedUri.split('/');
    const config: Client.Config = {
      host: uriSegments[0],
      deviceId: uriSegments[uriSegments.length - 1],
      sharedAccessSignature: sharedAccessSignature
    };

    /*Codes_SRS_NODE_DEVICE_CLIENT_16_030: [The fromSharedAccessSignature method shall return a new instance of the Client object] */
    return new Client(new transportCtor(config), null, new BlobUploadClient(config));
  }
}

export namespace Client {
  /**
   * @private
   * Configuration parameters used to authenticate and connect a Device Client with an Azure IoT hub.
   */
  export interface Config {
    /**
     * Device unique identifier (as it exists in the device registry).
     */
    deviceId: string;
    /**
     * Hostname of the Azure IoT hub. (<IoT hub name>.azure-devices.net).
     */
    host: string;
    /**
     * @deprecated This is not used anywhere anymore.
     * Name of the Azure IoT hub. (The first section of the Azure IoT hub hostname)
     */
    hubName?: string;
    /**
     * If using symmetric key authentication, this is used to generate the shared access signature tokens used to authenticate the connection.
     */
    symmetricKey?: string;
    /**
     * The shared access signature token used to authenticate the connection with the Azure IoT hub.
     */
    sharedAccessSignature?: string | CommonSharedAccessSignature;
    /**
     * Structure containing the certificate and associated key used to authenticate the connection if using x509 certificates as the authentication method.
     */
    x509?: X509;
  }

  export interface Transport extends EventEmitter {
    on(type: 'error', func: (err: Error) => void): this;
    on(type: 'disconnect', func: (err?: Error) => void): this;

    connect(done: (err?: Error, result?: results.Connected) => void): void;
    disconnect(done: (err?: Error, result?: results.Disconnected) => void): void;
    setOptions?(options: any, done: (err?: Error, result?: results.TransportConfigured) => void): void;
    updateSharedAccessSignature(sharedAccessSignature: string, done: (err?: Error, result?: results.SharedAccessSignatureUpdated) => void): void;

    // D2C
    sendEvent(message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    sendEventBatch(messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;

    // C2D
    on(type: 'message', func: (msg: Message) => void): this;
    complete(message: Message, done: (err?: Error, result?: results.MessageCompleted) => void): void;
    reject(message: Message, done: (err?: Error, results?: results.MessageRejected) => void): void;
    abandon(message: Message, done: (err?: Error, results?: results.MessageAbandoned) => void): void;
    enableC2D(callback: (err?: Error) => void): void;
    disableC2D(callback: (err?: Error) => void): void;

    // Twin
    getTwinReceiver(done: (err?: Error, receiver?: any) => void): void;
    sendTwinRequest(method: string, resource: string, properties: { [key: string]: any }, body: any, done?: (err?: Error, result?: any) => void): void;
    enableTwin(callback: (err?: Error) => void): void;
    disableTwin(callback: (err?: Error) => void): void;

    // Methods
    sendMethodResponse(response: DeviceMethodResponse, done?: (err?: Error, result?: any) => void): void;
    onDeviceMethod(methodName: string, methodCallback: (request: MethodMessage, response: DeviceMethodResponse) => void): void;
    enableMethods(callback: (err?: Error) => void): void;
    disableMethods(callback: (err?: Error) => void): void;
  }

  export interface BlobUpload {
    uploadToBlob(blobName: string, stream: Stream, steamLength: number, done: (err?: Error) => void): void;
    updateSharedAccessSignature(sharedAccessSignature: string): void;
  }

  /**
   * @private
   * @deprecated
   */
  export interface MethodMessage {
    methods: { methodName: string; };
    requestId: string;
    properties: { [key: string]: string; };
    body: Buffer;
  }

  export type TransportCtor = new(config: Config) => Transport;
}
