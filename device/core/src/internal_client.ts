// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Stream } from 'stream';
import { EventEmitter } from 'events';
import * as fs from 'fs';

import * as dbg from 'debug';
const debug = dbg('azure-iot-device:InternalClient');

import { results, errors, Message, X509, callbackToPromise, Callback } from 'azure-iot-common';
import { SharedAccessSignature as CommonSharedAccessSignature } from 'azure-iot-common';
import { ExponentialBackOffWithJitter, RetryPolicy, RetryOperation } from 'azure-iot-common';
import { DeviceMethodRequest, DeviceMethodResponse } from './device_method';
import { Twin, TwinProperties } from './twin';
import { DeviceClientOptions } from './interfaces';

/**
 * @private
 * Default maximum operation timeout for client operations: 4 minutes.
 */
const MAX_OPERATION_TIMEOUT = 240000;

function safeCallback(callback?: (err?: Error, result?: any) => void, error?: Error, result?: any): void {
  if (callback) callback(error, result);
}

/**
 * @private
 */
export abstract class InternalClient extends EventEmitter {
  // SAS token created by the client have a lifetime of 60 minutes, renew every 45 minutes
  /**
   * @private
   */
  static sasRenewalInterval: number = 2700000;

  // Can't be marked private because they are used in the Twin class.
  /**
   * @private
   */
  _transport: DeviceTransport;
  /**
   * @private
   */
  _twin: Twin;

  /**
   * @private
   * Maximum timeout (in milliseconds) used to consider an operation failed.
   * The operation will be retried according to the retry policy set with {@link azure-iot-device.Client.setRetryPolicy} method (or {@link azure-iot-common.ExponentialBackoffWithJitter} by default) until this value is reached.)
   */
  protected _maxOperationTimeout: number;
  protected _retryPolicy: RetryPolicy;

  private _methodCallbackMap: any;
  private _disconnectHandler: (err?: Error, result?: any) => void;
  private _methodsEnabled: boolean;

  constructor(transport: DeviceTransport, connStr?: string) {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_05_001: [The Client constructor shall throw ReferenceError if the transport argument is falsy.]*/
    if (!transport) throw new ReferenceError('transport is \'' + transport + '\'');

    super();
    this._methodsEnabled = false;

    if (connStr) {
      throw new errors.InvalidOperationError('the connectionString parameter of the constructor is not used - users of the SDK should be using the `fromConnectionString` factory method.');
    }

    this._transport = transport;

    this._transport.on('error', (err) => {
      // errors right now bubble up through the disconnect handler.
      // ultimately we would like to get rid of that disconnect event and rely on the error event instead
      debug('Transport error: ' + err.toString());
    });

    this._methodCallbackMap = {};

    this._disconnectHandler = (err) => {
      debug('transport disconnect event: ' + (err ? err.toString() : 'no error'));
      if (err && this._retryPolicy.shouldRetry(err)) {
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_098: [If the transport emits a `disconnect` event while the client is subscribed to direct methods the retry policy shall be used to reconnect and re-enable the feature using the transport `enableMethods` method.]*/
        if (this._methodsEnabled) {
          this._methodsEnabled = false;
          debug('re-enabling Methods link');
          this._enableMethods((err) => {
            if (err) {
              /*Codes_SRS_NODE_INTERNAL_CLIENT_16_100: [If the retry policy fails to reestablish the direct methods functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
              this.emit('disconnect', new results.Disconnected(err));
            }
          });
        }

        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_099: [If the transport emits a `disconnect` event while the client is subscribed to desired properties updates the retry policy shall be used to reconnect and re-enable the feature using the transport `enableTwinDesiredPropertiesUpdates` method.]*/
        if (this._twin && this._twin.desiredPropertiesUpdatesEnabled) {
          debug('re-enabling Twin');
          this._twin.enableTwinDesiredPropertiesUpdates((err) => {
            if (err) {
              /*Codes_SRS_NODE_INTERNAL_CLIENT_16_101: [If the retry policy fails to reestablish the twin desired properties updates functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
              this.emit('disconnect', new results.Disconnected(err));
            }
          });
        }
      } else {
        this.emit('disconnect', new results.Disconnected(err));
      }
    };
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_045: [If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.]*/
    this._transport.on('disconnect', this._disconnectHandler);

    this._retryPolicy = new ExponentialBackOffWithJitter();
    this._maxOperationTimeout = MAX_OPERATION_TIMEOUT;
  }

  /*Codes_SRS_NODE_INTERNAL_CLIENT_05_016: [When a Client method encounters an error in the transport, the callback function (indicated by the done argument) shall be invoked with the following arguments:
  err - the standard JavaScript Error object, with a response property that points to a transport-specific response object, and a responseBody property that contains the body of the transport response.]*/
  /*Codes_SRS_NODE_INTERNAL_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
  err - null
  response - a transport-specific response object]*/

  updateSharedAccessSignature(sharedAccessSignature: string, updateSasCallback?: Callback<results.SharedAccessSignatureUpdated>): void {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_031: [The updateSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature parameter is falsy.]*/
    if (!sharedAccessSignature) throw new ReferenceError('sharedAccessSignature is falsy');

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

  open(openCallback: Callback<results.Connected>): void;
  open(): Promise<results.Connected>;
  open(openCallback?: Callback<results.Connected>): Promise<results.Connected> | void {
    return callbackToPromise((_callback) => {
      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        this._transport.connect(opCallback);
      }, (connectErr, connectResult) => {
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_060: [The `open` method shall call the `_callback` callback with a null error object and a `results.Connected()` result object if the transport is already connected, doesn't need to connect or has just connected successfully.]*/
        safeCallback(_callback, connectErr, connectResult);
      });
    }, openCallback);
  }

  sendEvent(message: Message, sendEventCallback: Callback<results.MessageEnqueued>): void;
  sendEvent(message: Message): Promise<results.MessageEnqueued>;
  sendEvent(message: Message, sendEventCallback?: Callback<results.MessageEnqueued>): Promise<results.MessageEnqueued> | void {
    return callbackToPromise((_callback) => {
      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        /*Codes_SRS_NODE_INTERNAL_CLIENT_05_007: [The sendEvent method shall send the event indicated by the message argument via the transport associated with the Client instance.]*/
        this._transport.sendEvent(message, opCallback);
      }, (err, result) => {
        safeCallback(_callback, err, result);
      });
    }, sendEventCallback);
  }

  sendEventBatch(messages: Message[], sendEventBatchCallback: Callback<results.MessageEnqueued>): void;
  sendEventBatch(messages: Message[]): Promise<results.MessageEnqueued>;
  sendEventBatch(messages: Message[], sendEventBatchCallback?: Callback<results.MessageEnqueued>): Promise<results.MessageEnqueued> | void {
    return callbackToPromise((_callback) => {
      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        /*Codes_SRS_NODE_INTERNAL_CLIENT_05_008: [The sendEventBatch method shall send the list of events (indicated by the messages argument) via the transport associated with the Client instance.]*/
        this._transport.sendEventBatch(messages, opCallback);
      }, (err, result) => {
        safeCallback(_callback, err, result);
      });
    }, sendEventBatchCallback);
  }

  close(closeCallback: Callback<results.Disconnected>): void;
  close(): Promise<results.Disconnected>;
  close(closeCallback?: Callback<results.Disconnected>): Promise<results.Disconnected> | void {
    return callbackToPromise((_callback) => {
      this._closeTransport((err, result) => {
        safeCallback(_callback, err, result);
      });
    }, closeCallback);
  }

  setTransportOptions(options: any, done: Callback<results.TransportConfigured>): void;
  setTransportOptions(options: any): Promise<results.TransportConfigured>;
  setTransportOptions(options: any, done?: Callback<results.TransportConfigured>): Promise<results.TransportConfigured> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_024: [The ‘setTransportOptions’ method shall throw a ‘ReferenceError’ if the options object is falsy] */
      if (!options) throw new ReferenceError('options cannot be falsy.');
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_025: [The ‘setTransportOptions’ method shall throw a ‘NotImplementedError’ if the transport doesn’t implement a ‘setOption’ method.] */
      if (typeof this._transport.setOptions !== 'function') throw new errors.NotImplementedError('setOptions does not exist on this transport');

      const clientOptions = {
        http: {
          receivePolicy: options
        }
      };

      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_021: [The ‘setTransportOptions’ method shall call the ‘setOptions’ method on the transport object.]*/
        this._transport.setOptions(clientOptions, opCallback);
      }, (err) => {
        if (err) {
          safeCallback(_callback, err);
        } else {
          safeCallback(_callback, null, new results.TransportConfigured());
        }
      });
    }, done);
  }

  /**
   * Passes options to the `Client` object that can be used to configure the transport.
   * @param options   A {@link DeviceClientOptions} object.
   * @param [done]    The optional callback to call once the options have been set.
   * @returns {Promise<results.TransportConfigured> | void} Promise if no callback function was passed, void otherwise.
   */
  setOptions(options: DeviceClientOptions, done: Callback<results.TransportConfigured>): void;
  setOptions(options: DeviceClientOptions): Promise<results.TransportConfigured>;
  setOptions(options: DeviceClientOptions, done?: Callback<results.TransportConfigured>): Promise<results.TransportConfigured> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_042: [The `setOptions` method shall throw a `ReferenceError` if the options object is falsy.]*/
      if (!options) throw new ReferenceError('options cannot be falsy.');

      /*Codes_SRS_NODE_INTERNAL_CLIENT_06_001: [The `setOptions` method shall assume the `ca` property is the name of an already existent file and it will attempt to read that file as a pem into a string value and pass the string to config object `ca` property.  Otherwise, it is assumed to be a pem string.] */
      if (options.ca) {
        fs.readFile(options.ca, 'utf8', (err, contents) => {
          if (!err) {
            let localOptions: DeviceClientOptions = {};
            for (let k in options) {
              localOptions[k] = options[k];
            }
            localOptions.ca = contents;
            this._invokeSetOptions(localOptions, _callback);
          } else {
            this._invokeSetOptions(options, _callback);
          }
        });
      } else {
        this._invokeSetOptions(options, _callback);
      }
    }, done);
  }

  complete(message: Message, completeCallback: Callback<results.MessageCompleted>): void;
  complete(message: Message): Promise<results.MessageCompleted>;
  complete(message: Message, completeCallback?: Callback<results.MessageCompleted>): Promise<results.MessageCompleted> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_016: [The ‘complete’ method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
      if (!message) throw new ReferenceError('message is \'' + message + '\'');

      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        this._transport.complete(message, opCallback);
      }, (err, result) => {
        safeCallback(_callback, err, result);
      });
    }, completeCallback);
  }

  reject(message: Message, rejectCallback: Callback<results.MessageRejected>): void;
  reject(message: Message): Promise<results.MessageRejected>;
  reject(message: Message, rejectCallback?: Callback<results.MessageRejected>): Promise<results.MessageRejected> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_018: [The reject method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
      if (!message) throw new ReferenceError('message is \'' + message + '\'');
      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        this._transport.reject(message, opCallback);
      }, (err, result) => {
        safeCallback(_callback, err, result);
      });
    }, rejectCallback);
  }

  abandon(message: Message, abandonCallback: Callback<results.MessageAbandoned>): void;
  abandon(message: Message): Promise<results.MessageAbandoned>;
  abandon(message: Message, abandonCallback?: Callback<results.MessageAbandoned>): Promise<results.MessageAbandoned> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_017: [The abandon method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
      if (!message) throw new ReferenceError('message is \'' + message + '\'');

      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        this._transport.abandon(message, opCallback);
      }, (err, result) => {
        safeCallback(_callback, err, result);
      });
    }, abandonCallback);
  }

  getTwin(done: Callback<Twin>): void;
  getTwin(): Promise<Twin>;
  getTwin(done?: Callback<Twin>): Promise<Twin> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_094: [If this is the first call to `getTwin` the method shall instantiate a new `Twin` object  and pass it the transport currently in use.]*/
      if (!this._twin) {
        this._twin = new Twin(this._transport, this._retryPolicy, this._maxOperationTimeout);
      }

      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_095: [The `getTwin` method shall call the `get()` method on the `Twin` object currently in use and pass it its `done` argument for a callback.]*/
      this._twin.get(_callback);
    }, done);
  }

  /**
   * Sets the retry policy used by the client on all operations. The default is {@link azure-iot-common.ExponentialBackoffWithJitter|ExponentialBackoffWithJitter}.
   * @param policy {RetryPolicy}  The retry policy that should be used for all future operations.
   */
  setRetryPolicy(policy: RetryPolicy): void {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_083: [The `setRetryPolicy` method shall throw a `ReferenceError` if the policy object is falsy.]*/
    if (!policy) {
      throw new ReferenceError('\'policy\' cannot be \'' + policy + '\'');
    } else {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_084: [The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `shouldRetry` method.]*/
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_085: [The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `nextRetryTimeout` method.]*/
      if (typeof policy.shouldRetry !== 'function' || typeof policy.nextRetryTimeout !== 'function') {
        throw new errors.ArgumentError('A policy object must have a maxTimeout property that is a number and a nextRetryTimeout method.');
      }
    }

    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_086: [Any operation happening after a `setRetryPolicy` call should use the policy set during that call.]*/
    this._retryPolicy = policy;

    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_096: [The `setRetryPolicy` method shall call the `setRetryPolicy` method on the twin if it is set and pass it the `policy` object.]*/
    if (this._twin) {
      this._twin.setRetryPolicy(policy);
    }
  }

  protected _onDeviceMethod(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
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

  private _invokeSetOptions(options: DeviceClientOptions, done?: (err?: Error, result?: results.TransportConfigured) => void): void {
    // Making this an operation that can be retried because we cannot assume the transport's behavior (whether it's going to disconnect/reconnect, etc).
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.setOptions(options, opCallback);
    }, (err) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_043: [The `done` callback shall be invoked no parameters when it has successfully finished setting the client and/or transport options.]*/
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_044: [The `done` callback shall be invoked with a standard javascript `Error` object and no result object if the client could not be configured as requested.]*/
      safeCallback(done, err);
    });
  }


  private _validateDeviceMethodInputs(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
    // Codes_SRS_NODE_INTERNAL_CLIENT_13_020: [ onDeviceMethod shall throw a ReferenceError if methodName is falsy. ]
    if (!methodName) {
      throw new ReferenceError('methodName cannot be \'' + methodName + '\'');
    }
    // Codes_SRS_NODE_INTERNAL_CLIENT_13_024: [ onDeviceMethod shall throw a TypeError if methodName is not a string. ]
    if (typeof (methodName) !== 'string') {
      throw new TypeError('methodName\'s type is \'' + typeof (methodName) + '\'. A string was expected.');
    }

    // Codes_SRS_NODE_INTERNAL_CLIENT_13_022: [ onDeviceMethod shall throw a ReferenceError if callback is falsy. ]
    if (!callback) {
      throw new ReferenceError('callback cannot be \'' + callback + '\'');
    }

    // Codes_SRS_NODE_INTERNAL_CLIENT_13_025: [ onDeviceMethod shall throw a TypeError if callback is not a Function. ]
    if (typeof (callback) !== 'function') {
      throw new TypeError('callback\'s type is \'' + typeof (callback) + '\'. A function reference was expected.');
    }

    // Codes_SRS_NODE_INTERNAL_CLIENT_13_023: [ onDeviceMethod shall throw an Error if a listener is already subscribed for a given method call. ]
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

      // Codes_SRS_NODE_INTERNAL_CLIENT_13_001: [ The onDeviceMethod method shall cause the callback function to be invoked when a cloud-to-device method invocation signal is received from the IoT Hub service. ]
      callback(request, response);
    });
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

  private _closeTransport(closeCallback: (err?: Error, result?: any) => void): void {
    const onDisconnected = (err?: Error, result?: any): void => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_056: [The `close` method shall not throw if the `closeCallback` is not passed.]*/
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_055: [The `close` method shall call the `closeCallback` function when done with either a single Error object if it failed or null and a results.Disconnected object if successful.]*/
      safeCallback(closeCallback, err, result);
    };

    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_046: [The `close` method shall remove the listener that has been attached to the transport `disconnect` event.]*/
    this._transport.removeListener('disconnect', this._disconnectHandler);
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_001: [The `close` function shall call the transport's `disconnect` function if it exists.]*/
    this._transport.disconnect((disconnectError, disconnectResult) => {
      onDisconnected(disconnectError, disconnectResult);
    });
  }
}

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

export interface DeviceTransport extends EventEmitter {
  on(type: 'error', func: (err: Error) => void): this;
  on(type: 'disconnect', func: (err?: Error) => void): this;

  connect(done: (err?: Error, result?: results.Connected) => void): void;
  disconnect(done: (err?: Error, result?: results.Disconnected) => void): void;
  setOptions?(options: DeviceClientOptions, done: (err?: Error, result?: results.TransportConfigured) => void): void;
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
  on(type: 'twinDesiredPropertiesUpdate', func: (desiredProps: any) => void): this;
  getTwin(callback: (err?: Error, twin?: TwinProperties) => void): void;
  updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;
  enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
  disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;

  // Methods
  sendMethodResponse(response: DeviceMethodResponse, done?: (err?: Error, result?: any) => void): void;
  onDeviceMethod(methodName: string, methodCallback: (request: MethodMessage, response: DeviceMethodResponse) => void): void;
  enableMethods(callback: (err?: Error) => void): void;
  disableMethods(callback: (err?: Error) => void): void;

  // Input messages
  enableInputMessages(callback: (err?: Error) => void): void;
  disableInputMessages(callback: (err?: Error) => void): void;
  on(type: 'inputMessage', func: (inputName: string, msg: Message) => void): this;

  // Output events
  sendOutputEvent(outputName: string, message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;
  sendOutputEventBatch(outputName: string, messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;

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

export type TransportCtor = new (config: Config) => DeviceTransport;
