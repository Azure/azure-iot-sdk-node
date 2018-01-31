// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as amqp10 from 'amqp10';
import * as machina from 'machina';
import { AmqpMessage } from './amqp_message';
import { errors, results, Message } from 'azure-iot-common';
import { ClaimsBasedSecurityAgent } from './amqp_cbs';
import { SenderLink } from './sender_link';
import { ReceiverLink } from './receiver_link';
import { AmqpLink } from './amqp_link_interface';

import * as dbg from 'debug';
import * as async from 'async';
const debug = dbg('azure-iot-amqp-base:Amqp');

const _amqpClientError = 'client:errorReceived';

export type GenericAmqpBaseCallback<T> = (err: Error | null, result?: T) => void;

/**
 * @private
 * @class module:azure-iot-amqp-base.Amqp
 * @classdesc Basic AMQP functionality used by higher-level IoT Hub libraries.
 *            Usually you'll want to avoid using this class and instead rely on higher-level implementations
 *            of the AMQP transport (see [azure-iot-device-amqp.Amqp]{@link module:azure-iot-device-amqp.Amqp} for example).
 *
 * @param   {Boolean}   autoSettleMessages      Boolean indicating whether messages should be settled automatically or if the calling code will handle it.
 * @param   {String}    sdkVersionString        String identifying the type and version of the SDK used.
 */
export class Amqp {
  private uri: string;
  private _amqp: amqp10.Client;
  private _receivers: { [key: string]: ReceiverLink; } = {};
  private _senders: { [key: string]: SenderLink; } = {};
  private _disconnectHandler: (err: Error) => void;
  private _fsm: machina.Fsm;
  private _cbs: ClaimsBasedSecurityAgent;

  /*Codes_SRS_NODE_COMMON_AMQP_16_001: [The Amqp constructor shall accept two parameters:
    A Boolean indicating whether the client should automatically settle messages:
        True if the messages should be settled automatically
        False if the caller intends to manually settle messages
        A string containing the version of the SDK used for telemetry purposes] */
  constructor(autoSettleMessages: boolean, sdkVersionString: string) {
    const autoSettleMode = autoSettleMessages ? amqp10.Constants.receiverSettleMode.autoSettle : amqp10.Constants.receiverSettleMode.settleOnDisposition;
    // node-amqp10 has an automatic reconnection/link re-attach feature that is enabled by default.
    // In our case we want to control the reconnection flow ourselves, so we need to disable it.

    /*Codes_SRS_NODE_COMMON_AMQP_16_042: [The Amqp constructor shall create a new `amqp10.Client` instance and configure it to:
    - not reconnect on failure
    - not reattach sender and receiver links on failure
    - not reestablish sessions on failure]*/
    this._amqp = new amqp10.Client(amqp10.Policy.merge(<any>{
      session: {
        reestablish: {
          retries: 0,
          forever: false
        }
      },
      senderLink: {
        attach: {
          properties: {
            'com.microsoft:client-version': sdkVersionString
          },
          maxMessageSize: 0,
        },
        encoder: (body: any): any => {
          if (typeof body === 'string') {
            return new Buffer(body, 'utf8');
          } else {
            return body;
          }
        },
        reattach: {
          retries: 0,
          forever: false
        }
      },
      receiverLink: {
        attach: {
          properties: {
            'com.microsoft:client-version': sdkVersionString
          },
          maxMessageSize: 0,
          receiverSettleMode: autoSettleMode,
        },
        decoder: (body: any): any => body,
        reattach: {
          retries: 0,
          forever: false
        }
      },
      // reconnections will be handled at the client level, not the transport level.
      reconnect: {
        retries: 0,
        strategy: 'fibonacci',
        forever: false
      }
    }, amqp10.Policy.EventHub));

    const amqpErrorHandler = (err) => {
      debug('amqp10 client error: ' + err.toString());
      this._fsm.handle('amqpError', err);
    };

    this._amqp.on('disconnected', () => {
      this._fsm.handle('amqpDisconnected');
    });

    this._fsm = new machina.Fsm({
      namespace: 'amqp-base',
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (disconnectCallback, err, result) => {
            if (disconnectCallback) {
              if (err) {
                this._safeCallback(disconnectCallback, err);
              } else {
                this._safeCallback(disconnectCallback, null, new results.Disconnected());
              }
            } else if (this._disconnectHandler) {
              debug('calling upper layer disconnect handler');
              this._disconnectHandler(err);
            }
          },
          amqpError: (err, callback) => {
            debug('received an error while disconnected: maybe a bug: ' + (!!err ? err.toString() : 'callback called but falsy error object.'));
            if (callback) {
              callback();
            }
          },
          amqpDisconnected: () => debug('ignoring disconnected event while disconnected'),
          connect: (connectCallback) => {
            this._fsm.transition('connecting', connectCallback);
          },
          disconnect: (callback) => callback(null, new results.Disconnected()),
          attachSenderLink: (endpoint, linkOptions, callback) => {
            this._fsm.handle('connect', (err) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('attachSenderLink', endpoint, linkOptions, callback);
              }
            });
          },
          attachReceiverLink: (endpoint, linkOptions, callback) => {
            this._fsm.handle('connect', (err) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('attachReceiverLink', endpoint, linkOptions, callback);
              }
            });
          },
          detachSenderLink: (endpoint, callback) => this._safeCallback(callback),
          detachReceiverLink: (endpoint, callback) => this._safeCallback(callback),
          initializeCBS: (callback) => {
            this._fsm.handle('connect', (err) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('initializeCBS', callback);
              }
            });
          },
          putToken: (audience, token, callback) => {
            this._fsm.handle('initializeCBS', (err) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('putToken', audience, token, callback);
              }
            });
          },
          '*': () => this._fsm.deferUntilTransition('connected')
        },
        connecting: {
          _onEnter: (connectCallback) => {
            let connectError = null;
            const connectErrorHandler = (err) => {
              connectError = err;
            };

            this._amqp.on(_amqpClientError, connectErrorHandler);
            this._amqp.connect(this.uri)
              .then((result) => {
                debug('AMQP transport connected.');
                this._amqp.on(_amqpClientError, amqpErrorHandler);
                this._amqp.removeListener(_amqpClientError, connectErrorHandler);
                this._fsm.transition('connected', connectCallback, result);
                return null;
              })
              .catch((err) => {
                this._amqp.removeListener(_amqpClientError, connectErrorHandler);
                /*Codes_SRS_NODE_COMMON_AMQP_16_003: [The `connect` method shall call the `done` callback if the connection fails.] */
                this._fsm.transition('disconnected', connectCallback, connectError || err);
              });
          },
          amqpError: (err, callback) => this._fsm.transition('disconnecting', callback, err),
          amqpDisconnected: () => debug('ignoring disconnected event while connecting'),
          '*': () => this._fsm.deferUntilTransition()
        },
        connected: {
          _onEnter: (connectCallback, result) => {
            /*Codes_SRS_NODE_COMMON_AMQP_16_002: [The `connect` method shall establish a connection with the IoT hub instance and if given as argument call the `done` callback with a null error object in the case of success and a `results.Connected` object.]*/
            this._safeCallback(connectCallback, null, new results.Connected(result));
          },
          amqpError: (err, callback) => this._fsm.transition('disconnecting', callback, err),
          amqpDisconnected: () => this._fsm.transition('disconnected', undefined, new errors.NotConnectedError('amqp10: connection closed')),
          connect: (callback) => callback(null, new results.Connected()),
          disconnect: (disconnectCallback) => {
            this._fsm.transition('disconnecting', disconnectCallback);
          },
          initializeCBS: (callback) => {
            this._cbs = new ClaimsBasedSecurityAgent(this._amqp);
            this._cbs.attach(callback);
          },
          putToken: (audience, token, callback) => {
            this._cbs.putToken(audience, token, callback);
          },
          send: (message: Message, endpoint: string, to: string, done: GenericAmqpBaseCallback<any>): void => {
            /*Codes_SRS_NODE_COMMON_AMQP_16_006: [The `send` method shall construct an AMQP message using information supplied by the caller, as follows:
            The ‘to’ field of the message should be set to the ‘to’ argument.
            The ‘body’ of the message should be built using the message argument.] */
            debug('call to deprecated api \'azure-iot-amqp-base.Amqp.send\'. You should be using SenderLink.send instead');
            let amqpMessage = AmqpMessage.fromMessage(message);
            if (to !== undefined) {
              amqpMessage.properties.to = to;
            }

            if (!this._senders[endpoint]) {
              this._fsm.handle('attachSenderLink', endpoint, null, (err) => {
                if (err) {
                  debug('failed to attach the sender link: ' + err.toString());
                  done(err);
                } else {
                  (this._senders[endpoint] as SenderLink).send(amqpMessage, done);
                }
              });
            } else {
              (this._senders[endpoint] as SenderLink).send(amqpMessage, done);
            }

          },
          getReceiver: (endpoint: string, done: GenericAmqpBaseCallback<ReceiverLink>): void => {
            /*Codes_SRS_NODE_COMMON_AMQP_16_010: [If a receiver for this endpoint doesn’t exist, the getReceiver method should create a new AmqpReceiver object and then call the done() method with the object that was just created as an argument.] */
            if (!this._receivers[endpoint]) {
              this._fsm.handle('attachReceiverLink', endpoint, null, (err) => {
                if (err) {
                  done(err);
                } else {
                  done(null, this._receivers[endpoint]);
                }
              });
            } else {
              /*Codes_SRS_NODE_COMMON_AMQP_16_009: [If a receiver for this endpoint has already been created, the getReceiver method should call the done() method with the existing instance as an argument.] */
              done(null, this._receivers[endpoint]);
            }
          },
          attachReceiverLink: (endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback<ReceiverLink>): void => {
            debug('creating receiver link for: ' + endpoint);
            this._receivers[endpoint] = new ReceiverLink(endpoint, linkOptions, this._amqp);
            const permanentErrorHandler = (err) => {
              debug('receiver link error - removing it from cache: ' + endpoint + ': ' + err.toString());
              delete(this._receivers[endpoint]);
            };

            const operationErrorHandler = (err) => {
              debug('calling attachReceiverLink callback with error: ' + err.toString());
              done(err);
            };

            this._receivers[endpoint].on('error', permanentErrorHandler);
            this._receivers[endpoint].on('error', operationErrorHandler);
            this._receivers[endpoint].attach((err) => {
              if (err) {
                debug('failed to attach receiver link: ' + endpoint + ': ' + err.toString());
                permanentErrorHandler(err);
                operationErrorHandler(err);
              } else {
                this._receivers[endpoint].removeListener('error', operationErrorHandler);
                debug('receiver link attached: ' + endpoint);
                done(null, this._receivers[endpoint]);
              }
            });
          },
          attachSenderLink: (endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback<any>): void => {
            debug('creating sender link for: ' + endpoint);
            let senderFsm = new SenderLink(endpoint, linkOptions, this._amqp);
            this._senders[endpoint] = senderFsm;
            const permanentErrorHandler = (err) => {
              debug('sender link error while attaching: ' + endpoint + ': ' + err.toString());
              delete(this._senders[endpoint]);
            };

            const operationErrorHandler = (err) => {
              debug('calling attachSenderLink callback with error: ' + err.toString());
              done(err);
            };

            this._senders[endpoint].on('error', permanentErrorHandler);
            this._senders[endpoint].on('error', operationErrorHandler);
            debug('attaching sender link for: ' + endpoint);
            this._senders[endpoint].attach((err) => {
              if (err) {
                permanentErrorHandler(err);
                operationErrorHandler(err);
              } else {
                this._senders[endpoint].removeListener('error', operationErrorHandler);
                debug('sender link attached: ' + endpoint);
                done(null, this._senders[endpoint]);
              }
            });
          },
          detachReceiverLink: (endpoint: string, detachCallback: GenericAmqpBaseCallback<any>): void => {
            if (!this._receivers[endpoint]) {
              this._safeCallback(detachCallback);
            } else {
              this._detachLink(this._receivers[endpoint], (err?) => {
                delete(this._receivers[endpoint]);
                this._safeCallback(detachCallback, err);
              });
            }
          },
          detachSenderLink: (endpoint: string, detachCallback: GenericAmqpBaseCallback<any>): void => {
            this._detachLink(this._senders[endpoint], (err?) => {
              delete(this._senders[endpoint]);
              this._safeCallback(detachCallback, err);
            });
          }
        },
        disconnecting: {
          _onEnter: (disconnectCallback, err) => {
            const disconnect = (callback) => {
              if (err) {
                callback();
              } else {
                /*Codes_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the done callback when the application/service has been successfully disconnected from the service] */
                this._amqp.disconnect().then(() => {
                  debug('amqp10 client cleanly disconnected');
                  callback();
                  return null;
                }).catch((err) => {
                  debug('amqp10 failed to cleanly disconnect: ' + err.toString());
                  callback(err);
                });
              }
            };

            const detachLink = (link, callback) => {
              if (!link) {
                return callback();
              }

              if (err) {
                debug('forceDetaching link');
                link.forceDetach(err);
                callback();
              } else {
                debug('cleanly detaching link');
                link.detach(callback);
              }
            };

            detachLink(this._cbs, () => {
              let remainingLinks = [];
              for (let senderEndpoint in this._senders) {
                if (this._senders.hasOwnProperty(senderEndpoint)) {
                  remainingLinks.push(this._senders[senderEndpoint]);
                  delete this._senders[senderEndpoint];
                }
              }

              for (let receiverEndpoint in this._receivers) {
                if (this._receivers.hasOwnProperty(receiverEndpoint)) {
                  remainingLinks.push(this._receivers[receiverEndpoint]);
                    delete this._receivers[receiverEndpoint];
                }
              }

              /*Codes_SRS_NODE_COMMON_AMQP_16_034: [The `disconnect` method shall detach all open links before disconnecting the underlying AMQP client.]*/
              async.each(remainingLinks, detachLink, () => {
                disconnect((disconnectError) => {
                  const finalError = err || disconnectError;
                  this._amqp.removeListener(_amqpClientError, amqpErrorHandler);
                  this._fsm.transition('disconnected', disconnectCallback, finalError);
                });
              });
            });
          },
          amqpDisconnected: () => debug('ignoring disconnected event while disconnecting'),
          '*': () => this._fsm.deferUntilTransition('disconnected')
        }
      }
    });

    this._fsm.on('transition', (transition) => {
      debug(transition.fromState + ' -> ' + transition.toState + ' (action:' + transition.action + ')');
    });
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#connect
   * @description        Establishes a connection with the IoT Hub instance.
   * @param {String}     uri           The uri to connect with.
   * @param {Object}     sslOptions    SSL certificate options.
   * @param {Function}   done          Callback called when the connection is established or if an error happened.
   */
  connect(uri: string, sslOptions: any, done: GenericAmqpBaseCallback<any>): void {
    /*Codes_SRS_NODE_COMMON_AMQP_06_002: [The `connect` method shall throw a ReferenceError if the uri parameter has not been supplied.] */
    if (!uri) throw new ReferenceError('The uri parameter can not be \'' + uri + '\'');
    this.uri = uri;
    if (this.uri.substring(0, 3) === 'wss') {
      const wsTransport = require('amqp10-transport-ws');
      wsTransport.register(amqp10.TransportProvider);
    }
    this._amqp.policy.connect.options.sslOptions = sslOptions;
    this._fsm.handle('connect', done);
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#setDisconnectCallback
   * @description        Sets the callback that should be called in case of disconnection.
   * @param {Function}   disconnectCallback   Called when the connection disconnected.
   */
  setDisconnectHandler(disconnectCallback: GenericAmqpBaseCallback<any>): void {
    this._disconnectHandler = disconnectCallback;
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#disconnect
   * @description        Disconnects the link to the IoT Hub instance.
   * @param {Function}   done   Called when disconnected of if an error happened.
   */
  disconnect(done: GenericAmqpBaseCallback<any>): void {
    this._fsm.handle('disconnect', done);
  }

  /**
   * @deprecated         Use attachSenderLink and the SenderLink.send() method instead
   * @method             module:azure-iot-amqp-base.Amqp#send
   * @description        Sends a message to the IoT Hub instance.
   *
   * @param {Message}   message   The message to send.
   * @param {string}    endpoint  The endpoint to use when sending the message.
   * @param {string}    to        The destination of the message.
   * @param {Function}  done      Called when the message is sent or if an error happened.
   */
  send(message: Message, endpoint: string, to: string, done: GenericAmqpBaseCallback<any>): void {
    this._fsm.handle('send', message, endpoint, to, done);
  }

  /**
   * @deprecated         use attachReceiverLink() instead.
   * @method             module:azure-iot-amqp-base.Amqp#getReceiver
   * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
   *
   * @param {string}    endpoint  Endpoint used for the receiving link.
   * @param {Function}  done      Callback used to return the {@linkcode AmqpReceiver} object.
   */
  getReceiver(endpoint: string, done: GenericAmqpBaseCallback<ReceiverLink>): void {
    this._fsm.handle('getReceiver', endpoint, done);
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#attachReceiverLink
   * @description        Creates and attaches an AMQP receiver link for the specified endpoint.
   *
   * @param {string}    endpoint    Endpoint used for the receiver link.
   * @param {Object}    linkOptions Configuration options to be merged with the AMQP10 policies for the link..
   * @param {Function}  done        Callback used to return the link object or an Error.
   */
  attachReceiverLink(endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback<ReceiverLink>): void {
    /*Codes_SRS_NODE_COMMON_AMQP_16_017: [The `attachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
    if (!endpoint) {
      throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
    }

    this._fsm.handle('attachReceiverLink', endpoint, linkOptions, done);
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#attachSenderLink
   * @description        Creates and attaches an AMQP sender link for the specified endpoint.
   *
   * @param {string}    endpoint    Endpoint used for the sender link.
   * @param {Object}    linkOptions Configuration options to be merged with the AMQP10 policies for the link..
   * @param {Function}  done        Callback used to return the link object or an Error.
   */
  attachSenderLink(endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback<SenderLink>): void {
    /*Codes_SRS_NODE_COMMON_AMQP_16_012: [The `attachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
    if (!endpoint) {
      throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
    }

    this._fsm.handle('attachSenderLink', endpoint, linkOptions, done);
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#detachReceiverLink
   * @description        Detaches an AMQP receiver link for the specified endpoint if it exists.
   *
   * @param {string}    endpoint  Endpoint used to identify which link should be detached.
   * @param {Function}  done      Callback used to signal success or failure of the detach operation.
   */
  detachReceiverLink(endpoint: string, detachCallback: GenericAmqpBaseCallback<any>): void {
    /*Codes_SRS_NODE_COMMON_AMQP_16_027: [The `detachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
    if (!endpoint) {
      throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
    }

    this._fsm.handle('detachReceiverLink', endpoint, detachCallback);
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#detachSenderLink
   * @description        Detaches an AMQP sender link for the specified endpoint if it exists.
   *
   * @param {string}    endpoint  Endpoint used to identify which link should be detached.
   * @param {Function}  done      Callback used to signal success or failure of the detach operation.
   */
  detachSenderLink(endpoint: string, detachCallback: GenericAmqpBaseCallback<any>): void {
    /*Codes_SRS_NODE_COMMON_AMQP_16_022: [The `detachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
    if (!endpoint) {
      throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
    }

    this._fsm.handle('detachSenderLink', endpoint, detachCallback);
  }

  initializeCBS(callback: (err?: Error) => void): void {
    this._fsm.handle('initializeCBS', callback);
  }

  putToken(audience: string, token: string, callback: (err?: Error) => void): void {
    this._fsm.handle('putToken', audience, token, callback);
  }

  private _detachLink(link: AmqpLink, detachCallback: GenericAmqpBaseCallback<any>): void {
    if (!link) {
      /*Codes_SRS_NODE_COMMON_AMQP_16_030: [The `detachReceiverLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
      /*Codes_SRS_NODE_COMMON_AMQP_16_025: [The `detachSenderLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
      this._safeCallback(detachCallback);
    } else {
      /*Codes_SRS_NODE_COMMON_AMQP_16_028: [The `detachReceiverLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
      /*Codes_SRS_NODE_COMMON_AMQP_16_023: [The `detachSenderLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
      link.detach(() => {
        /*Codes_SRS_NODE_COMMON_AMQP_16_029: [The `detachReceiverLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
        /*Codes_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
        this._safeCallback(detachCallback);
      });
    }
  }

  /*Codes_SRS_NODE_COMMON_AMQP_16_011: [All methods should treat the `done` callback argument as optional and not throw if it is not passed as argument.]*/
  private _safeCallback(callback: GenericAmqpBaseCallback<any>, error?: Error | null, result?: any): void {
    if (callback) {
      process.nextTick(() => callback(error, result));
    }
  }
}
