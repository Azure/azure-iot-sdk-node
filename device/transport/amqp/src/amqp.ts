// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import * as machina from 'machina';
import * as async from 'async';
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

  private _c2dErrorListener: (err: Error) => void;
  private _c2dMessageListener: (msg: Message) => void;

  private _d2cErrorListener: (err: Error) => void;

  private _fsm: machina.Fsm;

  /**
   * @private
   */
  constructor(config: ClientConfig, baseClient?: BaseAmqpClient) {
    super();
    this._config = config;
    this._amqp = baseClient || new BaseAmqpClient(false, 'azure-iot-device/' + packageJson.version);
    this._amqp.setDisconnectHandler((err) => {
      this.emit('disconnect', err);
    });

    this._deviceMethodClient = new AmqpDeviceMethodClient(this._config, this._amqp);
    this._deviceMethodClient.on('error', (err) => {
      this.emit('errorReceived', err);
    });

    this._twinClient = new AmqpTwinClient(this._config, this._amqp);

    this._c2dEndpoint = endpoint.messagePath(encodeURIComponent(this._config.deviceId));
    this._d2cEndpoint = endpoint.eventPath(this._config.deviceId);

    this._c2dErrorListener = (err) => {
      debug('Error on the C2D link: ' + err.toString());
      // this is the right thing to do (even better would be to emit 'error' directly but can't be done right now because the client does not have the proper error handling logic.)
      // this will come with the retry logic.
      // this.emit('errorReceived', err);
    };

    this._c2dMessageListener = (msg) => {
      this.emit('message', msg);
    };

    this._d2cErrorListener = (err) => {
      debug('Error on the D2C link: ' + err.toString());
      // this is the right thing to do (even better would be to emit 'error' directly but can't be done right now because the client does not have the proper error handling logic.)
      // this will come with the retry logic.
      // this.emit('errorReceived', err);
    };

    /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_008: [The `Amqp` object shall remove the listeners on `message` and `error` events of the underlying `ReceiverLink` when no-one is listening to its own `message` event.]*/
    this.on('removeListener', (eventName, eventCallback) => {
      if (eventName === 'message' && this.listeners('message').length === 0) {
        debug('automatically detaching the link after the last message listener was removed');
        this._fsm.handle('detachC2DLink', (err) => {
          if (err) {
            this.emit('errorReceived', err);
          }
        });
      } else {
        debug('removing listener for event: ' + eventName);
      }
    });

    /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_003: [The `Amqp` object shall listen to the `message` and error events of the underlying `ReceiverLink` object when it has listeners on its `message` event.]*/
    this.on('newListener', (eventName, eventCallback) => {
      debug('registering new event handler for: ' + eventName);
      if (eventName === 'message') {
        if (this.listeners('message').length === 0) {
          debug('automatically attaching the link after the first message listener was registered');
          this._fsm.handle('attachC2DLink', (err) => {
            debug('C2D link attached automatically');
            if (err) {
              debug('error attaching the C2D link automatically: ' + err.toString());
              this.emit('errorReceived', err);
            }
          });
        }
      } else {
        debug('adding listener for event: ' + eventName);
      }
    });

    this._fsm = new machina.Fsm({
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (callback, err, result) => {
            if (callback) {
              if (err) {
                callback(err);
              } else {
                callback(null, result);
              }
            }
          },
          connect: (connectCallback) => this._fsm.transition('connecting', connectCallback),
          disconnect: (disconnectCallback) => {
            if (disconnectCallback) {
              disconnectCallback(null, new results.Disconnected());
            }
          },
          sendEvent: (message, sendCallback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_16_024: [The `sendEvent` method shall connect and authenticate the transport if necessary.]*/
            this._fsm.handle('connect', (err, result) => {
              if (err) {
                sendCallback(err);
              } else {
                this._fsm.handle('sendEvent', message, sendCallback);
              }
            });
          },
          updateSharedAccessSignature: (token, callback) => {
            // nothing to do here: the SAS has been updated in the config object.
            callback(null, new results.SharedAccessSignatureUpdated(false));
          },
          getTwinReceiver: (callback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_16_027: [** The `getTwinReceiver` method shall connect and authenticate the AMQP connection if necessary.]*/
            this._fsm.handle('connect', (err, result) => {
              if (err) {
                /*Tests_SRS_NODE_DEVICE_AMQP_16_028: [The `getTwinReceiver` method shall call the `done` callback with the corresponding error if the transport fails connect or authenticate the AMQP connection.]*/
                callback(err);
              } else {
                this._fsm.handle('getTwinReceiver', callback);
              }
            });
          },
          sendTwinRequest: (method, resource, properties, body, sendTwinRequestCallback) => {
            this._fsm.handle('connect', (err, result) => {
              if (err) {
                sendTwinRequestCallback(err);
              } else {
                this._fsm.handle('sendTwinRequest', method, resource, properties, body, sendTwinRequestCallback);
              }
            });
          },
          attachC2DLink: (callback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_16_029: [The `Amqp` object shall connect and authenticate the AMQP connection if necessary to attach the C2D `ReceiverLink` object.]*/
            this._fsm.handle('connect', (err, result) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('attachC2DLink', callback);
              }
            });
          },
          onDeviceMethod: (methodName, callback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_16_021: [The`onDeviceMethod` method shall connect and authenticate the transport if necessary to start receiving methods.]*/
            this._fsm.handle('connect', (err, result) => {
              if (err) {
                /*Codes_SRS_NODE_DEVICE_AMQP_16_023: [An `errorReceived` event shall be emitted by the Amqp object if the transport fails to connect while registering a method callback.]*/
                this.emit('errorReceived', err);
              } else {
                this._fsm.handle('onDeviceMethod', methodName, callback);
              }
            });
          }
        },
        connecting: {
          _onEnter: (connectCallback) => {
            const uri = this._getConnectionUri();
            this._amqp.connect(uri, this._config.x509, (err, connectResult) => {
              if (err) {
                this._fsm.transition('disconnected', connectCallback, translateError('AMQP Transport: Could not connect', err));
              } else {
                this._fsm.transition('authenticating', connectCallback, connectResult);
              }
            });
          },
          connect: () => this._fsm.deferUntilTransition(),
          disconnect: (disconnectCallback, err) => this._fsm.transition('disconnecting', disconnectCallback, err),
          sendEvent: () => this._fsm.deferUntilTransition(),
          updateSharedAccessSignature: (token, callback) => {
            // nothing to do here: the SAS has been updated in the config object and putToken will be done when authenticating.
            callback(null, new results.SharedAccessSignatureUpdated(false));
          },
          getTwinReceiver: () => this._fsm.deferUntilTransition(),
          sendTwinRequest: () => this._fsm.deferUntilTransition(),
          attachC2DLink: () => this._fsm.deferUntilTransition(),
          onDeviceMethod: () => this._fsm.deferUntilTransition(),

        },
        authenticating: {
          _onEnter: (connectCallback, connectResult) => {
            if (this._config.x509) {
              /*Codes_SRS_NODE_DEVICE_AMQP_06_005: [If x509 authentication is NOT being utilized then `initializeCBS` shall be invoked.]*/
              this._fsm.transition('authenticated', connectCallback, connectResult);
            } else {
              this._amqp.initializeCBS((err) => {
                if (err) {
                  /*Codes_SRS_NODE_DEVICE_AMQP_06_008: [If `initializeCBS` is not successful then the client will be disconnected.]*/
                  this._fsm.transition('disconnecting', connectCallback, getTranslatedError(err, 'AMQP Transport: Could not initialize CBS'));
                } else {
                  /*Codes_SRS_NODE_DEVICE_AMQP_06_006: [If `initializeCBS` is successful, `putToken` shall be invoked If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter `audience`, created from the `sr` of the shared access signature, the actual shared access signature, and a callback.]*/
                  const sasString = this._config.sharedAccessSignature.toString();
                  this._amqp.putToken(SharedAccessSignature.parse(sasString, ['sr', 'sig', 'se']).sr, sasString, (err) => {
                    if (err) {
                      /*Codes_SRS_NODE_DEVICE_AMQP_06_009: [If `putToken` is not successful then the client will be disconnected.]*/
                      this._fsm.transition('disconnecting', connectCallback, getTranslatedError(err, 'AMQP Transport: Could not authorize with puttoken'));
                    } else {
                      this._fsm.transition('authenticated', connectCallback, connectResult);
                    }
                  });
                }
              });
            }
          },
          connect: () => this._fsm.deferUntilTransition(),
          disconnect: (disconnectCallback) => this._fsm.transition('disconnecting', disconnectCallback),
          sendEvent: () => this._fsm.deferUntilTransition(),
          updateSharedAccessSignature: () => this._fsm.deferUntilTransition(),
          getTwinReceiver: () => this._fsm.deferUntilTransition(),
          sendTwinRequest: () => this._fsm.deferUntilTransition(),
          onDeviceMethod: () => this._fsm.deferUntilTransition(),
          attachC2DLink: () => this._fsm.deferUntilTransition()
        },
        authenticated: {
          _onEnter: (connectCallback, connectResult) => {
            connectCallback(null, connectResult);
          },
          connect: (connectCallback) => connectCallback(null, new results.Connected()),
          disconnect: (disconnectCallback) => this._fsm.transition('disconnecting', disconnectCallback),
          sendEvent: (message, sendCallback) => {
            let amqpMessage = AmqpMessage.fromMessage(message);
            amqpMessage.properties.to = this._d2cEndpoint;

            /*Codes_SRS_NODE_DEVICE_AMQP_16_025: [The `sendEvent` method shall create and attach the d2c link if necessary.]*/
            if (!this._d2cLink) {
              this._amqp.attachSenderLink(this._d2cEndpoint, null, (err, link) => {
                if (err) {
                  handleResult('AMQP Transport: Could not send', sendCallback)(err);
                } else {
                  debug('got a new D2C link');
                  this._d2cLink = link;
                  this._d2cLink.on('error', this._d2cErrorListener);
                  this._d2cLink.send(amqpMessage, handleResult('AMQP Transport: Could not send', sendCallback));
                }
              });
            } else {
              debug('using existing d2c link');
              this._d2cLink.send(amqpMessage, handleResult('AMQP Transport: Could not send', sendCallback));
            }
          },
          updateSharedAccessSignature: (sharedAccessSignature, updateSasCallback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_06_010: [If the AMQP connection is established, the `updateSharedAccessSignature` method shall call the amqp transport `putToken` method with the first parameter `audience`, created from the `sr` of the shared access signature, the actual shared access signature, and a callback.]*/
            this._amqp.putToken(SharedAccessSignature.parse(sharedAccessSignature, ['sr', 'sig', 'se']).sr, sharedAccessSignature, (err) => {
              if (err) {
                this._amqp.disconnect(() => {
                  updateSasCallback(getTranslatedError(err, 'AMQP Transport: Could not authorize with puttoken'));
                });
              } else {
                /*Codes_SRS_NODE_DEVICE_AMQP_06_011: [The `updateSharedAccessSignature` method shall call the `done` callback with a null error object and a SharedAccessSignatureUpdated object as a result, indicating the client does NOT need to reestablish the transport connection.]*/
                updateSasCallback(null, new results.SharedAccessSignatureUpdated(false));
              }
            });
          },
          getTwinReceiver: (callback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_16_026: [** The `getTwinReceiver` method shall call the `done` callback with a `null` error argument and the `AmqpTwinClient` instance currently in use.]*/
            callback(null, this._twinClient);
          },
          sendTwinRequest: (method, resource, properties, body, sendTwinRequestCallback) => {
            this._twinClient.sendTwinRequest(method, resource, properties, body, sendTwinRequestCallback);
          },
          attachC2DLink: (callback) => {
            debug('attaching C2D link');
            /*Codes_SRS_NODE_DEVICE_AMQP_16_030: [The `Amqp` object shall attach the C2D `ReceiverLink` object if necessary to start receiving messages.]*/
            this._amqp.attachReceiverLink(this._c2dEndpoint, null, (err, receiverLink) => {
              if (err) {
                debug('error creating a C2D link: ' + err.toString());
                handleResult('AMQP Transport: Could not attach link', callback)(err);
              } else {
                debug('C2D link created and attached successfully');
                this._c2dLink = receiverLink;
                this._c2dLink.on('error', this._c2dErrorListener);
                this._c2dLink.on('message', this._c2dMessageListener);
                callback();
              }
            });
          },
          detachC2DLink: (callback) => {
            this._stopC2DListener(undefined, callback);
          },
          onDeviceMethod: (methodName, methodCallback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_16_022: [The `onDeviceMethod` method shall call the `onDeviceMethod` method on the `AmqpDeviceMethodClient` object with the same arguments.]*/
            this._deviceMethodClient.onDeviceMethod(methodName, methodCallback);
            this._deviceMethodClient.attach((err) => {
              if (err) {
                debug('error while attaching the device method client: ' + err.toString());
                // no need to emit anything: the general error handler registered in the constructor will do that for us.
              }
            });
          }
        },
        disconnecting: {
          _onEnter: (disconnectCallback, err) => {
            let finalError = err;
            async.series([
              (callback) => {
                if (this._d2cLink) {
                  let tmpD2CLink = this._d2cLink;
                  this._d2cLink = undefined;

                  if (err) {
                  /*Codes_SRS_NODE_DEVICE_AMQP_16_023: [The `disconnect` method shall forcefully detach all attached links if a connection error is the causing the transport to be disconnected.]*/
                    tmpD2CLink.forceDetach(err);
                    tmpD2CLink.removeListener('error', this._d2cErrorListener);
                  }
                  tmpD2CLink.detach((detachErr) => {
                    if (detachErr) {
                      debug('error detaching the D2C link: ' + detachErr.toString());
                    } else {
                      debug('D2C link detached');
                    }
                    tmpD2CLink.removeListener('error', this._d2cErrorListener);
                    if (!finalError && detachErr) {
                      finalError = translateError('error while detaching the D2C link when disconnecting', detachErr);
                    }
                    callback(finalError);
                  });
                } else {
                  callback();
                }
              },
              (callback) => {
                if (this._c2dLink) {
                  /*Codes_SRS_NODE_DEVICE_AMQP_16_022: [The `disconnect` method shall detach all attached links.]*/
                  this._stopC2DListener(err, callback);
                } else {
                  callback();
                }
              },
              (callback) => {
                this._amqp.disconnect((disconnectErr) => {
                  if (disconnectErr) {
                    debug('error disconnecting the AMQP connection: ' + disconnectErr.toString());
                  } else {
                    debug('amqp connection successfully disconnected.');
                  }
                  if (!finalError && disconnectErr) {
                    finalError = translateError('error while disconnecting the AMQP connection', disconnectErr);
                  }
                  callback(finalError);
                });
              }
            ], () => {
              /*Codes_SRS_NODE_DEVICE_AMQP_16_010: [The `done` callback method passed in argument shall be called when disconnected.]*/
              /*Codes_SRS_NODE_DEVICE_AMQP_16_011: [The `done` callback method passed in argument shall be called with an error object if disconnecting fails.]*/
              this._fsm.transition('disconnected', disconnectCallback, finalError, new results.Disconnected());
            });
          },
          '*': (connectCallback) => this._fsm.deferUntilTransition()
        },
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
    this._fsm.handle('connect', done);
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
    this._fsm.handle('disconnect', done);
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
    this._fsm.handle('sendEvent', message, done);
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
    if (this._c2dLink) {
      this._c2dLink.complete(message, done);
    } else {
      done(new errors.DeviceMessageLockLostError('No active C2D link'));
    }
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
    if (this._c2dLink) {
      this._c2dLink.reject(message, done);
    } else {
      done(new errors.DeviceMessageLockLostError('No active C2D link'));
    }
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
    if (this._c2dLink) {
      this._c2dLink.abandon(message, done);
    } else {
      done(new errors.DeviceMessageLockLostError('No active C2D link'));
    }
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
    this._fsm.handle('updateSharedAccessSignature', sharedAccessSignature, done);
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
    this._fsm.handle('onDeviceMethod', methodName, methodCallback);
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
    this._fsm.handle('sendTwinRequest', method, resource, properties, body, (err) => {
      if (done) {
        done(err);
      }
    });
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

    this._fsm.handle('getTwinReceiver', done);
  }

  protected _getConnectionUri(): string {
    return 'amqps://' + this._config.host;
  }

  private _stopC2DListener(err: Error | undefined, callback: (err?: Error) => void): void {
    const tmpC2DLink = this._c2dLink;
    this._c2dLink = undefined;
    if (err) {
      debug('forceDetaching C2D link');
      tmpC2DLink.forceDetach(err);
      // detaching listeners and getting rid of the object anyway.
      tmpC2DLink.removeListener('error', this._c2dErrorListener);
      tmpC2DLink.removeListener('message', this._c2dMessageListener);
    } else {
      tmpC2DLink.detach((err) => {
        if (err) {
          debug('error detaching C2D link: ' + err.toString());
        } else {
          debug('C2D link successfully detached');
        }

        // detaching listeners and getting rid of the object anyway.
        tmpC2DLink.removeListener('error', this._c2dErrorListener);
        tmpC2DLink.removeListener('message', this._c2dMessageListener);
        callback(err);
      });
    }
  }
}
