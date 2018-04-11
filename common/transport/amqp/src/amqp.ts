// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import rhea = require('rhea');
import * as machina from 'machina';
import urlParser = require('url');
import { AmqpMessage } from './amqp_message';
import { errors, results, Message } from 'azure-iot-common';
import { ClaimsBasedSecurityAgent } from './amqp_cbs';
import { SenderLink } from './sender_link';
import { ReceiverLink } from './receiver_link';
import { AmqpLink } from './amqp_link_interface';
// From https://www.typescriptlang.org/docs/handbook/modules.html
// When exporting a module using export =, TypeScript-specific import module = require("module") must be used to import the module
import merge = require('lodash.merge');
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
  private _amqpContainer: any;
  private _amqpConnection: any;
  private _amqpSession: any;
  private _receivers: { [key: string]: ReceiverLink; } = {};
  private _senders: { [key: string]: SenderLink; } = {};
  private _disconnectHandler: (err: Error) => void;
  private _fsm: machina.Fsm;
  private _cbs: ClaimsBasedSecurityAgent;
  private _config: AmqpBaseTransportConfig;

  /*Codes_SRS_NODE_COMMON_AMQP_16_001: [The Amqp constructor shall accept two parameters:
    A Boolean indicating whether the client should automatically settle messages:
        True if the messages should be settled automatically
        False if the caller intends to manually settle messages
        A string containing the version of the SDK used for telemetry purposes] */
  constructor(autoSettleMessages: boolean) {
    const autoSettleMode = autoSettleMessages ? 1 : 2;
    // node-amqp10 has an automatic reconnection/link re-attach feature that is enabled by default.
    // In our case we want to control the reconnection flow ourselves, so we need to disable it.

    /*Codes_SRS_NODE_COMMON_AMQP_16_042: [The Amqp constructor shall create a new `amqp10.Client` instance and configure it to:
    - not reconnect on failure
    - not reattach sender and receiver links on failure
    - not reestablish sessions on failure]*/
    this._amqpContainer = rhea.create_container(
    );
    let manageConnectedConnectionHandlers: (operation: string) => void;
    const amqpErrorHandler = (err) => {
      debug('rhea client error: ' + ((!!err) ? err.toString() : 'no err provided on the error'));
      this._fsm.handle('amqpError', err);
    };
    const amqpDisconnectedHandler = (err) => {
      debug('rhea client error: ' + ((!!err) ? err.toString() : 'no err provided on the disconnect'));
      this._fsm.handle('amqpDisconnected', err);
    };
    manageConnectedConnectionHandlers = (operation: string) => {
      this._amqpConnection[operation]('error', amqpErrorHandler);
      this._amqpConnection[operation]('disconnected', amqpDisconnectedHandler);
      this._amqpConnection[operation]('connection_close', amqpErrorHandler);
    };

    this._amqpContainer.on('disconnected', () => {
      // deferring this is necessary because in some instances
      // the rhea library might want to send a close frame - and we don't want
      // to trigger anything (especially not reconnection) before it has done so.
      process.nextTick(() => {
        this._fsm.handle('amqpDisconnected');
      });
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
          amqpError: (err) => {
            debug('received an error while disconnected: maybe a bug: ' + (!!err ? err.toString() : 'falsy error object.'));
          },
          amqpDisconnected: () => debug('ignoring disconnected event while disconnected'),
          connect: (connectionParameters, connectCallback) => {
            this._fsm.transition('connecting', connectionParameters, connectCallback);
          },
          disconnect: (callback) => callback(null, new results.Disconnected()),
          attachSenderLink: (endpoint, linkOptions, callback) => callback(new errors.NotConnectedError()),
          attachReceiverLink: (endpoint, linkOptions, callback) => callback(new errors.NotConnectedError()),
          detachSenderLink: (endpoint, callback) => this._safeCallback(callback),
          detachReceiverLink: (endpoint, callback) => this._safeCallback(callback),
          initializeCBS: (callback) => callback(new errors.NotConnectedError()),
          putToken: (audience, token, callback) => callback(new errors.NotConnectedError()),
        },
        connecting: {
          _onEnter: (connectionParameters, connectCallback) => {
            this._amqpContainer.options.sender_options = {properties: {'com.microsoft:client-version': this._config.userAgentString}, reconnect: false};
            this._amqpContainer.options.receiver_options = {properties: {'com.microsoft:client-version': this._config.userAgentString}, reconnect: false, autoaccept: autoSettleMode};
            let manageCreateConnectionHandlers: (operation: string) => void;
            const createConnectionErrorHandler = (err) => {
              debug('In the error handler for the connect');
              manageCreateConnectionHandlers('removeListener');
              this._fsm.transition('disconnected', connectCallback, err);
            };
            const createConnectionDisconnectHandler = (err) => {
              debug('In the disconnect handler for the connect');
              manageCreateConnectionHandlers('removeListener');
              this._fsm.transition('disconnected', connectCallback, err);
            };
            const createConnectionCloseHandler = (context) => {
              debug('In the close handler for connect');
              manageCreateConnectionHandlers('removeListener');
              this._fsm.transition('disconnected', connectCallback, context);
            };
            const createConnectionOpenHandler = (context) => {
              debug('In the open handler for connect');
              manageCreateConnectionHandlers('removeListener');
              this._amqpConnection = context.connection;
              manageConnectedConnectionHandlers('on');
              this._fsm.transition('connecting_session', connectCallback, context);
            };
            manageCreateConnectionHandlers = (operation: string) => {
              this._amqpContainer[operation]('connection_open', createConnectionOpenHandler);
              this._amqpContainer[operation]('connection_close', createConnectionCloseHandler);
              this._amqpContainer[operation]('error', createConnectionErrorHandler);
              this._amqpContainer[operation]('disconnected', createConnectionDisconnectHandler);
            };
            manageCreateConnectionHandlers('on');
            this._amqpContainer.connect(connectionParameters);
          },
          amqpError: (err) => this._fsm.transition('disconnecting', null, err),
          amqpDisconnected: () => debug('ignoring disconnected event while connecting'),
          '*': () => this._fsm.deferUntilTransition()
        },
        connecting_session: {
          _onEnter: (connectCallback, result) => {
            let manageCreateSessionHandlers: (operation: string) => void;
            const createSessionErrorHandler = (err) => {
              debug('In the error handler for the session create');
              manageCreateSessionHandlers('removeListener');
              this._fsm.transition('disconnecting', connectCallback, err);
            };
            const createSessionCloseHandler = (context) => {
              debug('In the close handler for the session create');
              manageCreateSessionHandlers('removeListener');
              this._fsm.transition('disconnecting', connectCallback, context);
            };
            const createSessionOpenHandler = (context) => {
              debug('In the open handler for session create');
              manageCreateSessionHandlers('removeListener');
              this._fsm.transition('connected', connectCallback, context);
            };
            manageCreateSessionHandlers = (operation: string) => {
              this._amqpSession[operation]('session_open', createSessionOpenHandler);
              this._amqpSession[operation]('session_close', createSessionCloseHandler);
              this._amqpSession[operation]('session_error', createSessionErrorHandler);
            };
            this._amqpSession = this._amqpConnection.create_session();
            manageCreateSessionHandlers('on');
            this._amqpSession.open();

          },
          amqpError: (err) => this._fsm.transition('disconnecting', null, err),
          amqpDisconnected: () => debug('ignoring disconnected event while connecting'),
          '*': () => this._fsm.deferUntilTransition()
        },
        connected: {
          _onEnter: (connectCallback, result) => {
            /*Codes_SRS_NODE_COMMON_AMQP_16_002: [The `connect` method shall establish a connection with the IoT hub instance and if given as argument call the `done` callback with a null error object in the case of success and a `results.Connected` object.]*/
            this._safeCallback(connectCallback, null, new results.Connected(result));
          },
          amqpError: (err) => this._fsm.transition('disconnecting', null, err),
          amqpDisconnected: () => this._fsm.transition('disconnected', undefined, new errors.NotConnectedError('amqp10: connection closed')),
          connect: (policyOverride, callback) => callback(null, new results.Connected()),
          disconnect: (disconnectCallback) => {
            this._fsm.transition('disconnecting', disconnectCallback);
          },
          initializeCBS: (callback) => {
            this._cbs = new ClaimsBasedSecurityAgent(this._amqpSession);
            this._cbs.attach(callback);
          },
          putToken: (audience, token, callback) => {
            if (!this._cbs) {
              this._fsm.handle('initializeCBS', (err) => {
                if (err) {
                  callback(err);
                } else {
                  this._fsm.handle('putToken', audience, token, callback);
                }
              });
            } else {
              this._cbs.putToken(audience, token, callback);
            }
          },
          send: (message: Message, endpoint: string, to: string, done: GenericAmqpBaseCallback<any>): void => {
            /*Codes_SRS_NODE_COMMON_AMQP_16_006: [The `send` method shall construct an AMQP message using information supplied by the caller, as follows:
            The ‘to’ field of the message should be set to the ‘to’ argument.
            The ‘body’ of the message should be built using the message argument.] */
            debug('call to deprecated api \'azure-iot-amqp-base.Amqp.send\'. You should be using SenderLink.send instead');
            let amqpMessage = AmqpMessage.fromMessage(message);
            if (to !== undefined) {
              amqpMessage.to = to;
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
            this._receivers[endpoint] = new ReceiverLink(endpoint, linkOptions, this._amqpSession);
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
            /*Codes_SRS_NODE_COMMON_AMQP_16_018: [The `attachReceiverLink` method shall call `open_receiver` on the `rhea` session object.]*/
            this._receivers[endpoint].attach((err) => {
              if (err) {
                debug('failed to attach receiver link: ' + endpoint + ': ' + err.toString());
                permanentErrorHandler(err);
                operationErrorHandler(err);
              } else {
                //
                // TODO: It seems odd not to remove the perm error handler here also. (also for attachSender)
                //
                this._receivers[endpoint].removeListener('error', operationErrorHandler);
                debug('receiver link attached: ' + endpoint);
                done(null, this._receivers[endpoint]);
              }
            });
          },
          attachSenderLink: (endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback<any>): void => {
            debug('creating sender link for: ' + endpoint);
            this._senders[endpoint] = new SenderLink(endpoint, linkOptions, this._amqpSession);
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
            /*Codes_SRS_NODE_COMMON_AMQP_16_013: [The `attachSenderLink` method shall call `open_sender` on the `rhea` session object.]*/
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
              manageConnectedConnectionHandlers('removeListener');
              let manageCloseConnectionHandlers: (operation: string) => void;
              const closeConnectionErrorHandler = (err) => {
                debug('amqp10 failed to cleanly disconnect: ' + err.toString());
                manageCloseConnectionHandlers('removeListener');
                callback(err);
              };
              const closeConnectionCloseHandler = () => {
                debug('rhea client cleanly disconnected');
                manageCloseConnectionHandlers('removeListener');
                callback();
              };
              manageCloseConnectionHandlers = (operation: string) => {
                this._amqpConnection[operation]('connection_close', closeConnectionCloseHandler);
                this._amqpConnection[operation]('connection_error', closeConnectionErrorHandler);
              };
              manageCloseConnectionHandlers('on');
              if (err) {
                callback();
              } else {
                /*Codes_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the done callback when the application/service has been successfully disconnected from the service] */
                this._amqpConnection.close();
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
                  this._amqpConnection.removeListener(_amqpClientError, amqpErrorHandler);
                  this._fsm.transition('disconnected', disconnectCallback, finalError);
                });
              });
            });
          },
          amqpError: (err) => debug('ignoring error event while disconnecting: ' + (!!err) ? err.toString() : 'falsy error object'),
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
   * @param {AmqpBaseTransportConfig}     config        Configuration object
   * @param {Function}                    done          Callback called when the connection is established or if an error happened.
   */
  connect(config: AmqpBaseTransportConfig, done: GenericAmqpBaseCallback<any>): void {

    let parsedUrl = urlParser.parse(config.uri);
    let connectionParameters: any = {};
    if (config.sslOptions) {
      connectionParameters.cert = config.sslOptions.cert;
      connectionParameters.key = config.sslOptions.key;
    }
    connectionParameters.port = parsedUrl.port ? ( parsedUrl.port ) : (5671);
    connectionParameters.transport = 'tls';
    connectionParameters.hostname = parsedUrl.hostname;
    connectionParameters.host = parsedUrl.hostname;
    connectionParameters.reconnect = false;
    if (parsedUrl.protocol === 'wss:') {
      let webSocket = require('ws');
      let ws = this._amqpContainer.websocket_connect(webSocket);
      connectionParameters.connection_details = ws(config.uri, 'AMQPWSB10' );
    }
    connectionParameters = merge(connectionParameters, config.policyOverride);
    this._config = config;
    this._fsm.handle('connect', connectionParameters, done);
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
   * @param {Object}    linkOptions Configuration options to be merged with the rhea policies for the link..
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
   * @param {Object}    linkOptions Configuration options to be merged with the rhea policies for the link..
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

/**
 * @private
 */
export interface AmqpBaseTransportConfig {
  uri: string;
  userAgentString: string;
  sslOptions?: any;
  saslMechanismName?: string;
  saslMechanism?: any;
  policyOverride?: any;
}
