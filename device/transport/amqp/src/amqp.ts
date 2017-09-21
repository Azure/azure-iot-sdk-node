// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import * as dbg from 'debug';
const debug = dbg('device-amqp:amqp');
import { EventEmitter } from 'events';

import { ClientConfig, DeviceMethodRequest, DeviceMethodResponse, StableConnectionTransport, Client } from 'azure-iot-device';
import { Amqp as BaseAmqpClient, translateError, AmqpMessage, SenderLink, ReceiverLink } from 'azure-iot-amqp-base';
import { endpoint, SharedAccessSignature, errors, results, Message, X509, Receiver } from 'azure-iot-common';
import { AmqpDeviceMethodClient } from './amqp_device_method_client';
import { AmqpTwinClient } from './amqp_twin_client';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

const handleResult = function (errorMessage: string, done: (err?: Error, result?: any) => void): (err?: Error, result?: any) => void {
  return function (err?: Error, result?: any): void {
    if (err) {
      done(translateError(errorMessage, err));
    } else {
      done(null, result);
    }
  };
};

const getTranslatedError = function(err?: Error, message?: string): Error {
  if (err instanceof errors.UnauthorizedError || err instanceof errors.NotConnectedError || err instanceof errors.DeviceNotFoundError) {
    return err;
  }
  return translateError(message, err);
};

/**
 * Provides the transport layer over AMQP for the {@link azure-iot-device.Client} object.
 *
 * This class is not meant to be used directly, instead passed to the {@link azure-iot-device.Client} class to be used as
 * a transport.
 */
/*Codes_SRS_NODE_DEVICE_AMQP_16_001: [The Amqp constructor shall accept a config object with four properties:
host – (string) the fully-qualified DNS hostname of an IoT Hub
hubName - (string) the name of the IoT Hub instance (without suffix such as .azure-devices.net).
deviceId – (string) the identifier of a device registered with the IoT Hub
sharedAccessSignature – (string) the shared access signature associated with the device registration.] */
/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_001: [The `Amqp` constructor shall implement the `Receiver` interface.]*/
/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_002: [The `Amqp` object shall inherit from the `EventEmitter` node object.]*/
export class Amqp extends EventEmitter implements Client.Transport, StableConnectionTransport, Receiver {
  /**
   * @private
   */
  protected _config: ClientConfig;
  private _deviceMethodClient: AmqpDeviceMethodClient;
  private _amqp: BaseAmqpClient;
  private _twinClient: AmqpTwinClient;
  private _c2dEndpoint: string;
  private _d2cEndpoint: string;
  private _c2dLink: ReceiverLink;
  private _d2cLink: SenderLink;

  /**
   * @private
   */
  constructor(config: ClientConfig) {
    super();
    this._config = config;
    this._amqp = new BaseAmqpClient(false, 'azure-iot-device/' + packageJson.version);
    this._amqp.setDisconnectHandler((err) => {
      this.emit('disconnect', err);
    });

    this._deviceMethodClient = new AmqpDeviceMethodClient(this._config, this._amqp);
    this._deviceMethodClient.on('error', (err) => {
      this.emit('errorReceived', err);
    });

    this._c2dEndpoint = endpoint.messagePath(encodeURIComponent(this._config.deviceId));
    this._d2cEndpoint = endpoint.eventPath(this._config.deviceId);

    const c2dErrorListener = (err) => {
      debug('Error on the C2D link: ' + err.toString());
      // this is the right thing to do (even better would be to emit 'error' directly but can't be done right now because the client does not have the proper error handling logic.)
      // this will come with the retry logic.
      // this.emit('errorReceived', err);
    };

    const c2dMessageListener = (msg) => {
      this.emit('message', msg);
    };

    /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_008: [The `Amqp` object shall remove the listeners on `message` and `error` events of the underlying `ReceiverLink` when no-one is listening to its own `message` event.]*/
    this.on('removeListener', (eventName, eventCallback) => {
      if (eventName === 'message') {
        if (this._c2dLink) {
          if (this.listeners('message').length === 0) {
            this._c2dLink.detach((err) => {
              if (err) {
                debug('error detaching c2d link: ' + err.toString());
              } else {
                this._c2dLink.removeListener('error', c2dErrorListener);
                this._c2dLink.removeListener('message', c2dMessageListener);
                this._c2dLink = undefined;
              }
            });
          }
        } else {
          debug('No active C2D link: nothing to do here.');
        }
      }
    });

    /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_003: [The `Amqp` object shall listen to the `message` and error events of the underlying `ReceiverLink` object when it has listeners on its `message` event.]*/
    this.on('newListener', (eventName, eventCallback) => {
      debug('registering new event handler for: ' + eventName);
      if (eventName === 'message') {
        if (!this._c2dLink) {
          this._amqp.attachReceiverLink(this._c2dEndpoint, null, (err, link) => {
            this._c2dLink = link;
            this._c2dLink.on('error', c2dErrorListener);
            this._c2dLink.on('message', c2dMessageListener);
          });
        } else {
          debug('c2d link already active: nothing to do here.');
        }
      }
    });
  }

  /**
   * @private
   * @method              module:azure-iot-device-amqp.Amqp#connect
   * @description         Establishes a connection with the IoT Hub instance.
   * @param {Function}   done   Called when the connection is established of if an error happened.
   *
   */
  /*Codes_SRS_NODE_DEVICE_AMQP_16_008: [The done callback method passed in argument shall be called if the connection is established]*/
  /*Codes_SRS_NODE_DEVICE_AMQP_16_009: [The done callback method passed in argument shall be called with an error object if the connecion fails]*/
  connect(done?: (err?: Error, result?: results.Connected) => void): void {
    const uri = this._getConnectionUri();
    const sslOptions = this._config.x509;
    this._amqp.connect(uri, sslOptions, (err, connectResult) => {
      if (err) {
        done(translateError('AMQP Transport: Could not connect', err));
      } else {
        if (!sslOptions) {
          /*Codes_SRS_NODE_DEVICE_AMQP_06_005: [If x509 authentication is NOT being utilized then `initializeCBS` shall be invoked.]*/
          this._amqp.initializeCBS((err) => {
            if (err) {
              /*Codes_SRS_NODE_DEVICE_AMQP_06_008: [If `initializeCBS` is not successful then the client will be disconnected.]*/
              this._amqp.disconnect(() => {
                done(getTranslatedError(err, 'AMQP Transport: Could not initialize CBS'));
              });
            } else {
              /*Codes_SRS_NODE_DEVICE_AMQP_06_006: [If `initializeCBS` is successful, `putToken` shall be invoked If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback.]*/
              const sasString = this._config.sharedAccessSignature.toString();
              this._amqp.putToken(SharedAccessSignature.parse(sasString, ['sr', 'sig', 'se']).sr, sasString, (err) => {
                if (err) {
                  /*Codes_SRS_NODE_DEVICE_AMQP_06_009: [If `putToken` is not successful then the client will be disconnected.]*/
                  this._amqp.disconnect(() => {
                    done(getTranslatedError(err, 'AMQP Transport: Could not authorize with puttoken'));
                  });
                } else {
                  done(null, connectResult);
                }
              });
            }
          });
        } else {
          done(null, connectResult);
        }
      }
    });
  }

  /**
   * @private
   * @method              module:azure-iot-device-amqp.Amqp#disconnect
   * @description         Disconnects the link to the IoT Hub instance.
   * @param {Function}   done   Called when disconnected of if an error happened.
   */
  /*Codes_SRS_NODE_DEVICE_AMQP_16_010: [The done callback method passed in argument shall be called when disconnected]*/
  /*Codes_SRS_NODE_DEVICE_AMQP_16_011: [The done callback method passed in argument shall be called with an error object if disconnecting fails]*/
  disconnect(done?: (err?: Error) => void): void {
    this._amqp.disconnect(handleResult('AMQP Transport: Could not disconnect', done));
  }

  /**
   * @private
   * @method              module:azure-iot-device-amqp.Amqp#sendEvent
   * @description         Sends an event to the IoT Hub.
   * @param {Message}  message    The [message]{@linkcode module:common/message.Message}
   *                              to be sent.
   * @param {Function} done       The callback to be invoked when `sendEvent`
   *                              completes execution.
   */
  /* Codes_SRS_NODE_DEVICE_AMQP_16_002: [The sendEvent method shall construct an AMQP request using the message passed in argument as the body of the message.] */
  /* Codes_SRS_NODE_DEVICE_AMQP_16_003: [The sendEvent method shall call the done() callback with a null error object and a MessageEnqueued result object when the message has been successfully sent.] */
  /* Codes_SRS_NODE_DEVICE_AMQP_16_004: [If sendEvent encounters an error before it can send the request, it shall invoke the done callback function and pass the standard JavaScript Error object with a text description of the error (err.message). ] */
  sendEvent(message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void {
    let amqpMessage = AmqpMessage.fromMessage(message);
    amqpMessage.properties.to = this._d2cEndpoint;

    if (!this._d2cLink) {
      this._amqp.attachSenderLink(this._d2cEndpoint, null, (err, link) => {
        if (err) {
          handleResult('AMQP Transport: Could not send', done)(err);
        } else {
          debug('got a new D2C link');
          this._d2cLink = link;
          const d2cLinkErrorHandler = (err) => {
            debug('error on C2D link: ' + err.toString());
            this._d2cLink.removeListener('error', d2cLinkErrorHandler);
            this._d2cLink = undefined;
          };
          this._d2cLink.on('error', d2cLinkErrorHandler);
          this._d2cLink.send(amqpMessage, handleResult('AMQP Transport: Could not send', done));
        }
      });
    } else {
      debug('using existing d2c link');
      this._d2cLink.send(amqpMessage, handleResult('AMQP Transport: Could not send', done));
    }
  }

  /**
   * @deprecated          Deprecating the receiver pattern in order to prepare for a cleaner transport layer that accomodates retry logic. use the Amqp object directly as a receiver now. it has the same APIs.
   * @private
   * @method              module:azure-iot-device-amqp.Amqp#getReceiver
   * @description         Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
   * @param {Function}  done      Callback used to return the {@linkcode AmqpReceiver} object.
   */
  /*Codes_SRS_NODE_DEVICE_AMQP_16_021: [The `getReceiver` method shall call the `done` callback with a first argument that is `null` and a second argument that it `this`, ie the current `Amqp` instance.]*/
  getReceiver(done: (err?: Error, receiver?: Receiver) => void): void {
    done(null, this);
  }

  /**
   * @private
   * @method              module:azure-iot-device-amqp.Amqp#complete
   * @description         Settles the message as complete and calls the done callback with the result.
   *
   * @param {Message}     message     The message to settle as complete.
   * @param {Function}    done        The callback that shall be called with the error or result object.
   */
  /*Codes_SRS_NODE_DEVICE_AMQP_16_013: [The ‘complete’ method shall call the ‘complete’ method of the C2D `ReceiverLink` object and pass it the message and the callback given as parameters.] */
  complete(message: Message, done?: (err?: Error, result?: results.MessageCompleted) => void): void {
    this._c2dLink.complete(message, done);
  }

  /**
   * @private
   * @method              module:azure-iot-device-amqp.Amqp#reject
   * @description         Settles the message as rejected and calls the done callback with the result.
   *
   * @param {Message}     message     The message to settle as rejected.
   * @param {Function}    done        The callback that shall be called with the error or result object.
   */
  /*Codes_SRS_NODE_DEVICE_AMQP_16_014: [The ‘reject’ method shall call the ‘reject’ method of the C2D `ReceiverLink` object and pass it the message and the callback given as parameters.] */
  reject(message: Message, done?: (err?: Error, result?: results.MessageRejected) => void): void {
    this._c2dLink.reject(message, done);
  }

  /**
   * @private
   * @method              module:azure-iot-device-amqp.Amqp#abandon
   * @description         Settles the message as abandoned and calls the done callback with the result.
   *
   * @param {Message}     message     The message to settle as abandoned.
   * @param {Function}    done        The callback that shall be called with the error or result object.
   */
  /*Codes_SRS_NODE_DEVICE_AMQP_16_012: [The ‘abandon’ method shall call the ‘abandon’ method of the C2D `ReceiverLink` object and pass it the message and the callback given as parameters.] */
  abandon(message: Message, done?: (err?: Error, result?: results.MessageAbandoned) => void): void {
    this._c2dLink.abandon(message, done);
  }

  /**
   * @private
   * @method          module:azure-iot-device-amqp.Amqp#updateSharedAccessSignature
   * @description     This methods sets the SAS token used to authenticate with the IoT Hub service.
   *
   * @param {String}        sharedAccessSignature  The new SAS token.
   * @param {Function}      done      The callback to be invoked when `updateSharedAccessSignature` completes.
   */
  updateSharedAccessSignature(sharedAccessSignature: string, done?: (err?: Error, result?: results.SharedAccessSignatureUpdated) => void): void {
    /*Codes_SRS_NODE_DEVICE_AMQP_16_015: [The updateSharedAccessSignature method shall save the new shared access signature given as a parameter to its configuration.] */
    this._config.sharedAccessSignature = sharedAccessSignature;
    /*Codes_SRS_NODE_DEVICE_AMQP_06_010: [The `updateSharedAccessSignature` method shall call the amqp transport `putToken` method with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback.]*/
    this._amqp.putToken(SharedAccessSignature.parse(sharedAccessSignature, ['sr', 'sig', 'se']).sr, sharedAccessSignature, (err) => {
      if (err) {
        this._amqp.disconnect(() => {
          if (done) {
            done(getTranslatedError(err, 'AMQP Transport: Could not authorize with puttoken'));
          }
        });
      } else {
        /*Codes_SRS_NODE_DEVICE_AMQP_06_011: [The `updateSharedAccessSignature` method shall call the `done` callback with a null error object and a SharedAccessSignatureUpdated object as a result, indicating the client does NOT need to reestablish the transport connection.]*/
        if (done) done(null, new results.SharedAccessSignatureUpdated(false));
      }
    });
  }

  /**
   * @private
   * @method          module:azure-iot-device-amqp.Amqp#setOptions
   * @description     This methods sets the AMQP specific options of the transport.
   *
   * @param {object}        options   Options to set.  Currently for amqp these are the x509 cert, key, and optional passphrase properties. (All strings)
   * @param {Function}      done      The callback to be invoked when `setOptions` completes.
   */
  setOptions(options: X509, done?: () => void): void {
  /*Codes_SRS_NODE_DEVICE_AMQP_06_001: [The `setOptions` method shall throw a ReferenceError if the `options` parameter has not been supplied.]*/
    if (!options) throw new ReferenceError('The options parameter can not be \'' + options + '\'');
    if (options.hasOwnProperty('cert')) {
      this._config.x509 = {
        cert: options.cert,
        key: options.key,
        passphrase: options.passphrase
      };
    } else if (options.hasOwnProperty('certFile')) {
      this._config.x509 = {
        certFile: options.certFile,
        keyFile: options.keyFile,
      };
    }
    /*Codes_SRS_NODE_DEVICE_AMQP_06_002: [If `done` has been specified the `setOptions` method shall call the `done` callback with no arguments.]*/
    if (done) {
      /*Codes_SRS_NODE_DEVICE_AMQP_06_003: [`setOptions` should not throw if `done` has not been specified.]*/
      done();
    }
  }

  /**
   * @private
   * The `sendEventBatch` method sends a list of event messages to the IoT Hub.
   * @param {array<Message>} messages   Array of [Message]{@linkcode module:common/message.Message}
   *                                    objects to be sent as a batch.
   * @param {Function}      done      The callback to be invoked when
   *                                  `sendEventBatch` completes execution.
   */
  /* Codes_SRS_NODE_DEVICE_AMQP_16_005: [If sendEventBatch encounters an error before it can send the request, it shall invoke the done callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]  */
  // sendEventBatch(messages: Message[], done: (err: Error, result?: results.MessageEnqueued) => void) {
  // Placeholder - Not implemented yet.
  // };

  /**
   * @private
   */
  /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_007: [The `onDeviceMethod` method shall forward the `methodName` and `methodCallback` arguments to the underlying `AmqpDeviceMethodClient` object.]*/
  onDeviceMethod(methodName: string, methodCallback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
    this._deviceMethodClient.onDeviceMethod(methodName, methodCallback);
    this._deviceMethodClient.attach((err) => {
      if (err) {
        debug('error while attaching the device method client: ' + err.toString());
        // no need to emit anything: the general error handler registered in the constructor will do that for us.
      }
    });
  }

  /**
   * @private
   * The `sendMethodResponse` method sends a direct method response to the IoT Hub
   * @param {Object}     methodResponse   Object describing the device method response.
   * @param {Function}   callback         The callback to be invoked when
   *                                      `sendMethodResponse` completes execution.
   */
  sendMethodResponse(methodResponse: DeviceMethodResponse, callback: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_DEVICE_AMQP_16_019: [The `sendMethodResponse` shall throw a `ReferenceError` if the `methodResponse` object is falsy.]*/
    if (!methodResponse) {
      throw new ReferenceError('\'methodResponse\' cannot be \'' + methodResponse + '\'');
    }

    /*Codes_SRS_NODE_DEVICE_AMQP_16_020: [The `sendMethodResponse` response shall call the `AmqpDeviceMethodClient.sendMethodResponse` method with the arguments that were given to it.]*/
    this._deviceMethodClient.sendMethodResponse(methodResponse, callback);
  }

  /**
   * @private
   * @method          module:azure-iot-device-amqp.Amqp#sendTwinRequest
   * @description     Send a device-twin specific messager to the IoT Hub instance
   *
   * @param {String}        method    name of the method to invoke ('PUSH', 'PATCH', etc)
   * @param {String}        resource  name of the resource to act on (e.g. '/properties/reported/') with beginning and ending slashes
   * @param {Object}        properties  object containing name value pairs for request properties (e.g. { 'rid' : 10, 'index' : 17 })
   * @param {String}        body  body of request
   * @param {Function}      done  the callback to be invoked when this function completes.
   *
   * @throws {ReferenceError}   One of the required parameters is falsy
   * @throws {ArgumentError}  One of the parameters is an incorrect type
   */
  sendTwinRequest(method: string, resource: string, properties: { [key: string]: string }, body: any, done?: (err?: Error, result?: results.MessageEnqueued) => void): void {
    this._twinClient.sendTwinRequest(method, resource, properties, body, done);
  }

  /**
   * @private
   * @method          module:azure-iot-device-mqtt.Amqp#getTwinReceiver
   * @description     Get a receiver object that handles C2D device-twin traffic
   *
   * @param {Function}  done      the callback to be invoked when this function completes.
   *
   * @throws {ReferenceError}   One of the required parameters is falsy
   */
  getTwinReceiver(done?: (err?: Error, receiver?: AmqpTwinClient) => void): void {
    /* Codes_SRS_NODE_DEVICE_AMQP_06_033: [The `getTwinReceiver` method shall throw an `ReferenceError` if done is falsy] */
    if (!done) {
      throw new ReferenceError('required parameter is missing');
    }

    /*Codes_SRS_NODE_DEVICE_AMQP_06_034: [If a twin receiver for this endpoint doesn't exist, the `getTwinReceiver` method should create a new `AmqpTwinClient` object.] */
    /*Codes_SRS_NODE_DEVICE_AMQP_06_035: [If a twin receiver for this endpoint has already been created, the `getTwinReceiver` method should not create a new `AmqpTwinClient` object.] */
    if (!this._twinClient) {
      this._twinClient = new AmqpTwinClient(this._config, this._amqp);
    }

    /*Codes_SRS_NODE_DEVICE_AMQP_06_036: [The `getTwinReceiver` method shall call the `done` method after it complete.] */
    /*Codes_SRS_NODE_DEVICE_AMQP_06_037: [If a twin receiver for this endpoint did not previously exist, the `getTwinReceiver` method should return the a new `AmqpTwinClient` object as the second parameter of the `done` function with null as the first parameter.] */
    /*Codes_SRS_NODE_DEVICE_AMQP_06_038: [If a twin receiver for this endpoint previously existed, the `getTwinReceiver` method should return the preexisting `AmqpTwinClient` object as the second parameter of the `done` function with null as the first parameter.] */
    done(null, this._twinClient);
  }

  protected _getConnectionUri(): string {
    return 'amqps://' + this._config.host;
  }
}
