// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import * as dbg from 'debug';
import * as machina from 'machina';
import * as async from 'async';

import { anHourFromNow, endpoint, errors, results, SharedAccessSignature, Message, callbackToPromise, tripleValueCallbackToPromise, Callback } from 'azure-iot-common';
import { Amqp as Base, AmqpMessage, SenderLink, AmqpBaseTransportConfig } from 'azure-iot-amqp-base';
import { translateError } from './amqp_service_errors.js';
import { Client } from './client';
import { ServiceReceiver } from './service_receiver.js';
import { ResultWithIncomingMessage, IncomingMessageCallback, createResultWithIncomingMessage } from './interfaces.js';

const UnauthorizedError = errors.UnauthorizedError;
const DeviceNotFoundError = errors.DeviceNotFoundError;
const NotConnectedError = errors.NotConnectedError;
const debug = dbg('azure-iothub:Amqp');
// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

function handleResult(errorMessage: string, done: IncomingMessageCallback<any>): IncomingMessageCallback<any> {
  return (err, result) => {
    if (err) {
      /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_018: [All asynchronous instance methods shall call the `done` callback with either no arguments or a first null argument and a second argument that is the result of the operation if the operation succeeded.]*/
      done(translateError(errorMessage, err));
    } else {
      /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_017: [All asynchronous instance methods shall call the `done` callback with a single parameter that is derived from the standard Javascript `Error` object if the operation failed.]*/
      done(null, result);
    }
  };
}

function getTranslatedError(err: Error, message: string): Error {
  if (err instanceof UnauthorizedError || err instanceof NotConnectedError || err instanceof DeviceNotFoundError) {
    return err;
  }
  return translateError(message, err);
}

/**
 * Transport class used by the [service client]{@link azure-iothub.Client} to connect to the Azure IoT hub using the AMQP protocol over a secure (TLS) socket.
 * This class should not be used directly and instead be passed to one of the {@link azure-iothub.Client} factory methods: {@link azure-iothub.Client.fromConnectionString|fromConnectionString} or {@link azure-iothub.Client.fromSharedAccessSignature|fromSharedAccessSignature}.
 */
/*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_001: [The Amqp constructor shall accept a config object with those 4 properties:
host – (string) the fully-qualified DNS hostname of an IoT Hub
keyName – (string) the name of a key that can be used to communicate with the IoT Hub instance
sharedAccessSignature – (string) the key associated with the key name.] */
export class Amqp extends EventEmitter implements Client.Transport {
  /**
   * @private
   */
  protected _config: Client.TransportConfigOptions;
  private _amqp: Base;
  private _renewalTimeout: NodeJS.Timer;
  private _renewalNumberOfMilliseconds: number = 2700000;
  private _fsm: machina.Fsm;

  private _c2dEndpoint: string = '/messages/devicebound';
  private _c2dLink: SenderLink;
  private _c2dErrorListener: (err: Error) => void;

  private _feedbackEndpoint: string = '/messages/serviceBound/feedback';
  private _feedbackReceiver: ServiceReceiver;
  private _feedbackErrorListener: (err: Error) => void;

  private _fileNotificationEndpoint: string = '/messages/serviceBound/filenotifications';
  private _fileNotificationReceiver: ServiceReceiver;
  private _fileNotificationErrorListener: (err: Error) => void;

  /**
   * @private
   */
  constructor(config: Client.TransportConfigOptions, amqpBase?: Base) {
    super();
    this._amqp = amqpBase ? amqpBase : new Base(true);
    this._config = config;
    this._renewalTimeout = null;
    this._amqp.setDisconnectHandler((err) => {
      this._fsm.handle('amqpError', err);
    });

    this._c2dErrorListener = (err) => {
      debug('Error on the C2D link: ' + err.toString());
      this._c2dLink = null;
    };

    this._feedbackErrorListener = (err) => {
      debug('Error on the message feedback link: ' + err.toString());
      this._feedbackReceiver = null;
    };

    this._fileNotificationErrorListener = (err) => {
      debug('Error on the file notification link: ' + err.toString());
      this._fileNotificationReceiver = null;
    };

    this._fsm = new machina.Fsm({
      namespace: 'azure-iothub:Amqp',
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (err, callback) => {
            if (err) {
              if (callback) {
                callback(err);
              } else {
                this.emit('disconnect', err);
              }
            } else {
              if (callback) {
                callback();
              }
            }
          },
          connect: (callback) => {
            this._fsm.transition('connecting', callback);
          },
          disconnect: (callback) => callback(),
          send: (amqpMessage, deviceEndpoint, callback) => {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_025: [The `send` method shall connect and authenticate the transport if it is disconnected.]*/
            this._fsm.handle('connect', (err) => {
              if (err) {
                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_026: [The `send` method shall call its callback with an error if connecting and/or authenticating the transport fails.]*/
                callback(err);
              } else {
                this._fsm.handle('send', amqpMessage, deviceEndpoint, callback);
              }
            });
          },
          getFeedbackReceiver: (callback) => {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_033: [The `getFeedbackReceiver` method shall connect and authenticate the transport if it is disconnected.]*/
            this._fsm.handle('connect', (err) => {
              if (err) {
                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_034: [The `getFeedbackReceiver` method shall call its callback with an error if the transport fails to connect or authenticate.]*/
                callback(err);
              } else {
                this._fsm.handle('getFeedbackReceiver', callback);
              }
            });
          },
          getFileNotificationReceiver: (callback) => {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_036: [The `getFileNotificationReceiver` method shall connect and authenticate the transport if it is disconnected.]*/
            this._fsm.handle('connect', (err) => {
              if (err) {
                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_037: [The `getFileNotificationReceiver` method shall call its callback with an error if the transport fails to connect or authenticate.]*/
                callback(err);
              } else {
                this._fsm.handle('getFileNotificationReceiver', callback);
              }
            });
          },
          updateSharedAccessSignature: (_updatedSAS, callback) => {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_032: [The `updateSharedAccessSignature` shall not establish a connection if the transport is disconnected, but should use the new shared access signature on the next manually initiated connection attempt.]*/
            callback();
          },
          amqpError: (err) => {
            debug('Late arriving error received while in disconnected state.');
            if (err) {
              debug(err.toString());
            }
          }
        },
        connecting: {
          _onEnter: (callback) => {
            const config: AmqpBaseTransportConfig = {
              uri: this._getConnectionUri(),
              userAgentString: packageJson.name + '/' + packageJson.version
            };
            debug('connecting');
            this._amqp.connect(config, (err, _result) => {
              if (err) {
                debug('failed to connect' + err.toString());
                this._fsm.transition('disconnected', err, callback);
              } else {
                debug('connected');
                this._fsm.transition('authenticating', callback);
              }
            });
          },
          disconnect: (callback) => {
            this._fsm.transition('disconnecting', null, callback);
          },
          amqpError: (err) => {
            this._fsm.transition('disconnecting', err);
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        authenticating: {
          _onEnter: (callback) => {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_001: [`initializeCBS` shall be invoked.]*/
            this._amqp.initializeCBS((err) => {
              if (err) {
                debug('error trying to initialize CBS: ' + err.toString());
                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_002: [If `initializeCBS` is not successful then the client will remain disconnected and the callback, if provided, will be invoked with an error object.]*/
                this._fsm.transition('disconnecting', err, callback);
              } else {
                debug('CBS initialized');
                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_003: [If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback.]*/
                const audience = SharedAccessSignature.parse(this._config.sharedAccessSignature.toString(), ['sr', 'sig', 'se']).sr;
                const applicationSuppliedSas = typeof (this._config.sharedAccessSignature) === 'string';
                const sasToken = applicationSuppliedSas ? this._config.sharedAccessSignature as string : (this._config.sharedAccessSignature as SharedAccessSignature).extend(anHourFromNow());
                this._amqp.putToken(audience, sasToken, (err) => {
                  if (err) {
                    /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_004: [** If `putToken` is not successful then the client will remain disconnected and the callback, if provided, will be invoked with an error object.]*/
                    this._fsm.transition('disconnecting', err, callback);
                  } else {
                    this._fsm.transition('authenticated', applicationSuppliedSas, callback);
                  }
                });
              }
            });
          },
          disconnect: (callback) => {
            this._fsm.transition('disconnecting', null, callback);
          },
          amqpError: (err) => {
            this._fsm.transition('disconnecting', err);
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        authenticated: {
          _onEnter: (applicationSuppliedSas, callback) => {
            if (!applicationSuppliedSas) {
              this._renewalTimeout = setTimeout(this._handleSASRenewal.bind(this), this._renewalNumberOfMilliseconds);
            }
            callback(null, new results.Connected());
          },
          _onExit: (_callback) => {
            if (this._renewalTimeout) {
              clearTimeout(this._renewalTimeout);
            }
          },
          connect: (callback) => callback(),
          disconnect: (callback) => this._fsm.transition('disconnecting', null, callback),
          send: (amqpMessage, deviceEndpoint, callback) => {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_003: [The message generated by the `send` method should have its “to” field set to the device ID passed as an argument.]*/
            amqpMessage.to = deviceEndpoint;
            if (!this._c2dLink) {
              debug('attaching new sender link: ' + this._c2dEndpoint);
              /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_027: [The `send` method shall attach the C2D link if necessary.]*/
              this._amqp.attachSenderLink(this._c2dEndpoint, null, (err, link) => {
                if (err) {
                  debug('error trying to attach new sender link: ' + err.toString());
                  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_029: [The `send` method shall call its callback with an error if it fails to attach the C2D link.]*/
                  callback(err);
                } else {
                  debug('sender link attached. sending message.');
                  this._c2dLink = link;
                  this._c2dLink.on('error', this._c2dErrorListener);
                  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_030: [The `send` method shall call the `send` method of the C2D link and pass it the Amqp request that it created.]*/
                  this._c2dLink.send(amqpMessage, callback);
                }
              });
            } else {
              debug('reusing existing sender link: ' + this._c2dEndpoint + '. sending message.');
              /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_028: [The `send` method shall reuse the C2D link if it is already attached.]*/
              this._c2dLink.send(amqpMessage, callback);
            }
          },
          getFeedbackReceiver: (callback) => {
            if (this._feedbackReceiver) {
              /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_035: [The `getFeedbackReceiver` method shall reuse the existing feedback receiver it if has already been attached.]*/
              callback(null, this._feedbackReceiver);
            } else {
              /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_013: [The `getFeedbackReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/feedback` endpoint.]*/
              this._amqp.attachReceiverLink(this._feedbackEndpoint, null, (err, link) => {
                if (err) {
                  callback(err);
                } else {
                  this._feedbackReceiver = new ServiceReceiver(link);
                  this._feedbackReceiver.on('error', this._feedbackErrorListener);
                  callback(null, this._feedbackReceiver);
                }
              });
            }
          },
          getFileNotificationReceiver: (callback) => {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_038: [The `getFileNotificationReceiver` method shall reuse the existing feedback receiver it if has already been attached.]*/
            if (this._fileNotificationReceiver) {
              callback(null, this._fileNotificationReceiver);
            } else {
              /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_016: [The `getFileNotificationReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/filenotifications` endpoint.]*/
              this._amqp.attachReceiverLink(this._fileNotificationEndpoint, null, (err, link) => {
                if (err) {
                  callback(err);
                } else {
                  this._fileNotificationReceiver = new ServiceReceiver(link);
                  this._fileNotificationReceiver.on('error', this._fileNotificationErrorListener);
                  callback(null, this._fileNotificationReceiver);
                }
              });
            }
          },
          updateSharedAccessSignature: (updatedSAS, callback) => {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_031: [The `updateSharedAccessSignature` shall trigger a `putToken` call on the base transport if it is connected.]*/
            const audience = SharedAccessSignature.parse(this._config.sharedAccessSignature.toString(), ['sr', 'sig', 'se']).sr;
            this._amqp.putToken(audience, updatedSAS, callback);
          },
          amqpError: (err) => {
            this._fsm.transition('disconnecting', err);
          }
        },
        disconnecting: {
          _onEnter: (err, disconnectCallback) => {
            let finalError: Error = err;
            async.series([
              (callback) => {
                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_021: [The `disconnect` method shall detach the C2D messaging link if it is attached.]*/
                if (this._c2dLink) {
                  let tmpC2DLink = this._c2dLink;
                  this._c2dLink = undefined;
                  if (err) {
                    debug('force-detaching c2d links');
                    tmpC2DLink.forceDetach(err);
                    callback();
                  } else {
                    tmpC2DLink.detach((detachErr) => {
                      if (detachErr) {
                        debug('error detaching the c2d link: ' + detachErr.toString());
                        if (!finalError) {
                          finalError = translateError('error while detaching the c2d link when disconnecting', detachErr);
                        }
                      } else {
                        debug('c2d link detached.');
                      }
                      callback();
                    });
                  }
                } else {
                  callback();
                }
              },
              (callback) => {
                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_022: [The `disconnect` method shall detach the C2D feedback receiver link if it is attached.]*/
                if (this._feedbackReceiver) {
                  let tmpFeedbackReceiver = this._feedbackReceiver;
                  this._feedbackReceiver = undefined;

                  if (err) {
                    tmpFeedbackReceiver.forceDetach(err);
                    tmpFeedbackReceiver.removeListener('error', this._feedbackErrorListener);
                    callback();
                  } else {
                    tmpFeedbackReceiver.detach((detachErr) => {
                      if (detachErr) {
                        debug('error detaching the message feedback link: ' + detachErr.toString());
                      } else {
                        debug('feedback link detached');
                      }
                      tmpFeedbackReceiver.removeListener('error', this._feedbackErrorListener);
                      if (!finalError && detachErr) {
                        finalError = translateError('error while detaching the message feedback link when disconnecting', detachErr);
                      }
                      callback();
                    });
                  }
                } else {
                  callback();
                }
              },
              /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_023: [The `disconnect` method shall detach the file notification receiver link if it is attached.]*/
              (callback) => {
                if (this._fileNotificationReceiver) {
                  let tmpFileNotificationReceiver = this._fileNotificationReceiver;
                  this._fileNotificationReceiver = undefined;

                  if (err) {
                    tmpFileNotificationReceiver.forceDetach(err);
                    tmpFileNotificationReceiver.removeListener('error', this._fileNotificationErrorListener);
                    callback();
                  } else {
                    tmpFileNotificationReceiver.detach((detachErr) => {
                      if (detachErr) {
                        debug('error detaching the file upload notification link: ' + detachErr.toString());
                      } else {
                        debug('File notification link detached');
                      }
                      tmpFileNotificationReceiver.removeListener('error', this._fileNotificationErrorListener);
                      if (!finalError && detachErr) {
                        finalError = translateError('error while detaching the file upload notification link when disconnecting', detachErr);
                      }
                      callback();
                    });
                  }
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
                  callback();
                });
              }
            ], () => {
              /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_024: [Any error generated by detaching a link should be passed as the single argument of the callback of the `disconnect` method.]*/
              this._fsm.transition('disconnected', finalError, disconnectCallback);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        }
      }
    });
  }

  /**
   * @private
   * @method             module:azure-iothub.Amqp#connect
   * @description        Establishes a connection with the IoT Hub instance.
   * @param {TripleValueCallback<results.Connected, IncomingMessage>}   [done]   Optional callback called when the connection is established of if an error happened.
   * @returns {Promise<results.Disconnected> | void} Promise if no callback function was passed, void otherwise.
   */
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_019: [The `connect` method shall call the `connect` method of the base AMQP transport and translate its result to the caller into a transport-agnostic object.]*/
  connect(done: Callback<results.Connected>): void;
  connect(): Promise<results.Connected>;
  connect(done?: Callback<results.Connected>): Promise<results.Connected> | void {
    return callbackToPromise((_callback) => {
      this._fsm.handle('connect', (err) => {
        if (err) {
          _callback(translateError('AMQP Transport: Could not connect', err));
        } else {
          _callback(null, new results.Connected());
        }
      });
    }, done);
  }

  /**
   * @private
   * @method             module:azure-iothub.Amqp#disconnect
   * @description        Disconnects the link to the IoT Hub instance.
   * @param {Callback<results.Disconnected>}   [done]   Optional callback called when disconnected of if an error happened.
   * @returns {Promise<results.Disconnected> | void} Promise if no callback function was passed, void otherwise.
   */
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_020: [** The `disconnect` method shall call the `disconnect` method of the base AMQP transport and translate its result to the caller into a transport-agnostic object.]*/
  disconnect(done: Callback<results.Disconnected>): void;
  disconnect(): Promise<results.Disconnected>;
  disconnect(done?: Callback<results.Disconnected>): Promise<results.Disconnected> | void {
    return callbackToPromise((_callback) => {
      this._fsm.handle('disconnect', (err) => {
        if (err) {
          _callback(getTranslatedError(err, 'error while disconnecting'));
        } else {
          _callback(null, new results.Disconnected());
        }
      });
    }, done);
  }

  /**
   * @private
   * @method             module:azure-iothub.Amqp#send
   * @description        Sends a message to the IoT Hub.
   * @param {Message}  message    The [message]{@linkcode module:common/message.Message}
   *                              to be sent.
   * @param {Function} [done]     The optional callback to be invoked when `send`
   *                              completes execution.
   * @returns {Promise<ResultWithIncomingMessage<results.MessageEnqueued>> | void} Promise if no callback function was passed, void otherwise.
   */
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_002: [The send method shall construct an AMQP request using the message passed in argument as the body of the message.]*/
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_003: [The message generated by the send method should have its “to” field set to "/devices/(uriEncode<deviceId>)/messages/devicebound".]*/
  send(deviceId: string, message: Message, done: IncomingMessageCallback<results.MessageEnqueued>): void;
  send(deviceId: string, message: Message): Promise<ResultWithIncomingMessage<results.MessageEnqueued>>;
  send(deviceId: string, message: Message, done?: IncomingMessageCallback<results.MessageEnqueued>): Promise<ResultWithIncomingMessage<results.MessageEnqueued>> | void {
    return tripleValueCallbackToPromise((_callback) => {
      const deviceEndpoint = endpoint.deviceMessagePath(encodeURIComponent(deviceId));
      /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_002: [The `send` method shall construct an AMQP request using the message passed in argument as the body of the message.]*/
      let amqpMessage = AmqpMessage.fromMessage(message);
      this._fsm.handle('send', amqpMessage, deviceEndpoint, handleResult('AMQP Transport: Could not send message', _callback));
    }, (r, m) => { return createResultWithIncomingMessage(r, m); }, done);
  }

  /**
   * @private
   * @method             module:azure-iothub.Amqp#getFeedbackReceiver
   * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
   * @param {Function}   [done]      Optional callback used to return the {@linkcode AmqpReceiver} object.
   * @returns {Promise<ResultWithIncomingMessage<Client.ServiceReceiver>> | void} Promise if no callback function was passed, void otherwise.
   */
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_013: [The `getFeedbackReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/feedback` endpoint.]*/
  getFeedbackReceiver(done: IncomingMessageCallback<Client.ServiceReceiver>): void;
  getFeedbackReceiver(): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>>;
  getFeedbackReceiver(done?: IncomingMessageCallback<Client.ServiceReceiver>): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>> | void {
    return tripleValueCallbackToPromise((_callback) => {
      this._fsm.handle('getFeedbackReceiver', handleResult('AMQP Transport: Could not get feedback receiver', _callback));
    }, (r, m) => { return createResultWithIncomingMessage(r, m); }, done);
  }

  /**
   * @private
   * @method             module:azure-iothub.Amqp#getFileNotificationReceiver
   * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
   * @param {Function}   [done]      Optional callback used to return the {@linkcode AmqpReceiver} object.
   * @returns {Promise<Client.ServiceReceiver> | void} Promise if no callback function was passed, void otherwise.
   */
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_016: [The `getFeedbackReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/filenotifications` endpoint.]*/
  getFileNotificationReceiver(done: IncomingMessageCallback<Client.ServiceReceiver>): void;
  getFileNotificationReceiver(): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>>;
  getFileNotificationReceiver(done?: IncomingMessageCallback<Client.ServiceReceiver>): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>> | void {
    return tripleValueCallbackToPromise((_callback) => {
      this._fsm.handle('getFileNotificationReceiver', handleResult('AMQP Transport: Could not get file notification receiver', _callback));
    }, (r, m) => { return createResultWithIncomingMessage(r, m); }, done);
  }

  /**
   * @private
   * Updates the shared access signature and puts a new CBS token.
   * @param sharedAccessSignature New shared access signature used to put a new CBS token.
   * @param [callback] Optional function called when the callback has been successfully called.
   * @returns {Promise<results.SharedAccessSignatureUpdated> | void} Promise if no callback function was passed, void otherwise.
   */
  updateSharedAccessSignature(sharedAccessSignature: string, callback: Callback<results.SharedAccessSignatureUpdated>): void;
  updateSharedAccessSignature(sharedAccessSignature: string): Promise<results.SharedAccessSignatureUpdated>;
  updateSharedAccessSignature(sharedAccessSignature: string, callback?: Callback<results.SharedAccessSignatureUpdated>): Promise<results.SharedAccessSignatureUpdated> | void {
    return callbackToPromise((_callback) => {
      if (!sharedAccessSignature) {
        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_039: [The `updateSharedAccessSignature` shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
        throw new ReferenceError('sharedAccessSignature cannot be \'' + sharedAccessSignature + '\'');
      }

      this._config.sharedAccessSignature = sharedAccessSignature;
      this._fsm.handle('updateSharedAccessSignature', sharedAccessSignature, (err) => {
        if (err) {
          /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_017: [** All asynchronous instance methods shall call the `_callback` callback with a single parameter that is derived from the standard Javascript `Error` object if the operation failed.]*/
          _callback(err);
        } else {
          /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_018: [All asynchronous instance methods shall call the `_callback` callback with either no arguments or a first null argument and a second argument that is the result of the operation if the operation succeeded.]*/
          _callback(null, new results.SharedAccessSignatureUpdated(false));
        }
      });
    }, callback);
  }

  protected _getConnectionUri(): string {
    return 'amqps://' + this._config.host;
  }

  private _handleSASRenewal(): void {
    const newSas = (this._config.sharedAccessSignature as SharedAccessSignature).extend(anHourFromNow());
    this._fsm.handle('updateSharedAccessSignature', newSas, (err) => {
      if (err) {
        debug('error automatically renewing the sas token: ' + err.toString());
      } else {
        this._renewalTimeout = setTimeout(this._handleSASRenewal.bind(this), this._renewalNumberOfMilliseconds);
      }
    });
  }
}
