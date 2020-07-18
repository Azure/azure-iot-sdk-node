// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var machina = require("machina");
var urlParser = require("url");
var amqp_message_1 = require("./amqp_message");
var azure_iot_common_1 = require("azure-iot-common");
var amqp_cbs_1 = require("./amqp_cbs");
var sender_link_1 = require("./sender_link");
var receiver_link_1 = require("./receiver_link");
var rhea_1 = require("rhea");
var merge = require("lodash.merge");
var dbg = require("debug");
var async = require("async");
var debug = dbg('azure-iot-amqp-base:Amqp');
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
var Amqp = /** @class */ (function () {
    /*Codes_SRS_NODE_COMMON_AMQP_16_001: [The Amqp constructor shall accept two parameters:
      A Boolean indicating whether the client should automatically settle messages:
          True if the messages should be settled automatically
          False if the caller intends to manually settle messages
          A string containing the version of the SDK used for telemetry purposes] */
    function Amqp(autoSettleMessages) {
        // node-amqp10 has an automatic reconnection/link re-attach feature that is enabled by default.
        // In our case we want to control the reconnection flow ourselves, so we need to disable it.
        var _this = this;
        //
        // A dictionary to handle looking up THIS transport's (NOT rhea) link objects.  The key is the actual name of the link.
        // The value is the link object.
        //
        this._receivers = {};
        //
        // A dictionary to handle looking up THIS transport's (NOT rhea) link objects.  The key is the actual name of the link.
        // The value is the link object.
        //
        this._senders = {};
        //
        // We want to know if an actual disconnect has occurred as we run down the various links.  If the disconnect
        // has occurred we will utilize a forceDetach rather than a detach.  forceDetach doesn't cause network activity.
        //
        this._disconnectionOccurred = false;
        //
        // We want to know if an actual session close has already occurred.  We will want to send a matching session
        // close but we can't expect a reply to it.
        //
        this._sessionCloseOccurred = false;
        //
        // We want to know if an actual connection close has already occurred.  We will want to send a matching
        // connection close but we can't expect a reply to it.
        //
        this._connectionCloseOccurred = false;
        /*Codes_SRS_NODE_COMMON_AMQP_16_042: [The Amqp constructor shall create a new `rhea.Client` instance and configure it to:
        - not reconnect on failure
        - not reattach sender and receiver links on failure]*/
        this._rheaContainer = rhea_1.create_container();
        this._rheaContainer.on('azure-iot-amqp-base:error-indicated', function (err) {
            debug('azure-iot-amqp-base:error-indicated invoked ' + _this._getErrorName(err));
            _this._fsm.handle('amqpError', err);
        });
        var rheaErrorHandler = function (context) {
            debug('rhea error event handler');
            _this._fsm.handle('error', context);
        };
        var connectionErrorHandler = function (context) {
            debug('connection error event handler');
            _this._fsm.handle('connection_error', context);
        };
        var connectionCloseHandler = function (context) {
            debug('connection close event handler');
            _this._fsm.handle('connection_close', context);
        };
        var connectionOpenHandler = function (context) {
            debug('connection open event handler');
            _this._fsm.handle('connection_open', context);
        };
        var connectionDisconnectedHandler = function (context) {
            debug('connection disconnected event handler');
            _this._fsm.handle('disconnected', context);
        };
        var manageConnectionHandlers = function (operation) {
            _this._rheaConnection[operation]('connection_error', connectionErrorHandler);
            _this._rheaConnection[operation]('connection_open', connectionOpenHandler);
            _this._rheaConnection[operation]('connection_close', connectionCloseHandler);
            _this._rheaConnection[operation]('disconnected', connectionDisconnectedHandler);
            _this._rheaConnection[operation]('error', rheaErrorHandler);
        };
        var sessionErrorHandler = function (context) {
            debug('session error event handler');
            _this._fsm.handle('session_error', context);
        };
        var sessionOpenHandler = function (context) {
            debug('session open event handler');
            _this._fsm.handle('session_open', context);
        };
        var sessionCloseHandler = function (context) {
            debug('session close event handler');
            _this._fsm.handle('session_close', context);
        };
        var manageSessionHandlers = function (operation) {
            _this._rheaSession[operation]('session_error', sessionErrorHandler);
            _this._rheaSession[operation]('session_open', sessionOpenHandler);
            _this._rheaSession[operation]('session_close', sessionCloseHandler);
        };
        this._fsm = new machina.Fsm({
            namespace: 'amqp-base',
            initialState: 'disconnected',
            states: {
                disconnected: {
                    _onEnter: function (disconnectCallback, err, result) {
                        if (disconnectCallback) {
                            if (err) {
                                _this._safeCallback(disconnectCallback, err);
                            }
                            else {
                                _this._safeCallback(disconnectCallback, null, new azure_iot_common_1.results.Disconnected());
                            }
                        }
                        else if (_this._disconnectHandler) {
                            debug('calling upper layer disconnect handler');
                            debug('error passed to disconnect handler is: ' + _this._getErrorName(err || new azure_iot_common_1.errors.NotConnectedError('rhea: connection disconnected')));
                            _this._disconnectHandler(err || new azure_iot_common_1.errors.NotConnectedError('rhea: connection disconnected'));
                        }
                    },
                    amqpError: function (err) {
                        debug('received an error while disconnected: maybe a bug: ' + (!!err ? err.name : 'falsy error object.'));
                    },
                    connect: function (connectionParameters, connectCallback) {
                        _this._fsm.transition('connecting', connectionParameters, connectCallback);
                    },
                    disconnect: function (callback) { return callback(null, new azure_iot_common_1.results.Disconnected()); },
                    attachSenderLink: function (endpoint, linkOptions, callback) { return callback(new azure_iot_common_1.errors.NotConnectedError()); },
                    attachReceiverLink: function (endpoint, linkOptions, callback) { return callback(new azure_iot_common_1.errors.NotConnectedError()); },
                    detachSenderLink: function (endpoint, callback) { return _this._safeCallback(callback); },
                    detachReceiverLink: function (endpoint, callback) { return _this._safeCallback(callback); },
                    initializeCBS: function (callback) { return callback(new azure_iot_common_1.errors.NotConnectedError()); },
                    putToken: function (audience, token, callback) { return callback(new azure_iot_common_1.errors.NotConnectedError()); },
                },
                connecting: {
                    _onEnter: function (connectionParameters, connectCallback) {
                        _this._rheaContainer.options.sender_options = {
                            properties: {
                                'com.microsoft:client-version': _this._config.userAgentString
                            },
                            reconnect: false
                        };
                        _this._rheaContainer.options.receiver_options = {
                            properties: {
                                'com.microsoft:client-version': _this._config.userAgentString
                            },
                            reconnect: false,
                            autoaccept: autoSettleMessages
                        };
                        _this._connectionCallback = connectCallback;
                        _this._indicatedConnectionError = undefined;
                        _this._disconnectionOccurred = false;
                        _this._sessionCloseOccurred = false;
                        _this._connectionCloseOccurred = false;
                        //
                        // According to the rhea maintainers, one can depend on that fact that no actual network activity
                        // will occur until the nextTick() after the call to connect.  Because of that, one can
                        // put the event handlers on the rhea connection object returned from the connect call and be assured
                        // that the listeners are in place BEFORE any possible events will be emitted on the connection.
                        //
                        _this._rheaConnection = _this._rheaContainer.connect(connectionParameters);
                        manageConnectionHandlers('on');
                    },
                    connection_open: function (context) {
                        _this._rheaConnection = context.connection;
                        var callback = _this._connectionCallback;
                        _this._connectionCallback = undefined;
                        _this._fsm.transition('connecting_session', callback);
                    },
                    connection_close: function (context) {
                        var err = _this._indicatedConnectionError;
                        var callback = _this._connectionCallback;
                        _this._indicatedConnectionError = undefined;
                        _this._connectionCallback = undefined;
                        _this._connectionCloseOccurred = true;
                        manageConnectionHandlers('removeListener');
                        _this._fsm.transition('disconnected', callback, err);
                    },
                    connection_error: function (context) {
                        _this._indicatedConnectionError = context.connection.error;
                    },
                    error: function (context) {
                        var callback = _this._connectionCallback;
                        _this._connectionCallback = undefined;
                        manageConnectionHandlers('removeListener');
                        _this._fsm.transition('disconnected', callback, context.connection.error);
                    },
                    disconnected: function (context) {
                        var callback = _this._connectionCallback;
                        _this._connectionCallback = undefined;
                        manageConnectionHandlers('removeListener');
                        _this._fsm.transition('disconnected', callback, new azure_iot_common_1.errors.NotConnectedError('rhea: connection disconnected'));
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                connecting_session: {
                    _onEnter: function (connectCallback, result) {
                        _this._sessionCallback = connectCallback;
                        _this._sessionResult = result;
                        //
                        // According to the rhea maintainers, one can depend on that fact that no actual network activity
                        // will occur until the nextTick() after the call to create_session.  Because of that, one can
                        // put the event handlers on the rhea session object returned from the create_session call and be assured
                        // that the listeners are in place BEFORE any possible events will be emitted on the session.
                        //
                        _this._rheaSession = _this._rheaConnection.create_session();
                        manageSessionHandlers('on');
                        _this._rheaSession.open();
                    },
                    session_open: function (context) {
                        var callback = _this._sessionCallback;
                        var result = _this._sessionResult;
                        _this._sessionCallback = undefined;
                        _this._sessionResult = undefined;
                        _this._fsm.transition('connected', callback, result);
                    },
                    session_error: function (context) {
                        _this._indicatedSessionError = context.session.error;
                    },
                    session_close: function (context) {
                        var err = _this._indicatedSessionError;
                        var callback = _this._sessionCallback;
                        _this._indicatedSessionError = undefined;
                        _this._sessionCallback = undefined;
                        _this._sessionCloseOccurred = true;
                        _this._fsm.transition('disconnecting', callback, err);
                    },
                    connection_error: function (context) {
                        _this._indicatedConnectionError = context.connection.error;
                    },
                    connection_close: function (context) {
                        var err = _this._indicatedConnectionError;
                        var callback = _this._sessionCallback;
                        //
                        // We lie about session close coming in.  Thing is that if we are here we don't actually have
                        // a good session set up.  This way we won't wait around for a session end that probably won't come.
                        //
                        _this._sessionCloseOccurred = true;
                        _this._indicatedConnectionError = undefined;
                        _this._sessionCallback = undefined;
                        _this._connectionCloseOccurred = true;
                        _this._fsm.transition('disconnecting', callback, err);
                    },
                    error: function (context) {
                        var callback = _this._sessionCallback;
                        //
                        // We lie about session close coming in.  Thing is that if we are here we don't actually have
                        // a good session set up.  This way we won't wait around for a session end that probably won't come.
                        //
                        _this._sessionCloseOccurred = true;
                        _this._sessionCallback = undefined;
                        _this._fsm.transition('disconnecting', callback, context.connection.error);
                    },
                    disconnected: function (context) {
                        var callback = _this._sessionCallback;
                        _this._sessionCallback = undefined;
                        manageConnectionHandlers('removeListener');
                        _this._fsm.transition('disconnected', callback, new azure_iot_common_1.errors.NotConnectedError('rhea: connection disconnected'));
                    },
                    amqpError: function (err) {
                        _this._fsm.transition('disconnecting', null, err);
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                connected: {
                    _onEnter: function (connectCallback, result) {
                        /*Codes_SRS_NODE_COMMON_AMQP_16_002: [The `connect` method shall establish a connection with the IoT hub instance and if given as argument call the `done` callback with a null error object in the case of success and a `results.Connected` object.]*/
                        _this._safeCallback(connectCallback, null, new azure_iot_common_1.results.Connected(result));
                    },
                    session_error: function (context) {
                        _this._indicatedSessionError = context.session.error;
                    },
                    session_close: function (context) {
                        var err = _this._indicatedSessionError;
                        _this._indicatedSessionError = undefined;
                        _this._sessionCloseOccurred = true;
                        _this._fsm.transition('disconnecting', null, err);
                    },
                    connection_error: function (context) {
                        _this._indicatedConnectionError = context.connection.error;
                    },
                    connection_close: function (context) {
                        var err = _this._indicatedConnectionError;
                        _this._indicatedConnectionError = undefined;
                        _this._connectionCloseOccurred = true;
                        _this._fsm.transition('disconnecting', null, err);
                    },
                    error: function (context) {
                        if (context && context.connection) {
                            _this._fsm.transition('disconnecting', null, context.connection.error);
                        }
                        else {
                            _this._fsm.transition('disconnecting', null, context);
                        }
                    },
                    disconnected: function (context) {
                        _this._disconnectionOccurred = true;
                        _this._fsm.transition('disconnecting', null, new azure_iot_common_1.errors.NotConnectedError('rhea: connection disconnected'));
                    },
                    amqpError: function (err) {
                        _this._fsm.transition('disconnecting', null, err);
                    },
                    connect: function (policyOverride, callback) { return callback(null, new azure_iot_common_1.results.Connected()); },
                    disconnect: function (disconnectCallback) {
                        _this._fsm.transition('disconnecting', disconnectCallback);
                    },
                    initializeCBS: function (callback) {
                        _this._cbs = new amqp_cbs_1.ClaimsBasedSecurityAgent(_this._rheaSession);
                        _this._cbs.attach(callback);
                    },
                    putToken: function (audience, token, callback) {
                        if (!_this._cbs) {
                            _this._fsm.handle('initializeCBS', function (err) {
                                if (err) {
                                    callback(err);
                                }
                                else {
                                    _this._fsm.handle('putToken', audience, token, callback);
                                }
                            });
                        }
                        else {
                            _this._cbs.putToken(audience, token, callback);
                        }
                    },
                    send: function (message, endpoint, to, done) {
                        /*Codes_SRS_NODE_COMMON_AMQP_16_006: [The `send` method shall construct an AMQP message using information supplied by the caller, as follows:
                        The ‘to’ field of the message should be set to the ‘to’ argument.
                        The ‘body’ of the message should be built using the message argument.] */
                        debug('call to deprecated api \'azure-iot-amqp-base.Amqp.send\'. You should be using SenderLink.send instead');
                        var amqpMessage = amqp_message_1.AmqpMessage.fromMessage(message);
                        if (to !== undefined) {
                            amqpMessage.to = to;
                        }
                        if (!_this._senders[endpoint]) {
                            _this._fsm.handle('attachSenderLink', endpoint, null, function (err) {
                                if (err) {
                                    debug('failed to attach the sender link: ' + err.toString());
                                    done(err);
                                }
                                else {
                                    _this._senders[endpoint].send(amqpMessage, done);
                                }
                            });
                        }
                        else {
                            _this._senders[endpoint].send(amqpMessage, done);
                        }
                    },
                    getReceiver: function (endpoint, done) {
                        /*Codes_SRS_NODE_COMMON_AMQP_16_010: [If a receiver for this endpoint doesn’t exist, the getReceiver method should create a new AmqpReceiver object and then call the done() method with the object that was just created as an argument.] */
                        if (!_this._receivers[endpoint]) {
                            _this._fsm.handle('attachReceiverLink', endpoint, null, function (err) {
                                if (err) {
                                    done(err);
                                }
                                else {
                                    done(null, _this._receivers[endpoint]);
                                }
                            });
                        }
                        else {
                            /*Codes_SRS_NODE_COMMON_AMQP_16_009: [If a receiver for this endpoint has already been created, the getReceiver method should call the done() method with the existing instance as an argument.] */
                            done(null, _this._receivers[endpoint]);
                        }
                    },
                    attachReceiverLink: function (endpoint, linkOptions, done) {
                        debug('creating receiver link for: ' + endpoint);
                        _this._receivers[endpoint] = new receiver_link_1.ReceiverLink(endpoint, linkOptions, _this._rheaSession);
                        var permanentErrorHandler = function (err) {
                            delete (_this._receivers[endpoint]);
                        };
                        var operationErrorHandler = function (err) {
                            done(err);
                        };
                        _this._receivers[endpoint].on('error', permanentErrorHandler);
                        _this._receivers[endpoint].on('error', operationErrorHandler);
                        /*Codes_SRS_NODE_COMMON_AMQP_06_006: [The `attachReceiverLink` method shall call `attach` on the `ReceiverLink` object.] */
                        _this._receivers[endpoint].attach(function (err) {
                            if (err) {
                                permanentErrorHandler(err);
                                operationErrorHandler(err);
                            }
                            else {
                                _this._receivers[endpoint].removeListener('error', operationErrorHandler);
                                debug('receiver link attached: ' + endpoint);
                                done(null, _this._receivers[endpoint]);
                            }
                        });
                    },
                    attachSenderLink: function (endpoint, linkOptions, done) {
                        debug('creating sender link for: ' + endpoint);
                        _this._senders[endpoint] = new sender_link_1.SenderLink(endpoint, linkOptions, _this._rheaSession);
                        var permanentErrorHandler = function (err) {
                            delete (_this._senders[endpoint]);
                        };
                        var operationErrorHandler = function (err) {
                            done(err);
                        };
                        _this._senders[endpoint].on('error', permanentErrorHandler);
                        _this._senders[endpoint].on('error', operationErrorHandler);
                        /*Codes_SRS_NODE_COMMON_AMQP_06_005: [The `attachSenderLink` method shall call `attach` on the `SenderLink` object.] */
                        _this._senders[endpoint].attach(function (err) {
                            if (err) {
                                permanentErrorHandler(err);
                                operationErrorHandler(err);
                            }
                            else {
                                _this._senders[endpoint].removeListener('error', operationErrorHandler);
                                done(null, _this._senders[endpoint]);
                            }
                        });
                    },
                    detachReceiverLink: function (endpoint, detachCallback) {
                        if (!_this._receivers[endpoint]) {
                            _this._safeCallback(detachCallback);
                        }
                        else {
                            _this._detachLink(_this._receivers[endpoint], function (err) {
                                delete (_this._receivers[endpoint]);
                                _this._safeCallback(detachCallback, err);
                            });
                        }
                    },
                    detachSenderLink: function (endpoint, detachCallback) {
                        _this._detachLink(_this._senders[endpoint], function (err) {
                            delete (_this._senders[endpoint]);
                            _this._safeCallback(detachCallback, err);
                        });
                    }
                },
                disconnecting: {
                    _onEnter: function (disconnectCallback, err) {
                        debug('Entering disconnecting state with disconnectCallback: ' + disconnectCallback + ' error of: ' + _this._getErrorName(err));
                        var sessionEnd = function (callback) {
                            //
                            // If a disconnection has already happened then there is no point in trying to send a session close.
                            // Just be done.
                            //
                            if (_this._disconnectionOccurred) {
                                callback();
                            }
                            else {
                                //
                                // A session close may have already been received from the peer.  If we are disconnecting because of a session error as an example.
                                // We should send a session close from our end BUT, we should not expect to receive back another session close in response.
                                //
                                _this._rheaSession.close();
                                if (_this._sessionCloseOccurred) {
                                    callback();
                                }
                                else {
                                    _this._sessionCallback = callback; // So that the session_close handler for this disconnecting state can invoke the callback.
                                }
                            }
                        };
                        var disconnect = function (callback) {
                            debug('entering disconnect function of disconnecting state');
                            if (err) {
                                debug('with a disconnecting state err: ' + _this._getErrorName(err));
                            }
                            //
                            // If a disconnection has already occurred there is no point in generating any network traffic.
                            //
                            if (_this._disconnectionOccurred) {
                                debug('in disconnecting state - a disconnect had already been detected.  No point in doing anything.');
                                callback(err);
                            }
                            else {
                                //
                                // A connection close may have already been received from the peer.  If we are disconnecting because of a connection error as an example.
                                // We should send a connection close from our end BUT, we should not expect to receive back another connection close in response.
                                //
                                debug('disconnect in disconnecting state is about send a close to the peer.');
                                _this._rheaConnection.close();
                                if (_this._connectionCloseOccurred) {
                                    callback(err);
                                }
                                else {
                                    _this._connectionCallback = callback;
                                }
                            }
                        };
                        var detachLink = function (link, callback) {
                            if (!link) {
                                return callback();
                            }
                            if (_this._sessionCloseOccurred || _this._disconnectionOccurred) {
                                debug('forceDetaching link');
                                link.forceDetach(err);
                                callback();
                            }
                            else {
                                debug('cleanly detaching link');
                                link.detach(callback, err);
                            }
                        };
                        var remainingLinks = [];
                        for (var senderEndpoint in _this._senders) {
                            if (_this._senders.hasOwnProperty(senderEndpoint)) {
                                remainingLinks.push(_this._senders[senderEndpoint]);
                                delete _this._senders[senderEndpoint];
                            }
                        }
                        for (var receiverEndpoint in _this._receivers) {
                            if (_this._receivers.hasOwnProperty(receiverEndpoint)) {
                                remainingLinks.push(_this._receivers[receiverEndpoint]);
                                delete _this._receivers[receiverEndpoint];
                            }
                        }
                        //
                        // Depending on the mode of failure it is possible that no network activity is occurring.
                        // However, the SDK *might* not have noticed that yet.
                        //
                        // If this happens then rundown code will simply stall waiting for a response which will never
                        // occur.
                        //
                        // To deal with this, we encapsulate the rundown code in a function and we invoke it.
                        //
                        // First, however, we will spin off a timer to execute the very same rundown code in 45 seconds, but that
                        // function invocation will use API that do NOT expect a reply.
                        //
                        // If the initial function invocation actually doesn't stall due to lack of communication, it's
                        // last action will be to clear the timeout and consequently the timeout invocation call to the
                        // rundown code will NOT occur.
                        //
                        var rerunWithForceTimer = undefined;
                        var rundownConnection = function (force) {
                            //
                            // Note that _disconnectionOccurred could already be true on the first run (the NON setTimer invocation).
                            // Thus, we don't simply want to set it to the value of force.
                            //
                            if (force) {
                                _this._disconnectionOccurred = true;
                            }
                            detachLink(_this._cbs, function () {
                                /*Codes_SRS_NODE_COMMON_AMQP_16_034: [The `disconnect` method shall detach all open links before disconnecting the underlying AMQP client.]*/
                                async.each(remainingLinks, detachLink, function () {
                                    sessionEnd(function (sessionError) {
                                        disconnect(function (disconnectError) {
                                            clearTimeout(rerunWithForceTimer);
                                            manageConnectionHandlers('removeListener');
                                            var finalError = err || sessionError || disconnectError;
                                            _this._fsm.transition('disconnected', disconnectCallback, finalError);
                                        });
                                    });
                                });
                            });
                        };
                        /*Codes_SRS_NODE_COMMON_AMQP_06_007: [While disconnecting, if the run down does not complete within 45 seconds, the code will be re-run with `forceDetach`es.]*/
                        rerunWithForceTimer = setTimeout(function () {
                            debug('the normal rundown expired without completion.  Do it again with force detaches.');
                            rundownConnection(true);
                        }, 45000);
                        rundownConnection(false);
                    },
                    session_close: function (context) {
                        var err = _this._indicatedSessionError;
                        _this._indicatedSessionError = undefined;
                        var callback = _this._sessionCallback;
                        _this._sessionCallback = undefined;
                        _this._sessionCloseOccurred = true;
                        if (callback) {
                            callback(err);
                        }
                    },
                    session_error: function (context) {
                        _this._indicatedSessionError = context.session.error;
                    },
                    connection_error: function (context) {
                        _this._indicatedConnectionError = context.connection.error;
                    },
                    connection_close: function (context) {
                        var err = _this._indicatedConnectionError;
                        var callback = _this._connectionCallback;
                        _this._indicatedConnectionError = undefined;
                        _this._connectionCloseOccurred = true;
                        /*Codes_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the done callback when the application/service has been successfully disconnected from the service] */
                        if (callback) {
                            callback(err);
                        }
                    },
                    error: function (context) {
                        debug('ignoring error events while disconnecting');
                    },
                    disconnected: function (context) {
                        _this._disconnectionOccurred = true;
                    },
                    amqpError: function (err) {
                        debug('ignoring error event while disconnecting: ' + _this._getErrorName(err));
                    },
                    '*': function () { return _this._fsm.deferUntilTransition('disconnected'); }
                }
            }
        });
        this._fsm.on('transition', function (transition) {
            debug(transition.fromState + ' -> ' + transition.toState + ' (action:' + transition.action + ')');
        });
    }
    /**
     * @method             module:azure-iot-amqp-base.Amqp#connect
     * @description        Establishes a connection with the IoT Hub instance.
     * @param {AmqpBaseTransportConfig}     config        Configuration object
     * @param {Function}                    done          Callback called when the connection is established or if an error happened.
     */
    Amqp.prototype.connect = function (config, done) {
        var parsedUrl = urlParser.parse(config.uri);
        var connectionParameters = {};
        if (config.sslOptions) {
            connectionParameters.cert = config.sslOptions.cert;
            connectionParameters.key = config.sslOptions.key;
            connectionParameters.ca = config.sslOptions.ca;
        }
        connectionParameters.port = parsedUrl.port ? (parsedUrl.port) : (5671);
        connectionParameters.transport = 'tls';
        connectionParameters.hostname = parsedUrl.hostname;
        connectionParameters.host = parsedUrl.hostname;
        connectionParameters.reconnect = false;
        if (parsedUrl.protocol === 'wss:') {
            var webSocket = require('ws');
            var ws = this._rheaContainer.websocket_connect(webSocket);
            connectionParameters.connection_details = ws(config.uri, 'AMQPWSB10', config.sslOptions);
        }
        if (config.saslMechanism) {
            connectionParameters.sasl_mechanisms = {};
            connectionParameters.sasl_mechanisms[config.saslMechanismName] = config.saslMechanism;
        }
        connectionParameters = merge(connectionParameters, config.policyOverride);
        this._config = config;
        this._fsm.handle('connect', connectionParameters, done);
    };
    /**
     * @method             module:azure-iot-amqp-base.Amqp#setDisconnectCallback
     * @description        Sets the callback that should be called in case of disconnection.
     * @param {Function}   disconnectCallback   Called when the connection disconnected.
     */
    Amqp.prototype.setDisconnectHandler = function (disconnectCallback) {
        this._disconnectHandler = disconnectCallback;
    };
    /**
     * @method             module:azure-iot-amqp-base.Amqp#disconnect
     * @description        Disconnects the link to the IoT Hub instance.
     * @param {Function}   done   Called when disconnected of if an error happened.
     */
    Amqp.prototype.disconnect = function (done) {
        this._fsm.handle('disconnect', done);
    };
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
    Amqp.prototype.send = function (message, endpoint, to, done) {
        this._fsm.handle('send', message, endpoint, to, done);
    };
    /**
     * @deprecated         use attachReceiverLink() instead.
     * @method             module:azure-iot-amqp-base.Amqp#getReceiver
     * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
     *
     * @param {string}    endpoint  Endpoint used for the receiving link.
     * @param {Function}  done      Callback used to return the {@linkcode AmqpReceiver} object.
     */
    Amqp.prototype.getReceiver = function (endpoint, done) {
        this._fsm.handle('getReceiver', endpoint, done);
    };
    /**
     * @method             module:azure-iot-amqp-base.Amqp#attachReceiverLink
     * @description        Creates and attaches an AMQP receiver link for the specified endpoint.
     *
     * @param {string}    endpoint    Endpoint used for the receiver link.
     * @param {Object}    linkOptions Configuration options to be merged with the rhea policies for the link..
     * @param {Function}  done        Callback used to return the link object or an Error.
     */
    Amqp.prototype.attachReceiverLink = function (endpoint, linkOptions, done) {
        /*Codes_SRS_NODE_COMMON_AMQP_16_017: [The `attachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        if (!endpoint) {
            throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
        }
        this._fsm.handle('attachReceiverLink', endpoint, linkOptions, done);
    };
    /**
     * @method             module:azure-iot-amqp-base.Amqp#attachSenderLink
     * @description        Creates and attaches an AMQP sender link for the specified endpoint.
     *
     * @param {string}    endpoint    Endpoint used for the sender link.
     * @param {Object}    linkOptions Configuration options to be merged with the rhea policies for the link..
     * @param {Function}  done        Callback used to return the link object or an Error.
     */
    Amqp.prototype.attachSenderLink = function (endpoint, linkOptions, done) {
        /*Codes_SRS_NODE_COMMON_AMQP_16_012: [The `attachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        if (!endpoint) {
            throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
        }
        this._fsm.handle('attachSenderLink', endpoint, linkOptions, done);
    };
    /**
     * @method             module:azure-iot-amqp-base.Amqp#detachReceiverLink
     * @description        Detaches an AMQP receiver link for the specified endpoint if it exists.
     *
     * @param {string}    endpoint  Endpoint used to identify which link should be detached.
     * @param {Function}  done      Callback used to signal success or failure of the detach operation.
     */
    Amqp.prototype.detachReceiverLink = function (endpoint, detachCallback) {
        /*Codes_SRS_NODE_COMMON_AMQP_16_027: [The `detachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        if (!endpoint) {
            throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
        }
        this._fsm.handle('detachReceiverLink', endpoint, detachCallback);
    };
    /**
     * @method             module:azure-iot-amqp-base.Amqp#detachSenderLink
     * @description        Detaches an AMQP sender link for the specified endpoint if it exists.
     *
     * @param {string}    endpoint  Endpoint used to identify which link should be detached.
     * @param {Function}  done      Callback used to signal success or failure of the detach operation.
     */
    Amqp.prototype.detachSenderLink = function (endpoint, detachCallback) {
        /*Codes_SRS_NODE_COMMON_AMQP_16_022: [The `detachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        if (!endpoint) {
            throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
        }
        this._fsm.handle('detachSenderLink', endpoint, detachCallback);
    };
    Amqp.prototype.initializeCBS = function (callback) {
        this._fsm.handle('initializeCBS', callback);
    };
    Amqp.prototype.putToken = function (audience, token, callback) {
        this._fsm.handle('putToken', audience, token, callback);
    };
    Amqp.prototype._detachLink = function (link, detachCallback) {
        var _this = this;
        if (!link) {
            /*Codes_SRS_NODE_COMMON_AMQP_16_030: [The `detachReceiverLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
            /*Codes_SRS_NODE_COMMON_AMQP_16_025: [The `detachSenderLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
            this._safeCallback(detachCallback);
        }
        else {
            /*Codes_SRS_NODE_COMMON_AMQP_16_028: [The `detachReceiverLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
            /*Codes_SRS_NODE_COMMON_AMQP_16_023: [The `detachSenderLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
            link.detach(function () {
                /*Codes_SRS_NODE_COMMON_AMQP_16_029: [The `detachReceiverLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
                /*Codes_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
                _this._safeCallback(detachCallback);
            });
        }
    };
    /*Codes_SRS_NODE_COMMON_AMQP_16_011: [All methods should treat the `done` callback argument as optional and not throw if it is not passed as argument.]*/
    Amqp.prototype._safeCallback = function (callback, error, result) {
        if (callback) {
            process.nextTick(function () { return callback(error, result); });
        }
    };
    Amqp.prototype._getErrorName = function (err) {
        if (err) {
            if (err.condition) {
                return '(amqp error) ' + err.condition;
            }
            else if (err.hasOwnProperty('name')) {
                return '(javascript error) ' + err.name;
            }
            else {
                return 'unknown error type';
            }
        }
        else {
            return 'error is falsy';
        }
    };
    return Amqp;
}());
exports.Amqp = Amqp;
//# sourceMappingURL=amqp.js.map