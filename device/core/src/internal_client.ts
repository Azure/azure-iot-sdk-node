// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Stream } from 'stream';
import { EventEmitter } from 'events';
import * as dbg from 'debug';
const debug = dbg('azure-iot-device:InternalClient');

import { results, errors, Message, X509, AuthenticationProvider } from 'azure-iot-common';
import { SharedAccessSignature as CommonSharedAccessSignature } from 'azure-iot-common';
import { ExponentialBackOffWithJitter, RetryPolicy, RetryOperation } from 'azure-iot-common';
import * as ConnectionString from './connection_string.js';
import { BlobUploadClient } from './blob_upload';
import { DeviceMethodRequest, DeviceMethodResponse } from './device_method';
import { Twin, TwinProperties } from './twin';
import { SharedAccessKeyAuthenticationProvider } from './sak_authentication_provider';
import { SharedAccessSignatureAuthenticationProvider } from './sas_authentication_provider';
import { X509AuthenticationProvider } from './x509_authentication_provider';
import { DeviceClientOptions } from './interfaces';
import { IotEdgeAuthenticationProvider } from './iotedge_authentication_provider';

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
export class InternalClient extends EventEmitter {
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
  private _maxOperationTimeout: number;
  private _methodCallbackMap: any;
  private _disconnectHandler: (err?: Error, result?: any) => void;
  private blobUploadClient: BlobUploadClient; // TODO: wrong casing/naming convention
  private _c2dEnabled: boolean;
  private _methodsEnabled: boolean;
  private _inputMessagesEnabled: boolean;

  private _retryPolicy: RetryPolicy;

  constructor(transport: DeviceTransport, connStr?: string, blobUploadClient?: BlobUploadClient) {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_05_001: [The Client constructor shall throw ReferenceError if the transport argument is falsy.]*/
    if (!transport) throw new ReferenceError('transport is \'' + transport + '\'');

    super();
    this._c2dEnabled = false;
    this._methodsEnabled = false;
    this._inputMessagesEnabled = false;
    this.blobUploadClient = blobUploadClient;

    if (connStr) {
      throw new errors.InvalidOperationError('the connectionString parameter of the constructor is not used - users of the SDK should be using the `fromConnectionString` factory method.');
    }

    this._transport = transport;
    this._transport.on('message', (msg) => {
      this.emit('message', msg);
    });

    /* Codes_SRS_NODE_INTERNAL_CLIENT_18_012: [ The `inputMessage` event shall be emitted when an inputMessage is received from the IoT Hub service. ]*/
    /* Codes_SRS_NODE_INTERNAL_CLIENT_18_013: [ The `inputMessage` event parameters shall be the inputName for the message and a `Message` object. ]*/
    this._transport.on('inputMessage', (inputName, msg) => {
      this.emit('inputMessage', inputName, msg);
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
      } else if (eventName === 'inputMessage' && this.listeners('inputMessage').length === 0) {
        /* Codes_SRS_NODE_INTERNAL_CLIENT_18_015: [ The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `inputMessage` event. ]*/
        this._disableInputMessages((err) => {
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
      } else if (eventName === 'inputMessage') {
        /* Codes_SRS_NODE_INTERNAL_CLIENT_18_014: [ The client shall start listening for messages from the service whenever there is a listener subscribed to the `inputMessage` event. ]*/
        this._enableInputMessages((err) => {
          if (err) {
            this.emit('error', err);
          }
        });
      }
    });

    this._disconnectHandler = (err) => {
      debug('transport disconnect event: ' + (err ? err.toString() : 'no error'));
      if (err && this._retryPolicy.shouldRetry(err)) {
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_097: [If the transport emits a `disconnect` event while the client is subscribed to c2d messages the retry policy shall be used to reconnect and re-enable the feature using the transport `enableC2D` method.]*/
        if (this._c2dEnabled) {
          this._c2dEnabled = false;
          debug('re-enabling C2D link');
          this._enableC2D((err) => {
            if (err) {
              this.emit('disconnect', new results.Disconnected(err));
            }
          });
        }

        if (this._inputMessagesEnabled) {
          this._inputMessagesEnabled = false;
          debug('re-enabling input message link');
          this._enableInputMessages((err) => {
            if (err) {
              /*Codes_SRS_NODE_INTERNAL_CLIENT_16_102: [If the retry policy fails to reestablish the C2D functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
              this.emit('disconnect', new results.Disconnected(err));
            }
          });
        }

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

  /*Codes_SRS_NODE_INTERNAL_CLIENT_05_016: [When a Client method encounters an error in the transport, the callback function (indicated by the done argument) shall be invoked with the following arguments:
  err - the standard JavaScript Error object, with a response property that points to a transport-specific response object, and a responseBody property that contains the body of the transport response.]*/
  /*Codes_SRS_NODE_INTERNAL_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
  err - null
  response - a transport-specific response object]*/

  updateSharedAccessSignature(sharedAccessSignature: string, updateSasCallback?: (err?: Error, result?: results.SharedAccessSignatureUpdated) => void): void {
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

  open(openCallback: (err?: Error, result?: results.Connected) => void): void {
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.connect(opCallback);
    }, (connectErr, connectResult) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_060: [The `open` method shall call the `openCallback` callback with a null error object and a `results.Connected()` result object if the transport is already connected, doesn't need to connect or has just connected successfully.]*/
      safeCallback(openCallback, connectErr, connectResult);
    });
  }

  sendEvent(message: Message, sendEventCallback?: (err?: Error, result?: results.MessageEnqueued) => void): void {
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_05_007: [The sendEvent method shall send the event indicated by the message argument via the transport associated with the Client instance.]*/
      this._transport.sendEvent(message, opCallback);
    }, (err, result) => {
      safeCallback(sendEventCallback, err, result);
    });
  }

  sendEventBatch(messages: Message[], sendEventBatchCallback?: (err?: Error, result?: results.MessageEnqueued) => void): void {
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_05_008: [The sendEventBatch method shall send the list of events (indicated by the messages argument) via the transport associated with the Client instance.]*/
      this._transport.sendEventBatch(messages, opCallback);
    }, (err, result) => {
      safeCallback(sendEventBatchCallback, err, result);
    });
  }

  close(closeCallback?: (err?: Error, result?: results.Disconnected) => void): void {
    this._closeTransport((err, result) => {
      safeCallback(closeCallback, err, result);
    });
  }

  setTransportOptions(options: any, done?: (err?: Error, result?: results.TransportConfigured) => void): void {
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
        safeCallback(done, err);
      } else {
        safeCallback(done, null, new results.TransportConfigured());
      }
    });
  }

  setOptions(options: DeviceClientOptions, done?: (err?: Error, result?: results.TransportConfigured) => void): void {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_042: [The `setOptions` method shall throw a `ReferenceError` if the options object is falsy.]*/
    if (!options) throw new ReferenceError('options cannot be falsy.');

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

  complete(message: Message, completeCallback: (err?: Error, result?: results.MessageCompleted) => void): void {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_016: [The ‘complete’ method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
    if (!message) throw new ReferenceError('message is \'' + message + '\'');

    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.complete(message, opCallback);
    }, (err, result) => {
      safeCallback(completeCallback, err, result);
    });
  }

  reject(message: Message, rejectCallback: (err?: Error, result?: results.MessageRejected) => void): void {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_018: [The reject method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
    if (!message) throw new ReferenceError('message is \'' + message + '\'');
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.reject(message, opCallback);
    }, (err, result) => {
      safeCallback(rejectCallback, err, result);
    });
  }

  abandon(message: Message, abandonCallback: (err?: Error, result?: results.MessageAbandoned) => void): void {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_017: [The abandon method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
    if (!message) throw new ReferenceError('message is \'' + message + '\'');

    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      this._transport.abandon(message, opCallback);
    }, (err, result) => {
      safeCallback(abandonCallback, err, result);
    });
  }

  uploadToBlob(blobName: string, stream: Stream, streamLength: number, done: (err?: Error) => void): void {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_037: [The `uploadToBlob` method shall throw a `ReferenceError` if `blobName` is falsy.]*/
    if (!blobName) throw new ReferenceError('blobName cannot be \'' + blobName + '\'');
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_038: [The `uploadToBlob` method shall throw a `ReferenceError` if `stream` is falsy.]*/
    if (!stream) throw new ReferenceError('stream cannot be \'' + stream + '\'');
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_039: [The `uploadToBlob` method shall throw a `ReferenceError` if `streamLength` is falsy.]*/
    if (!streamLength) throw new ReferenceError('streamLength cannot be \'' + streamLength + '\'');

    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_040: [The `uploadToBlob` method shall call the `done` callback with an `Error` object if the upload fails.]*/
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_041: [The `uploadToBlob` method shall call the `done` callback no parameters if the upload succeeds.]*/
      this.blobUploadClient.uploadToBlob(blobName, stream, streamLength, opCallback);
    }, (err, result) => {
      safeCallback(done, err, result);
    });
  }

  getTwin(done: (err?: Error, twin?: Twin) => void): void {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_094: [If this is the first call to `getTwin` the method shall instantiate a new `Twin` object  and pass it the transport currently in use.]*/
    if (!this._twin) {
      this._twin = new Twin(this._transport, this._retryPolicy, this._maxOperationTimeout);
    }

    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_095: [The `getTwin` method shall call the `get()` method on the `Twin` object currently in use and pass it its `done` argument for a callback.]*/
    this._twin.get(done);
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

  sendOutputEvent(outputName: string, message: Message, callback: (err?: Error, result?: results.MessageEnqueued) => void): void {
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      /* Codes_SRS_NODE_INTERNAL_CLIENT_18_010: [ The `sendOutputEvent` method shall send the event indicated by the `message` argument via the transport associated with the Client instance. ]*/
      this._transport.sendOutputEvent(outputName, message, opCallback);
    }, (err, result) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_18_018: [ When the `sendOutputEvent` method completes, the `callback` function shall be invoked with the same arguments as the underlying transport method's callback. ]*/
      /*Codes_SRS_NODE_INTERNAL_CLIENT_18_019: [ The `sendOutputEvent` method shall not throw if the `callback` is not passed. ]*/
      safeCallback(callback, err, result);
    });
  }

  sendOutputEventBatch(outputName: string, messages: Message[], callback: (err?: Error, result?: results.MessageEnqueued) => void): void {
    const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
    retryOp.retry((opCallback) => {
      /* Codes_SRS_NODE_INTERNAL_CLIENT_18_011: [ The `sendOutputEventBatch` method shall send the list of events (indicated by the `messages` argument) via the transport associated with the Client instance. ]*/
      this._transport.sendOutputEventBatch(outputName, messages, opCallback);
    }, (err, result) => {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_18_021: [ When the `sendOutputEventBatch` method completes the `callback` function shall be invoked with the same arguments as the underlying transport method's callback. ]*/
      /*Codes_SRS_NODE_INTERNAL_CLIENT_18_022: [ The `sendOutputEventBatch` method shall not throw if the `callback` is not passed. ]*/
      safeCallback(callback, err, result);
    });
  }

  private _validateDeviceMethodInputs(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
    // Codes_SRS_NODE_INTERNAL_CLIENT_13_020: [ onDeviceMethod shall throw a ReferenceError if methodName is falsy. ]
    if (!methodName) {
      throw new ReferenceError('methodName cannot be \'' + methodName + '\'');
    }
    // Codes_SRS_NODE_INTERNAL_CLIENT_13_024: [ onDeviceMethod shall throw a TypeError if methodName is not a string. ]
    if (typeof(methodName) !== 'string') {
      throw new TypeError('methodName\'s type is \'' + typeof(methodName) + '\'. A string was expected.');
    }

    // Codes_SRS_NODE_INTERNAL_CLIENT_13_022: [ onDeviceMethod shall throw a ReferenceError if callback is falsy. ]
    if (!callback) {
      throw new ReferenceError('callback cannot be \'' + callback + '\'');
    }

    // Codes_SRS_NODE_INTERNAL_CLIENT_13_025: [ onDeviceMethod shall throw a TypeError if callback is not a Function. ]
    if (typeof(callback) !== 'function') {
      throw new TypeError('callback\'s type is \'' + typeof(callback) + '\'. A function reference was expected.');
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

  private _disableInputMessages(callback: (err?: Error) => void): void {
    if (this._inputMessagesEnabled) {
      this._transport.disableInputMessages((err) => {
        if (!err) {
          this._inputMessagesEnabled = false;
        }
        callback(err);
      });
    } else {
      callback();
    }
  }

  private _enableInputMessages(callback: (err?: Error) => void): void {
    if (!this._inputMessagesEnabled) {
      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        /* Codes_SRS_NODE_INTERNAL_CLIENT_18_016: [ The client shall connect the transport if needed in order to receive inputMessages. ]*/
        this._transport.enableInputMessages(opCallback);
      }, (err) => {
        if (!err) {
          this._inputMessagesEnabled = true;
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
  static fromConnectionString(connStr: string, transportCtor: any, clientCtor: any): any {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_05_003: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
    if (!connStr) throw new ReferenceError('connStr is \'' + connStr + '\'');

    const cn = ConnectionString.parse(connStr);

    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_087: [The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor.]*/
    let authenticationProvider: AuthenticationProvider;

    if (cn.SharedAccessKey) {
      authenticationProvider = SharedAccessKeyAuthenticationProvider.fromConnectionString(connStr);
    } else {
      /*Codes_SRS_NODE_INTERNAL_CLIENT_16_093: [The `fromConnectionString` method shall create a new `X509AuthorizationProvider` object with the connection string passed as argument if it contains an X509 parameter and pass this object to the transport constructor.]*/
      authenticationProvider = new X509AuthenticationProvider({
        host: cn.HostName,
        deviceId: cn.DeviceId
      });
    }

    /*Codes_SRS_NODE_INTERNAL_CLIENT_05_006: [The fromConnectionString method shall return a new instance of the Client object, as by a call to new Client(new transportCtor(...)).]*/
    return new clientCtor(new transportCtor(authenticationProvider), null, new BlobUploadClient(authenticationProvider));
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
  static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor: any, clientCtor: any): any {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_029: [The fromSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature argument is falsy.] */
    if (!sharedAccessSignature) throw new ReferenceError('sharedAccessSignature is \'' + sharedAccessSignature + '\'');

    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_088: [The `fromSharedAccessSignature` method shall create a new `SharedAccessSignatureAuthorizationProvider` object with the shared access signature passed as argument, and pass this object to the transport constructor.]*/
    const authenticationProvider = SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(sharedAccessSignature);

    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_030: [The fromSharedAccessSignature method shall return a new instance of the Client object] */
    return new clientCtor(new transportCtor(authenticationProvider), null, new BlobUploadClient(authenticationProvider));
  }

  /**
   * @method                        module:azure-iot-device.Client.fromAuthenticationMethod
   * @description                   Creates an IoT Hub device client from the given authentication method and using the given transport type.
   * @param authenticationProvider  Object used to obtain the authentication parameters for the IoT hub.
   * @param transportCtor           Transport protocol used to connect to IoT hub.
   */
  static fromAuthenticationProvider(authenticationProvider: AuthenticationProvider, transportCtor: any, clientCtor: any): any {
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_089: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy.]*/
    if (!authenticationProvider) {
      throw new ReferenceError('authenticationMethod cannot be \'' + authenticationProvider + '\'');
    }

    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_092: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy.]*/
    if (!transportCtor) {
      throw new ReferenceError('transportCtor cannot be \'' + transportCtor + '\'');
    }

    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_090: [The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor.]*/
    /*Codes_SRS_NODE_INTERNAL_CLIENT_16_091: [The `fromAuthenticationProvider` method shall return a `Client` object configured with a new instance of a transport created using the `transportCtor` argument.]*/
    return new clientCtor(new transportCtor(authenticationProvider), null, new BlobUploadClient(authenticationProvider));
  }

  static validateEnvironment(): void {
    // Codes_SRS_NODE_INTERNAL_CLIENT_13_029: [ If environment variables EdgeHubConnectionString and IotHubConnectionString do not exist then the following environment variables must be defined: IOTEDGE_WORKLOADURI, IOTEDGE_DEVICEID, IOTEDGE_MODULEID, IOTEDGE_IOTHUBHOSTNAME, IOTEDGE_AUTHSCHEME and IOTEDGE_MODULEGENERATIONID. ]

    const keys = [
      'IOTEDGE_WORKLOADURI',
      'IOTEDGE_DEVICEID',
      'IOTEDGE_MODULEID',
      'IOTEDGE_IOTHUBHOSTNAME',
      'IOTEDGE_AUTHSCHEME',
      'IOTEDGE_MODULEGENERATIONID'
    ];

    keys.forEach((key) => {
      if (!process.env[key]) {
        throw new errors.PreconditionFailedError(
          `Envrionment variable ${key} was not provided.`
        );
      }
    });

    // Codes_SRS_NODE_INTERNAL_CLIENT_13_030: [ The value for the environment variable IOTEDGE_AUTHSCHEME must be SasToken. ]

    // we only support sas token auth scheme at this time
    if (process.env.IOTEDGE_AUTHSCHEME !== 'SasToken') {
      throw new errors.PreconditionFailedError(
        `Authentication scheme ${
          process.env.IOTEDGE_AUTHSCHEME
        } is not a supported scheme.`
      );
    }
  }

    /**
     * @method            module:azure-iot-device.Client.fromEnvironment
     * @description       Creates an IoT Hub internal client by using configuration
     *                    information from the environment. If an environment
     *                    variable called `EdgeHubConnectionString` or `IotHubConnectionString`
     *                    exists, then that value is used and behavior is identical
     *                    to calling `fromConnectionString` passing that in. If
     *                    those environment variables do not exist then the following
     *                    variables MUST be defined:
     *                      IOTEDGE_WORKLOADURI        - URI for iotedged's workload API
     *                      IOTEDGE_DEVICEID           - Device identifier
     *                      IOTEDGE_MODULEID           - Module identifier
     *                      IOTEDGE_MODULEGENERATIONID - Module generation identifier
     *                      IOTEDGE_IOTHUBHOSTNAME     - IoT Hub host name
     *                      IOTEDGE_AUTHSCHEME         - Authentication scheme to use;
     *                                                   must be "SasToken"
     *
     * @param {Function}  transportCtor     A transport constructor.
     * @param {Function}  clientCtor        The client object constructor.
     */
  static fromEnvironment(transportCtor: any, clientCtor: any): any {
    // Codes_SRS_NODE_INTERNAL_CLIENT_13_026: [ The fromEnvironment method shall throw a ReferenceError if the transportCtor argument is falsy. ]
    if (!transportCtor) {
      throw new ReferenceError('transportCtor cannot be \'' + transportCtor + '\'');
    }

    // Codes_SRS_NODE_INTERNAL_CLIENT_13_027: [ The fromEnvironment method shall throw a ReferenceError if the clientCtor argument is falsy. ]
    if (!clientCtor) {
      throw new ReferenceError('clientCtor cannot be \'' + clientCtor + '\'');
    }

    // Codes_SRS_NODE_INTERNAL_CLIENT_13_028: [ The fromEnvironment method shall delegate to InternalClient.fromConnectionString if an environment variable called EdgeHubConnectionString or IotHubConnectionString exists. ]

    // if the environment has a value for EdgeHubConnectionString then we use that
    const connectionString = process.env.EdgeHubConnectionString || process.env.IotHubConnectionString;
    if (connectionString) {
      return InternalClient.fromConnectionString(
        connectionString,
        transportCtor,
        clientCtor
      );
    }

    // make sure all the environment variables we need have been provided
    InternalClient.validateEnvironment();

    const authConfig = {
      workloadUri: process.env.IOTEDGE_WORKLOADURI,
      deviceId: process.env.IOTEDGE_DEVICEID,
      moduleId: process.env.IOTEDGE_MODULEID,
      iothubHostName: process.env.IOTEDGE_IOTHUBHOSTNAME,
      authScheme: process.env.IOTEDGE_AUTHSCHEME,
      gatewayHostName: process.env.IOTEDGE_GATEWAYHOSTNAME,
      generationId: process.env.IOTEDGE_MODULEGENERATIONID
    };

    // Codes_SRS_NODE_INTERNAL_CLIENT_13_032: [ The fromEnvironment method shall create a new IotEdgeAuthenticationProvider object and pass this to the transport constructor. ]
    const authenticationProvider = new IotEdgeAuthenticationProvider(authConfig);

    // Codes_SRS_NODE_INTERNAL_CLIENT_13_031: [ The fromEnvironment method shall return a new instance of the Client object. ]
    return new clientCtor(
      new transportCtor(authenticationProvider),
      null,
      new BlobUploadClient(authenticationProvider)
    );
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

export type TransportCtor = new(config: Config) => DeviceTransport;
