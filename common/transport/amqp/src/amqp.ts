// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as amqp10 from 'amqp10';
import * as machina from 'machina';
import { AmqpMessage } from './amqp_message';
import { results, Message } from 'azure-iot-common';
import { ClaimsBasedSecurityAgent } from './amqp_cbs';
import { SenderLink } from './sender_link';
import { ReceiverLink } from './receiver_link';
import { AmqpLink } from './amqp_link_interface';

import * as dbg from 'debug';
const debug = dbg('amqp-common');

const _amqpClientError = 'client:errorReceived';

export type GenericAmqpBaseCallback = (err: Error | null, result?: any) => void;

/**
 * @class module:azure-iot-amqp-base.Amqp
 * @classdesc Basic AMQP functionality used by higher-level IoT Hub libraries.
 *            Usually you'll want to avoid using this class and instead rely on higher-level implementations
 *            of the AMQP transport (see [azure-iot-device-amqp.Amqp]{@link module:azure-iot-device-amqp.Amqp} for example).
 *
 * @param   {Boolean}   autoSettleMessages      Boolean indicating whether messages should be settled automatically or if the calling code will handle it.
 * @param   {String}    sdkVersionString        String identifying the SDK used (device or service).
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

    this._amqp = new amqp10.Client(amqp10.Policy.merge(<any>{
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

    this._fsm = new machina.Fsm({
      initialState: 'disconnected',
      states: {
        disconnected: {
          connect: (connectCallback) => {
            this._fsm.transition('connecting');
            let connectError = null;
            const connectErrorHandler = (err) => {
              connectError = err;
            };

            const amqpErrorHandler = (err) => {
              debug('amqp10 error: ' + err.toString());
              if (this._disconnectHandler) {
                this._disconnectHandler(err);
              }
            };

            this._amqp.on(_amqpClientError, connectErrorHandler);
            this._amqp.connect(this.uri)
              .then((result) => {
                debug('AMQP transport connected.');
                this._amqp.on(_amqpClientError, amqpErrorHandler);
                this._amqp.removeListener(_amqpClientError, connectErrorHandler);
                this._fsm.transition('connected');
                /*Codes_SRS_NODE_COMMON_AMQP_16_002: [The `connect` method shall establish a connection with the IoT hub instance and if given as argument call the `done` callback with a null error object in the case of success and a `results.Connected` object.]*/
                this._safeCallback(connectCallback, null, new results.Connected(result));
                return null;
              })
              .catch((err) => {
                this._amqp.removeListener(_amqpClientError, connectErrorHandler);
                this._fsm.transition('disconnected');
                /*Codes_SRS_NODE_COMMON_AMQP_16_003: [The `connect` method shall call the `done` callback if the connection fails.] */
                this._safeCallback(connectCallback, connectError || err);
              });
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
          connect: () => this._fsm.deferUntilTransition(),
          disconnect: () => this._fsm.deferUntilTransition(),
          '*': () => this._fsm.deferUntilTransition('connected')
        },
        connected: {
          connect: (callback) => callback(null, new results.Connected()),
          disconnect: (disconnectCallback) => {
            this._fsm.transition('disconnecting');
            this._disconnect((err) => {
              this._fsm.transition('disconnected');
              disconnectCallback(err);
            });
          },
          initializeCBS: (callback) => {
            this._cbs = new ClaimsBasedSecurityAgent(this._amqp);
            this._cbs.attach(callback);
          },
          putToken: (audience, token, callback) => {
            this._cbs.putToken(audience, token, callback);
          },
          send: (message: Message, endpoint: string, to: string, done: GenericAmqpBaseCallback): void => {
            /*Codes_SRS_NODE_COMMON_AMQP_16_006: [The `send` method shall construct an AMQP message using information supplied by the caller, as follows:
            The ‘to’ field of the message should be set to the ‘to’ argument.
            The ‘body’ of the message should be built using the message argument.] */

            let amqpMessage = AmqpMessage.fromMessage(message);
            if (to !== undefined) {
              amqpMessage.properties.to = to;
            }

            if (!this._senders[endpoint]) {
              this._fsm.handle('attachSenderLink', endpoint, null, (err) => {
                if (err) {
                  done(err);
                } else {
                  (this._senders[endpoint] as SenderLink).send(amqpMessage, done);
                }
              });
            } else {
              (this._senders[endpoint] as SenderLink).send(amqpMessage, done);
            }

          },
          getReceiver: (endpoint: string, done: GenericAmqpBaseCallback): void => {
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
              this._safeCallback(done, null, this._receivers[endpoint]);
            }
          },
          attachReceiverLink: (endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback): void => {
            let receiverFsm = new ReceiverLink(endpoint, linkOptions, this._amqp);
            this._receivers[endpoint] = receiverFsm;
            this._receivers[endpoint].on('error', (err) => {
              debug('error on the receiver link for endpoint ' + endpoint);
              debug(err.toString());
              delete(this._receivers[endpoint]);
            });
            this._receivers[endpoint].attach(done);
          },
          attachSenderLink: (endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback): void => {
            let senderFsm = new SenderLink(endpoint, linkOptions, this._amqp);
            this._senders[endpoint] = senderFsm;
            this._senders[endpoint].on('error', (err) => {
              debug('error on the sender link for endpoint ' + endpoint);
              debug(err.toString());
              delete(this._senders[endpoint]);
            });
            this._senders[endpoint].attach(done);
          },
          detachReceiverLink: (endpoint: string, detachCallback: GenericAmqpBaseCallback): void => {
            if (!this._receivers[endpoint]) {
              this._safeCallback(detachCallback);
            } else {
              this._detachLink(this._receivers[endpoint], (err?) => {
                delete(this._receivers[endpoint]);
                detachCallback(err);
              });
            }
          },
          detachSenderLink: (endpoint: string, detachCallback: GenericAmqpBaseCallback): void => {
            this._detachLink(this._senders[endpoint], (err?) => {
              delete(this._senders[endpoint]);
              detachCallback(err);
            });
          }
        },
        disconnecting: {
          '*': () => this._fsm.deferUntilTransition('disconnected')
        }
      }
    });
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#connect
   * @description        Establishes a connection with the IoT Hub instance.
   * @param {String}     uri           The uri to connect with.
   * @param {Object}     sslOptions    SSL certificate options.
   * @param {Function}   done          Callback called when the connection is established or if an error happened.
   */
  connect(uri: string, sslOptions: any, done: GenericAmqpBaseCallback): void {
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
  setDisconnectHandler(disconnectCallback: GenericAmqpBaseCallback): void {
    this._disconnectHandler = disconnectCallback;
    this._amqp.on('connection:closed', () => {
      this._disconnectHandler(new Error('amqp10: connection closed'));
    });
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#disconnect
   * @description        Disconnects the link to the IoT Hub instance.
   * @param {Function}   done   Called when disconnected of if an error happened.
   */
  disconnect(done: GenericAmqpBaseCallback): void {
    this._fsm.handle('disconnect', done);
  }

  _disconnect(done: GenericAmqpBaseCallback): void {
    /*Codes_SRS_NODE_COMMON_AMQP_16_034: [The `disconnect` method shall detach all open links before disconnecting the underlying AMQP client.]*/
    for (let senderEndpoint in this._senders) {
      if (this._senders.hasOwnProperty(senderEndpoint)) {
        this._senders[senderEndpoint].detach();
        delete this._senders[senderEndpoint];
      }
    }
    this._senders = {};

    for (let receiverEndpoint in this._receivers) {
      if (this._receivers.hasOwnProperty(receiverEndpoint)) {
        this._receivers[receiverEndpoint].detach();
        delete this._receivers[receiverEndpoint];
      }
    }
    this._receivers = {};

    if (this._cbs) {
      this._cbs.detach();
    }

    /*Codes_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the done callback when the application/service has been successfully disconnected from the service] */
    this._amqp.disconnect()
              .then(() => {
                this._safeCallback(done, null, new results.Disconnected());
              })
              .catch((err) => {
                this._safeCallback(done, err);
              });
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#send
   * @description        Sends a message to the IoT Hub instance.
   *
   * @param {Message}   message   The message to send.
   * @param {string}    endpoint  The endpoint to use when sending the message.
   * @param {string}    to        The destination of the message.
   * @param {Function}  done      Called when the message is sent or if an error happened.
   */
  send(message: Message, endpoint: string, to: string, done: GenericAmqpBaseCallback): void {
    this._fsm.handle('send', message, endpoint, to, done);
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#getReceiver
   * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
   *
   * @param {string}    endpoint  Endpoint used for the receiving link.
   * @param {Function}  done      Callback used to return the {@linkcode AmqpReceiver} object.
   */
  getReceiver(endpoint: string, done: GenericAmqpBaseCallback): void {
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
  attachReceiverLink(endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback): void {
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
  attachSenderLink(endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback): void {
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
  detachReceiverLink(endpoint: string, detachCallback: GenericAmqpBaseCallback): void {
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
  detachSenderLink(endpoint: string, detachCallback: GenericAmqpBaseCallback): void {
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

  private _detachLink(link: AmqpLink, detachCallback: GenericAmqpBaseCallback): void {
    if (!link) {
      /*Codes_SRS_NODE_COMMON_AMQP_16_030: [The `detachReceiverLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
      /*Codes_SRS_NODE_COMMON_AMQP_16_025: [The `detachSenderLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
      this._safeCallback(detachCallback);
    } else {
      /*Codes_SRS_NODE_COMMON_AMQP_16_028: [The `detachReceiverLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
      /*Codes_SRS_NODE_COMMON_AMQP_16_023: [The `detachSenderLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
      link.detach();
      /*Codes_SRS_NODE_COMMON_AMQP_16_029: [The `detachReceiverLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
      /*Codes_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
      this._safeCallback(detachCallback);
    }
  }

  /*Codes_SRS_NODE_COMMON_AMQP_16_011: [All methods should treat the `done` callback argument as optional and not throw if it is not passed as argument.]*/
  private _safeCallback(callback: GenericAmqpBaseCallback, error?: Error | null, result?: any): void {
    if (callback) {
      process.nextTick(() => callback(error, result));
    }
  }
}
