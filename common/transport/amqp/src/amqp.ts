// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as machina from 'machina';
import urlParser = require('url');
import { AmqpMessage } from './amqp_message';
import { errors, results, Message } from 'azure-iot-common';
import { ClaimsBasedSecurityAgent } from './amqp_cbs';
import { SenderLink } from './sender_link';
import { ReceiverLink } from './receiver_link';
import { AmqpLink } from './amqp_link_interface';
import { create_container as rheaCreateContainer, EventContext, AmqpError, Container, Connection, Session } from 'rhea';
import merge = require('lodash.merge');
import * as dbg from 'debug';
import * as async from 'async';

const debug = dbg('azure-iot-amqp-base:Amqp');

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
  //
  // Top of the rhea object hierarchy.
  //
  private _rheaContainer: Container;
  //
  // Rhea object used to represent the connection.  The connection object is a child of the container object.
  // It is an event emitter.  Numerous handlers listen to manage setting up a connection and act upon error events
  // associated with the connection.
  //
  private _rheaConnection: Connection;
  //
  // Another rhea object.  It is a child of the connection.  It is an event emitter.  All rhea links will
  // be children of the session object.
  //
  private _rheaSession: Session;
  //
  // A dictionary to handle looking up THIS transport's (NOT rhea) link objects.  The key is the actual name of the link.
  // The value is the link object.
  //
  private _receivers: { [key: string]: ReceiverLink; } = {};
  //
  // A dictionary to handle looking up THIS transport's (NOT rhea) link objects.  The key is the actual name of the link.
  // The value is the link object.
  //
  private _senders: { [key: string]: SenderLink; } = {};
  //
  // We utilize this property to hold the callback that was provided when entering a state.  This callback
  // is invoked when an operation is completed.  Due to the event driven nature of rhea, multiple handlers
  // will be invoked while in a state.  We need a place to keep the callback as event progression occurs.
  //
  private _connectionCallback: (err: Error | AmqpError, result?: any) => void;
  //
  // This field is used to hold the error value that was provided to the *_error handler.  Since we want to
  // also process the *_close event which will send the error up to calling application, we needed a place
  // to keep the error between events.
  //
  private _indicatedConnectionError: Error | AmqpError;
  //
  // We utilize this property to hold the callback that was provided when entering a state.  This callback
  // is invoked when an operation is completed.  Due to the event driven nature of rhea, multiple handlers
  // will be invoked while in a state.  We need a place to keep the callback as event progression occurs.
  //
  private _sessionCallback: (err: Error | AmqpError, result?: any) => void;
  //
  // This field is used to hold the error value that was provided to the *_error handler.  Since we want to
  // also process the *_close event which will send the error up to calling application, we needed a place
  // to keep the error between events.
  //
  private _indicatedSessionError: Error | AmqpError;
  //
  // We are provided a result argument to the connecting_session state.  This will hold it while we create
  // the session.  We will then pass the result, (assuming success), up to the application via a callback.
  //
  private _sessionResult: any;
  //
  // This is provided by the calling application so that can be notified of a disconnect.
  //
  private _disconnectHandler: (err: Error) => void;
  //
  // We want to know if an actual disconnect has occurred as we run down the various links.  If the disconnect
  // has occurred we will utilize a forceDetach rather than a detach.  forceDetach doesn't cause network activity.
  //
  private _disconnectionOccurred: boolean = false;
  //
  // We want to know if an actual session close has already occurred.  We will want to send a matching session
  // close but we can't expect a reply to it.
  //
  private _sessionCloseOccurred: boolean = false;
  //
  // We want to know if an actual connection close has already occurred.  We will want to send a matching
  // connection close but we can't expect a reply to it.
  //
  private _connectionCloseOccurred: boolean = false;
  //
  // State machine object.
  //
  private _fsm: machina.Fsm;
  //
  // A class represent CBS based authentication.  It's methods are init and putToken.  Note that
  // we DON'T initiate the put tokens ourselves.  This is done but the upper device client.
  private _cbs: ClaimsBasedSecurityAgent;
  //
  // Structure containing the connection information needed such as uri, ssl (cert) etc.
  //
  private _config: AmqpBaseTransportConfig;

  /*Codes_SRS_NODE_COMMON_AMQP_16_001: [The Amqp constructor shall accept two parameters:
    A Boolean indicating whether the client should automatically settle messages:
        True if the messages should be settled automatically
        False if the caller intends to manually settle messages
        A string containing the version of the SDK used for telemetry purposes] */
  constructor(autoSettleMessages: boolean) {
    // node-amqp10 has an automatic reconnection/link re-attach feature that is enabled by default.
    // In our case we want to control the reconnection flow ourselves, so we need to disable it.

    /*Codes_SRS_NODE_COMMON_AMQP_16_042: [The Amqp constructor shall create a new `rhea.Client` instance and configure it to:
    - not reconnect on failure
    - not reattach sender and receiver links on failure]*/

    this._rheaContainer = rheaCreateContainer();

    this._rheaContainer.on('azure-iot-amqp-base:error-indicated', (err: AmqpError) => {
      debug('azure-iot-amqp-base:error-indicated invoked ' + this._getErrorName(err));
      this._fsm.handle('amqpError', err);

    });

    const rheaErrorHandler = (context: EventContext) => {
      debug('rhea error event handler');
      this._fsm.handle('error', context);
    };

    const connectionErrorHandler = (context: EventContext) => {
      debug('connection error event handler');
      this._fsm.handle('connection_error', context);
    };

    const connectionCloseHandler = (context: EventContext) => {
      debug('connection close event handler');
      this._fsm.handle('connection_close', context);
    };

    const connectionOpenHandler = (context: EventContext) => {
      debug('connection open event handler');
      this._fsm.handle('connection_open', context);
    };

    const connectionDisconnectedHandler = (context: EventContext) => {
      debug('connection disconnected event handler');
      this._fsm.handle('disconnected', context);
    };
    const manageConnectionHandlers = (operation: string) => {
      this._rheaConnection[operation]('connection_error', connectionErrorHandler);
      this._rheaConnection[operation]('connection_open', connectionOpenHandler);
      this._rheaConnection[operation]('connection_close', connectionCloseHandler);
      this._rheaConnection[operation]('disconnected', connectionDisconnectedHandler);
      this._rheaConnection[operation]('error', rheaErrorHandler);
    };

    const sessionErrorHandler = (context: EventContext) => {
      debug('session error event handler');
      this._fsm.handle('session_error', context);
    };
    const sessionOpenHandler = (context: EventContext) => {
      debug('session open event handler');
      this._fsm.handle('session_open', context);
    };
    const sessionCloseHandler = (context: EventContext) => {
      debug('session close event handler');
      this._fsm.handle('session_close', context);
    };
    const manageSessionHandlers = (operation: string) => {
      this._rheaSession[operation]('session_error', sessionErrorHandler);
      this._rheaSession[operation]('session_open', sessionOpenHandler);
      this._rheaSession[operation]('session_close', sessionCloseHandler);
    };

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
              debug('error passed to disconnect handler is: ' + this._getErrorName(err || new errors.NotConnectedError('rhea: connection disconnected')));
              this._disconnectHandler(err || new errors.NotConnectedError('rhea: connection disconnected'));
            }
          },
          amqpError: (err) => {
            debug('received an error while disconnected: maybe a bug: ' + (!!err ? err.name : 'falsy error object.'));
          },
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
            this._rheaContainer.options.sender_options = {
              properties: {
                'com.microsoft:client-version': this._config.userAgentString
              },
              reconnect: false
            };
            this._rheaContainer.options.receiver_options = {
              properties: {
                'com.microsoft:client-version': this._config.userAgentString
              },
              reconnect: false,
              autoaccept: autoSettleMessages
            };
            this._connectionCallback = connectCallback;
            this._indicatedConnectionError = undefined;
            this._disconnectionOccurred = false;
            this._sessionCloseOccurred = false;
            this._connectionCloseOccurred = false;
            //
            // According to the rhea maintainers, one can depend on that fact that no actual network activity
            // will occur until the nextTick() after the call to connect.  Because of that, one can
            // put the event handlers on the rhea connection object returned from the connect call and be assured
            // that the listeners are in place BEFORE any possible events will be emitted on the connection.
            //
            this._rheaConnection = this._rheaContainer.connect(connectionParameters);
            manageConnectionHandlers('on');
          },
          connection_open: (context: EventContext) => {
            this._rheaConnection = context.connection;
            let callback = this._connectionCallback;
            this._connectionCallback = undefined;
            this._fsm.transition('connecting_session', callback);
          },
          connection_close: (context: EventContext) => {
            let err = this._indicatedConnectionError;
            let callback = this._connectionCallback;
            this._indicatedConnectionError = undefined;
            this._connectionCallback = undefined;
            this._connectionCloseOccurred = true;
            manageConnectionHandlers('removeListener');
            this._fsm.transition('disconnected', callback, err);
          },
          connection_error: (context: EventContext) => {
            this._indicatedConnectionError = context.connection.error as AmqpError;
          },
          error: (context: EventContext) => {
            let callback = this._connectionCallback;
            this._connectionCallback = undefined;
            manageConnectionHandlers('removeListener');
            this._fsm.transition('disconnected', callback, context.connection.error);
          },
          disconnected: (context: EventContext) => {
            let callback = this._connectionCallback;
            this._connectionCallback = undefined;
            manageConnectionHandlers('removeListener');
            this._fsm.transition('disconnected', callback, new errors.NotConnectedError('rhea: connection disconnected'));
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        connecting_session: {
          _onEnter: (connectCallback, result) => {
            this._sessionCallback = connectCallback;
            this._sessionResult = result;
            //
            // According to the rhea maintainers, one can depend on that fact that no actual network activity
            // will occur until the nextTick() after the call to create_session.  Because of that, one can
            // put the event handlers on the rhea session object returned from the create_session call and be assured
            // that the listeners are in place BEFORE any possible events will be emitted on the session.
            //
            this._rheaSession = this._rheaConnection.create_session();
            manageSessionHandlers('on');
            this._rheaSession.open();
          },
          session_open: (context: EventContext) => {
            let callback = this._sessionCallback;
            let result = this._sessionResult;
            this._sessionCallback = undefined;
            this._sessionResult = undefined;
            this._fsm.transition('connected', callback, result);
          },
          session_error: (context: EventContext) => {
            this._indicatedSessionError = context.session.error;
          },
          session_close: (context: EventContext) => {
            let err = this._indicatedSessionError;
            let callback = this._sessionCallback;
            this._indicatedSessionError = undefined;
            this._sessionCallback = undefined;
            this._sessionCloseOccurred = true;
            this._fsm.transition('disconnecting', callback, err);
          },
          connection_error: (context: EventContext) => {
            this._indicatedConnectionError = context.connection.error;
          },
          connection_close: (context: EventContext) => {
            let err = this._indicatedConnectionError;
            let callback = this._sessionCallback;
            //
            // We lie about session close coming in.  Thing is that if we are here we don't actually have
            // a good session set up.  This way we won't wait around for a session end that probably won't come.
            //
            this._sessionCloseOccurred = true;
            this._indicatedConnectionError = undefined;
            this._sessionCallback = undefined;
            this._connectionCloseOccurred = true;
            this._fsm.transition('disconnecting', callback, err);
          },
          error: (context: EventContext) => {
            let callback = this._sessionCallback;
            //
            // We lie about session close coming in.  Thing is that if we are here we don't actually have
            // a good session set up.  This way we won't wait around for a session end that probably won't come.
            //
            this._sessionCloseOccurred = true;
            this._sessionCallback = undefined;
            this._fsm.transition('disconnecting', callback, context.connection.error);
          },
          disconnected: (context: EventContext) => {
            let callback = this._sessionCallback;
            this._sessionCallback = undefined;
            manageConnectionHandlers('removeListener');
            this._fsm.transition('disconnected', callback, new errors.NotConnectedError('rhea: connection disconnected'));
          },
          amqpError: (err) => {
            this._fsm.transition('disconnecting', null, err);
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        connected: {
          _onEnter: (connectCallback, result) => {
            /*Codes_SRS_NODE_COMMON_AMQP_16_002: [The `connect` method shall establish a connection with the IoT hub instance and if given as argument call the `done` callback with a null error object in the case of success and a `results.Connected` object.]*/
            this._safeCallback(connectCallback, null, new results.Connected(result));
          },
          session_error: (context: EventContext) => {
            this._indicatedSessionError = context.session.error;
          },
          session_close: (context: EventContext) => {
            let err = this._indicatedSessionError;
            this._indicatedSessionError = undefined;
            this._sessionCloseOccurred = true;
            this._fsm.transition('disconnecting', null, err);
          },
          connection_error: (context: EventContext) => {
            this._indicatedConnectionError = context.connection.error;
          },
          connection_close: (context: EventContext) => {
            let err = this._indicatedConnectionError;
            this._indicatedConnectionError = undefined;
            this._connectionCloseOccurred = true;
            this._fsm.transition('disconnecting', null, err);
          },
          error: (context: EventContext) => {
            if (context && context.connection) {
              this._fsm.transition('disconnecting', null, context.connection.error);
            } else {
              this._fsm.transition('disconnecting', null, context);
            }
          },
          disconnected: (context: EventContext) => {
            this._disconnectionOccurred = true;
            this._fsm.transition('disconnecting', null, new errors.NotConnectedError('rhea: connection disconnected'));
          },
          amqpError: (err) => {
            this._fsm.transition('disconnecting', null, err);
          },
          connect: (policyOverride, callback) => callback(null, new results.Connected()),
          disconnect: (disconnectCallback) => {
            this._fsm.transition('disconnecting', disconnectCallback);
          },
          initializeCBS: (callback) => {
            this._cbs = new ClaimsBasedSecurityAgent(this._rheaSession);
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
            this._receivers[endpoint] = new ReceiverLink(endpoint, linkOptions, this._rheaSession);
            const permanentErrorHandler = (err) => {
              delete(this._receivers[endpoint]);
            };

            const operationErrorHandler = (err) => {
              done(err);
            };

            this._receivers[endpoint].on('error', permanentErrorHandler);
            this._receivers[endpoint].on('error', operationErrorHandler);
            /*Codes_SRS_NODE_COMMON_AMQP_06_006: [The `attachReceiverLink` method shall call `attach` on the `ReceiverLink` object.] */
            this._receivers[endpoint].attach((err) => {
              if (err) {
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
            this._senders[endpoint] = new SenderLink(endpoint, linkOptions, this._rheaSession);
            const permanentErrorHandler = (err) => {
              delete(this._senders[endpoint]);
            };

            const operationErrorHandler = (err) => {
              done(err);
            };

            this._senders[endpoint].on('error', permanentErrorHandler);
            this._senders[endpoint].on('error', operationErrorHandler);
            /*Codes_SRS_NODE_COMMON_AMQP_06_005: [The `attachSenderLink` method shall call `attach` on the `SenderLink` object.] */
            this._senders[endpoint].attach((err) => {
              if (err) {
                permanentErrorHandler(err);
                operationErrorHandler(err);
              } else {
                this._senders[endpoint].removeListener('error', operationErrorHandler);
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
            debug('Entering disconnecting state with disconnectCallback: ' + disconnectCallback + ' error of: ' + this._getErrorName(err));
            const sessionEnd = (callback) => {
              //
              // If a disconnection has already happened then there is no point in trying to send a session close.
              // Just be done.
              //
              if (this._disconnectionOccurred) {
                callback();
              } else {
                //
                // A session close may have already been received from the peer.  If we are disconnecting because of a session error as an example.
                // We should send a session close from our end BUT, we should not expect to receive back another session close in response.
                //
                this._rheaSession.close();
                if (this._sessionCloseOccurred) {
                  callback();
                } else {
                  this._sessionCallback = callback; // So that the session_close handler for this disconnecting state can invoke the callback.
                }
              }
            };

            const disconnect = (callback) => {
              debug('entering disconnect function of disconnecting state');
              if (err) {
                debug('with a disconnecting state err: ' + this._getErrorName(err));
              }
              //
              // If a disconnection has already occurred there is no point in generating any network traffic.
              //
              if (this._disconnectionOccurred) {
                debug('in disconnecting state - a disconnect had already been detected.  No point in doing anything.');
                callback(err);
              } else {
                //
                // A connection close may have already been received from the peer.  If we are disconnecting because of a connection error as an example.
                // We should send a connection close from our end BUT, we should not expect to receive back another connection close in response.
                //
                debug('disconnect in disconnecting state is about send a close to the peer.');
                this._rheaConnection.close();
                if (this._connectionCloseOccurred) {
                  callback(err);
                } else {
                  this._connectionCallback = callback;
                }
              }
            };

            const detachLink = (link, callback) => {
              if (!link) {
                return callback();
              }

              if (this._sessionCloseOccurred || this._disconnectionOccurred) {
                debug('forceDetaching link');
                link.forceDetach(err);
                callback();
              } else {
                debug('cleanly detaching link');
                link.detach(callback, err);
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
                sessionEnd((sessionError) => {
                  disconnect((disconnectError) => {
                    manageConnectionHandlers('removeListener');
                    const finalError = err || sessionError || disconnectError;
                    this._fsm.transition('disconnected', disconnectCallback, finalError);
                  });
                });
              });
            });
          },
          session_close: (context: EventContext) => {
            let err = this._indicatedSessionError;
            this._indicatedSessionError = undefined;
            let callback = this._sessionCallback;
            this._sessionCallback = undefined;
            this._sessionCloseOccurred = true;
            if (callback) {
              callback(err);
            }
          },
          session_error: (context: EventContext) => {
            this._indicatedSessionError = context.session.error;
          },
          connection_error: (context: EventContext) => {
            this._indicatedConnectionError = context.connection.error;
          },
          connection_close: (context: EventContext) => {
            let err = this._indicatedConnectionError;
            let callback = this._connectionCallback;
            this._indicatedConnectionError = undefined;
            this._connectionCloseOccurred = true;
            /*Codes_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the done callback when the application/service has been successfully disconnected from the service] */
            if (callback) {
              callback(err);
            }
          },
          error: (context: EventContext) => {
            debug('ignoring error events while disconnecting');
          },
          disconnected: (context: EventContext) => {
            this._disconnectionOccurred = true;
          },
          amqpError: (err) => {
            debug('ignoring error event while disconnecting: ' + this._getErrorName(err));
          },
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
      connectionParameters.ca = config.sslOptions.ca;
    }
    connectionParameters.port = parsedUrl.port ? ( parsedUrl.port ) : (5671);
    connectionParameters.transport = 'tls';
    connectionParameters.hostname = parsedUrl.hostname;
    connectionParameters.host = parsedUrl.hostname;
    connectionParameters.reconnect = false;
    if (parsedUrl.protocol === 'wss:') {
      let webSocket = require('ws');
      let ws = this._rheaContainer.websocket_connect(webSocket);
      connectionParameters.connection_details = ws(config.uri, 'AMQPWSB10', config.sslOptions );
    }
    if (config.saslMechanism) {
      connectionParameters.sasl_mechanisms = {};
      connectionParameters.sasl_mechanisms[config.saslMechanismName] = config.saslMechanism;
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

  private _getErrorName(err: any): string {
    if (err) {
      if (err.condition) {
        return '(amqp error) ' + err.condition;
      } else if (err.hasOwnProperty('name')) {
        return '(javascript error) ' + err.name;
      } else {
        return 'unknown error type';
      }
    } else {
      return 'error is falsy';
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
