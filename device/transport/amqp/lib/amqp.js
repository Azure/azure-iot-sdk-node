// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var machina = require("machina");
var async = require("async");
var dbg = require("debug");
var debug = dbg('azure-iot-device-amqp:Amqp');
var events_1 = require("events");
var azure_iot_device_1 = require("azure-iot-device");
var azure_iot_amqp_base_1 = require("azure-iot-amqp-base");
var azure_iot_common_1 = require("azure-iot-common");
var amqp_device_method_client_1 = require("./amqp_device_method_client");
var amqp_twin_client_1 = require("./amqp_twin_client");
var handleResult = function (errorMessage, done) {
    return function (err, result) {
        if (err) {
            done(azure_iot_amqp_base_1.translateError(errorMessage, err));
        }
        else {
            done(null, result);
        }
    };
};
var getTranslatedError = function (err, message) {
    if (err instanceof azure_iot_common_1.errors.UnauthorizedError || err instanceof azure_iot_common_1.errors.NotConnectedError || err instanceof azure_iot_common_1.errors.DeviceNotFoundError) {
        return err;
    }
    return azure_iot_amqp_base_1.translateError(message, err);
};
/**
 * Provides the transport layer over AMQP for the {@link azure-iot-device.Client} object.
 *
 * This class is not meant to be used directly, instead passed to the {@link azure-iot-device.Client} class to be used as
 * a transport.
 */
/*Codes_SRS_NODE_DEVICE_AMQP_16_001: [The Amqp constructor shall accept a config object with four properties:
host – (string) the fully-qualified DNS hostname of an IoT Hub
deviceId – (string) the identifier of a device registered with the IoT Hub
sharedAccessSignature – (string) the shared access signature associated with the device registration.] */
/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_001: [The `Amqp` constructor shall implement the `Receiver` interface.]*/
/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_002: [The `Amqp` object shall inherit from the `EventEmitter` node object.]*/
var Amqp = /** @class */ (function (_super) {
    __extends(Amqp, _super);
    /**
     * @private
     */
    function Amqp(authenticationProvider, baseClient) {
        var _this = _super.call(this) || this;
        _this._authenticationProvider = authenticationProvider;
        /*Codes_SRS_NODE_DEVICE_AMQP_16_056: [If the `authenticationProvider` object passed to the `Amqp` constructor has a `type` property which value is set to `AuthenticationType.Token` the `Amqp` constructor shall subscribe to the `newTokenAvailable` event of the `authenticationProvider` object.]*/
        if (_this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.Token) {
            _this._authenticationProvider.on('newTokenAvailable', function (newCredentials) {
                /*Codes_SRS_NODE_DEVICE_AMQP_16_057: [If a `newTokenAvailable` event is emitted by the `authenticationProvider` object passed as an argument to the constructor, a `putToken` operation shall be initiated with the new shared access signature if the amqp connection is already connected.]*/
                _this._fsm.handle('updateSharedAccessSignature', newCredentials.sharedAccessSignature, function (err) {
                    if (err) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_058: [If the `putToken` operation initiated upon receiving a `newTokenAvailable` event fails, a `disconnect` event shall be emitted with the error from the failed `putToken` operation.]*/
                        debug('Error updating the shared access signature');
                        _this._fsm.handle('disconnect', function () {
                            debug('emitting the disconnect event in response to a update signature failure');
                            _this.emit('disconnect', err);
                        });
                    }
                });
            });
        }
        _this._amqp = baseClient || new azure_iot_amqp_base_1.Amqp(false);
        _this._amqp.setDisconnectHandler(function (err) {
            debug('disconnected event handler: ' + (err ? err.toString() : 'no error'));
            _this._fsm.handle('amqpConnectionClosed', err, function () {
                _this.emit('disconnect', getTranslatedError(err, 'AMQP client disconnected'));
            });
        });
        _this._deviceMethodClient = new amqp_device_method_client_1.AmqpDeviceMethodClient(_this._authenticationProvider, _this._amqp);
        /*Codes_SRS_NODE_DEVICE_AMQP_16_041: [Any `error` event received on any of the links used for device methods shall trigger the emission of an `error` event by the transport, with an argument that is a `MethodsDetachedError` object with the `innerError` property set to that error.]*/
        _this._deviceMethodClient.on('error', function (err) {
            var methodsError = new azure_iot_common_1.errors.DeviceMethodsDetachedError('Device Methods AMQP links failed');
            methodsError.innerError = err;
            _this.emit('error', methodsError);
        });
        _this._twinClient = new amqp_twin_client_1.AmqpTwinClient(_this._authenticationProvider, _this._amqp);
        /*Codes_SRS_NODE_DEVICE_AMQP_16_048: [Any `error` event received on any of the links used for twin shall trigger the emission of an `error` event by the transport, with an argument that is a `TwinDetachedError` object with the `innerError` property set to that error.]*/
        _this._twinClient.on('error', function (err) {
            var twinError = new azure_iot_common_1.errors.TwinDetachedError('Twin AMQP links failed');
            twinError.innerError = err;
            _this.emit('error', twinError);
        });
        _this._twinClient.on('twinDesiredPropertiesUpdate', function (patch) { return _this.emit('twinDesiredPropertiesUpdate', patch); });
        /*Codes_SRS_NODE_DEVICE_AMQP_16_034: [Any `error` event received on the C2D link shall trigger the emission of an `error` event by the transport, with an argument that is a `C2DDetachedError` object with the `innerError` property set to that error.]*/
        _this._c2dErrorListener = function (err) {
            debug('Error on the C2D link: ' + err.toString());
            var c2dError = new azure_iot_common_1.errors.CloudToDeviceDetachedError('Cloud-to-device AMQP link failed');
            c2dError.innerError = err;
            _this.emit('error', c2dError);
        };
        _this._c2dMessageListener = function (msg) {
            var inputName;
            if (msg.message_annotations) {
                inputName = msg.message_annotations['x-opt-input-name'];
            }
            if (_this._messageEventName === 'inputMessage') {
                /*Codes_SRS_NODE_DEVICE_AMQP_18_014: [If `amqp` receives a message on the input message link, it shall emit an "inputMessage" event with the value of the annotation property "x-opt-input-name" as the first parameter and the agnostic message as the second parameter.]*/
                _this.emit('inputMessage', inputName, azure_iot_amqp_base_1.AmqpMessage.toMessage(msg));
            }
            else {
                /*Codes_SRS_NODE_DEVICE_AMQP_18_013: [If `amqp` receives a message on the C2D link, it shall emit a "message" event with the message as the event parameter.]*/
                _this.emit('message', azure_iot_amqp_base_1.AmqpMessage.toMessage(msg));
            }
        };
        _this._d2cErrorListener = function (err) {
            debug('Error on the D2C link: ' + err.toString());
            _this._d2cLink = null;
            // we don't really care because we can reattach the link every time we send and surface the error at that time.
        };
        _this._fsm = new machina.Fsm({
            initialState: 'disconnected',
            states: {
                disconnected: {
                    _onEnter: function (err, callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_083: [When the `amqp` client is disconnected and if token-based authentication is used the `stop` method of the `AuthenticationProvider` shall be called.]*/
                        if (_this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.Token) {
                            _this._authenticationProvider.stop();
                        }
                        if (callback) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                callback(null, new azure_iot_common_1.results.Disconnected());
                            }
                        }
                        else if (err) {
                            _this.emit('error', err);
                        }
                    },
                    connect: function (connectCallback) { return _this._fsm.transition('connecting', connectCallback); },
                    disconnect: function (disconnectCallback) {
                        if (disconnectCallback) {
                            disconnectCallback(null, new azure_iot_common_1.results.Disconnected());
                        }
                    },
                    sendEvent: function (amqpMessage, sendCallback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_024: [The `sendEvent` method shall connect and authenticate the transport if necessary.]*/
                        /*Codes_SRS_NODE_DEVICE_AMQP_18_005: [The `sendOutputEvent` method shall connect and authenticate the transport if necessary.]*/
                        _this._fsm.handle('connect', function (err, result) {
                            if (err) {
                                sendCallback(err);
                            }
                            else {
                                _this._fsm.handle('sendEvent', amqpMessage, sendCallback);
                            }
                        });
                    },
                    updateSharedAccessSignature: function (token, callback) {
                        // nothing to do here: the SAS has been updated in the config object.
                        callback(null, new azure_iot_common_1.results.SharedAccessSignatureUpdated(false));
                    },
                    getTwin: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_059: [The `getTwin` method shall connect and authenticate the transport if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err, result) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_060: [The `getTwin` method shall call its callback with an error if connecting fails.]*/
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_061: [The `getTwin` method shall call its callback with an error if authenticating fails.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('getTwin', callback);
                            }
                        });
                    },
                    updateTwinReportedProperties: function (patch, callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_065: [The `updateTwinReportedProperties` method shall connect and authenticate the transport if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err, result) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_066: [The `updateTwinReportedProperties` method shall call its callback with an error if connecting fails.]*/
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_067: [The `updateTwinReportedProperties` method shall call its callback with an error if authenticating fails.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('updateTwinReportedProperties', patch, callback);
                            }
                        });
                    },
                    enableTwinDesiredPropertiesUpdates: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_071: [The `enableTwinDesiredPropertiesUpdates` method shall connect and authenticate the transport if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err, result) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_072: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with an error if connecting fails.]*/
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_073: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with an error if authenticating fails.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('enableTwinDesiredPropertiesUpdates', callback);
                            }
                        });
                    },
                    disableTwinDesiredPropertiesUpdates: function (callback) { return callback(); },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_031: [The `enableC2D` method shall connect and authenticate the transport if it is disconnected.]*/
                    enableC2D: function (callback) {
                        _this._fsm.handle('connect', function (err, result) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_033: [The `enableC2D` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach link.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('enableC2D', callback);
                            }
                        });
                    },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_037: [The `disableC2D` method shall call its `callback` immediately if the transport is already disconnected.]*/
                    disableC2D: function (callback) {
                        // if we are disconnected the C2D link is already detached.
                        callback();
                    },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_038: [The `enableMethods` method shall connect and authenticate the transport if it is disconnected.]*/
                    enableMethods: function (callback) {
                        _this._fsm.handle('connect', function (err, result) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_040: [The `enableMethods` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach method links.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('enableMethods', callback);
                            }
                        });
                    },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_044: [The `disableMethods` method shall call its `callback` immediately if the transport is already disconnected.]*/
                    disableMethods: function (callback) {
                        // if we are disconnected the C2D link is already detached.
                        callback();
                    },
                    amqpConnectionClosed: function (err, callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_080: [if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is disconnected, the call shall be ignored.]*/
                        debug('ignoring amqpConnectionClosed because already disconnected: ' + err.toString());
                        callback();
                    }
                },
                connecting: {
                    _onEnter: function (connectCallback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_054: [The `connect` method shall get the current credentials by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the constructor as an argument.]*/
                        _this._authenticationProvider.getDeviceCredentials(function (err, credentials) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_055: [The `connect` method shall call its callback with an error if the callback passed to the `getDeviceCredentials` method is called with an error.]*/
                                _this._fsm.transition('disconnected', azure_iot_amqp_base_1.translateError('AMQP Transport: Could not get credentials', err), connectCallback);
                            }
                            else {
                                if (credentials.moduleId) {
                                    _this._c2dEndpoint = azure_iot_common_1.endpoint.moduleMessagePath(credentials.deviceId, credentials.moduleId);
                                    _this._d2cEndpoint = azure_iot_common_1.endpoint.moduleEventPath(credentials.deviceId, credentials.moduleId);
                                    _this._messageEventName = 'inputMessage';
                                }
                                else {
                                    _this._c2dEndpoint = azure_iot_common_1.endpoint.deviceMessagePath(credentials.deviceId);
                                    _this._d2cEndpoint = azure_iot_common_1.endpoint.deviceEventPath(credentials.deviceId);
                                    _this._messageEventName = 'message';
                                }
                                /*Tests_SRS_NODE_DEVICE_AMQP_41_001: [ The AMQP transport should use the productInfo string in the `options` object if present ]*/
                                /*Tests_SRS_NODE_DEVICE_AMQP_41_002: [ The connect method shall set the productInfo on the options object when calling the underlying connection object's connect method if it was supplied. ]*/
                                var customInfo = (_this._options && _this._options.productInfo) ? _this._options.productInfo : '';
                                azure_iot_device_1.getUserAgentString(customInfo, function (userAgentString) {
                                    var config = {
                                        uri: _this._getConnectionUri(credentials),
                                        sslOptions: credentials.x509,
                                        userAgentString: userAgentString
                                    };
                                    /*Codes_SRS_NODE_DEVICE_AMQP_13_002: [ The connect method shall set the CA cert on the options object when calling the underlying connection object's connect method if it was supplied. ]*/
                                    // if (this._options && this._options.ca) {
                                    //   config.sslOptions = config.sslOptions || {};
                                    //   config.sslOptions.ca = this._options.ca;
                                    // }
                                    if (_this._options) {
                                        config.sslOptions = config.sslOptions || {};
                                        /*Codes_SRS_NODE_DEVICE_AMQP_13_002: [ The connect method shall set the CA cert on the options object when calling the underlying connection object's connect method if it was supplied. ]*/
                                        if (_this._options.ca) {
                                            config.sslOptions.ca = _this._options.ca;
                                        }
                                        /*Codes_SRS_NODE_DEVICE_AMQP_99_084: [ The connect method shall set the HTTPS agent on the options object when calling the underlying connection object's connect method if it was supplied. ]*/
                                        if (_this._options.amqp && _this._options.amqp.webSocketAgent) {
                                            config.sslOptions.agent = _this._options.amqp.webSocketAgent;
                                        }
                                    }
                                    _this._amqp.connect(config, function (err, connectResult) {
                                        if (err) {
                                            _this._fsm.transition('disconnected', azure_iot_amqp_base_1.translateError('AMQP Transport: Could not connect', err), connectCallback);
                                        }
                                        else {
                                            _this._fsm.transition('authenticating', connectResult, connectCallback);
                                        }
                                    });
                                });
                            }
                        });
                    },
                    disconnect: function (disconnectCallback) { return _this._fsm.transition('disconnecting', null, disconnectCallback); },
                    updateSharedAccessSignature: function (token, callback) {
                        callback(null, new azure_iot_common_1.results.SharedAccessSignatureUpdated(false));
                    },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_081: [if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is connecting or authenticating, the connection shall be stopped and an `disconnect` event shall be emitted with the error translated to a transport-agnostic error.]*/
                    amqpConnectionClosed: function (err, callback) { return _this._fsm.transition('disconnecting', err, callback); },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                authenticating: {
                    _onEnter: function (connectResult, connectCallback) {
                        if (_this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.X509) {
                            /*Codes_SRS_NODE_DEVICE_AMQP_06_005: [If x509 authentication is NOT being utilized then `initializeCBS` shall be invoked.]*/
                            _this._fsm.transition('authenticated', connectResult, connectCallback);
                        }
                        else {
                            _this._amqp.initializeCBS(function (err) {
                                if (err) {
                                    /*Codes_SRS_NODE_DEVICE_AMQP_06_008: [If `initializeCBS` is not successful then the client will be disconnected.]*/
                                    _this._fsm.transition('disconnecting', getTranslatedError(err, 'AMQP Transport: Could not initialize CBS'), connectCallback);
                                }
                                else {
                                    _this._authenticationProvider.getDeviceCredentials(function (err, credentials) {
                                        if (err) {
                                            _this._fsm.transition('disconnecting', getTranslatedError(err, 'AMQP Transport: Could not get credentials from AuthenticationProvider'), connectCallback);
                                        }
                                        else {
                                            /*Codes_SRS_NODE_DEVICE_AMQP_06_006: [If `initializeCBS` is successful, `putToken` shall be invoked If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter `audience`, created from the `sr` of the shared access signature, the actual shared access signature, and a callback.]*/
                                            _this._amqp.putToken(azure_iot_common_1.SharedAccessSignature.parse(credentials.sharedAccessSignature, ['sr', 'sig', 'se']).sr, credentials.sharedAccessSignature, function (err) {
                                                if (err) {
                                                    /*Codes_SRS_NODE_DEVICE_AMQP_06_009: [If `putToken` is not successful then the client will be disconnected.]*/
                                                    _this._fsm.transition('disconnecting', getTranslatedError(err, 'AMQP Transport: Could not authorize with putToken'), connectCallback);
                                                }
                                                else {
                                                    _this._fsm.transition('authenticated', connectResult, connectCallback);
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    },
                    disconnect: function (disconnectCallback) { return _this._fsm.transition('disconnecting', null, disconnectCallback); },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_081: [if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is connecting or authenticating, the connection shall be stopped and an `disconnect` event shall be emitted with the error translated to a transport-agnostic error.]*/
                    amqpConnectionClosed: function (err, callback) { return _this._fsm.transition('disconnecting', err, callback); },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                authenticated: {
                    _onEnter: function (connectResult, connectCallback) {
                        connectCallback(null, connectResult);
                    },
                    connect: function (connectCallback) { return connectCallback(null, new azure_iot_common_1.results.Connected()); },
                    disconnect: function (disconnectCallback) { return _this._fsm.transition('disconnecting', null, disconnectCallback); },
                    sendEvent: function (amqpMessage, sendCallback) {
                        amqpMessage.to = _this._d2cEndpoint;
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_025: [The `sendEvent` method shall create and attach the d2c link if necessary.]*/
                        /*Codes_SRS_NODE_DEVICE_AMQP_18_006: [The `sendOutputEvent` method shall create and attach the d2c link if necessary.]*/
                        if (!_this._d2cLink) {
                            _this._amqp.attachSenderLink(_this._d2cEndpoint, null, function (err, link) {
                                if (err) {
                                    handleResult('AMQP Transport: Could not send', sendCallback)(err);
                                }
                                else {
                                    debug('got a new D2C link');
                                    _this._d2cLink = link;
                                    _this._d2cLink.on('error', _this._d2cErrorListener);
                                    _this._d2cLink.send(amqpMessage, handleResult('AMQP Transport: Could not send', sendCallback));
                                }
                            });
                        }
                        else {
                            debug('using existing d2c link');
                            _this._d2cLink.send(amqpMessage, handleResult('AMQP Transport: Could not send', sendCallback));
                        }
                    },
                    updateSharedAccessSignature: function (sharedAccessSignature, updateSasCallback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_06_010: [If the AMQP connection is established, the `updateSharedAccessSignature` method shall call the amqp transport `putToken` method with the first parameter `audience`, created from the `sr` of the shared access signature, the actual shared access signature, and a callback.]*/
                        _this._amqp.putToken(azure_iot_common_1.SharedAccessSignature.parse(sharedAccessSignature, ['sr', 'sig', 'se']).sr, sharedAccessSignature, function (err) {
                            if (err) {
                                _this._amqp.disconnect(function () {
                                    updateSasCallback(getTranslatedError(err, 'AMQP Transport: Could not authorize with puttoken'));
                                });
                            }
                            else {
                                /*Codes_SRS_NODE_DEVICE_AMQP_06_011: [The `updateSharedAccessSignature` method shall call the `done` callback with a null error object and a SharedAccessSignatureUpdated object as a result, indicating the client does NOT need to reestablish the transport connection.]*/
                                updateSasCallback(null, new azure_iot_common_1.results.SharedAccessSignatureUpdated(false));
                            }
                        });
                    },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_062: [The `getTwin` method shall call the `getTwin` method on the `AmqpTwinClient` instance created by the constructor.]*/
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_063: [The `getTwin` method shall call its callback with and error if the call to `AmqpTwinClient.getTwin` fails.]*/
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_064: [The `getTwin` method shall call its callback with a `null` error parameter and the result of the `AmqpTwinClient.getTwin` method if it succeeds.]*/
                    getTwin: function (callback) { return _this._twinClient.getTwin(handleResult('could not get twin', callback)); },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_068: [The `updateTwinReportedProperties` method shall call the `updateTwinReportedProperties` method on the `AmqpTwinClient` instance created by the constructor.]*/
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_069: [The `updateTwinReportedProperties` method shall call its callback with and error if the call to `AmqpTwinClient.updateTwinReportedProperties` fails.]*/
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_070: [The `updateTwinReportedProperties` method shall call its callback with a `null` error parameter and the result of the `AmqpTwinClient.updateTwinReportedProperties` method if it succeeds.]*/
                    updateTwinReportedProperties: function (patch, callback) { return _this._twinClient.updateTwinReportedProperties(patch, handleResult('could not update twin reported properties', callback)); },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_074: [The `enableTwinDesiredPropertiesUpdates` method shall call the `enableTwinDesiredPropertiesUpdates` method on the `AmqpTwinClient` instance created by the constructor.]*/
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_075: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with and error if the call to `AmqpTwinClient.enableTwinDesiredPropertiesUpdates` fails.]*/
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_076: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with no arguments if the call to `AmqpTwinClient.enableTwinDesiredPropertiesUpdates` succeeds.]*/
                    enableTwinDesiredPropertiesUpdates: function (callback) { return _this._twinClient.enableTwinDesiredPropertiesUpdates(handleResult('could not enable twin desired properties updates', callback)); },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_077: [The `disableTwinDesiredPropertiesUpdates` method shall call the `disableTwinDesiredPropertiesUpdates` method on the `AmqpTwinClient` instance created by the constructor.]*/
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_078: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback with and error if the call to `AmqpTwinClient.disableTwinDesiredPropertiesUpdates` fails.]*/
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_079: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback no arguments if the call to `AmqpTwinClient.disableTwinDesiredPropertiesUpdates` succeeds.]*/
                    disableTwinDesiredPropertiesUpdates: function (callback) { return _this._twinClient.disableTwinDesiredPropertiesUpdates(handleResult('could not disable twin desired properties updates', callback)); },
                    enableC2D: function (callback) {
                        debug('attaching C2D link');
                        _this._amqp.attachReceiverLink(_this._c2dEndpoint, null, function (err, receiverLink) {
                            if (err) {
                                debug('error creating a C2D link: ' + err.toString());
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_033: [The `enableC2D` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach link.]*/
                                handleResult('AMQP Transport: Could not attach link', callback)(err);
                            }
                            else {
                                /*Codes_SRS_NODE_DEVICE_AMQP_16_032: [The `enableC2D` method shall attach the C2D link and call its `callback` once it is successfully attached.]*/
                                debug('C2D link created and attached successfully');
                                _this._c2dLink = receiverLink;
                                _this._c2dLink.on('error', _this._c2dErrorListener);
                                _this._c2dLink.on('message', _this._c2dMessageListener);
                                callback();
                            }
                        });
                    },
                    disableC2D: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_035: [The `disableC2D` method shall call `detach` on the C2D link and call its callback when it is successfully detached.]*/
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_036: [The `disableC2D` method shall call its `callback` with an `Error` if it fails to detach the C2D link.]*/
                        _this._stopC2DListener(undefined, callback);
                    },
                    enableMethods: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_039: [The `enableMethods` method shall attach the method links and call its `callback` once these are successfully attached.]*/
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_040: [The `enableMethods` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach method links.]*/
                        _this._deviceMethodClient.attach(callback);
                    },
                    disableMethods: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_042: [The `disableMethods` method shall call `detach` on the device method links and call its callback when these are successfully detached.]*/
                        /*Codes_SRS_NODE_DEVICE_AMQP_16_043: [The `disableMethods` method shall call its `callback` with an `Error` if it fails to detach the device method links.]*/
                        _this._deviceMethodClient.detach(callback);
                    },
                    /*Codes_SRS_NODE_DEVICE_AMQP_16_082: [if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is connected, the connection shall be disconnected and an `disconnect` event shall be emitted with the error translated to a transport-agnostic error.]*/
                    amqpConnectionClosed: function (err, callback) { return _this._fsm.transition('disconnecting', err, callback); }
                },
                disconnecting: {
                    _onEnter: function (err, disconnectCallback) {
                        var finalError = err;
                        async.series([
                            function (callback) {
                                if (err) {
                                    debug('force-detaching device methods links');
                                    _this._deviceMethodClient.forceDetach();
                                    callback();
                                }
                                else {
                                    _this._deviceMethodClient.detach(function (detachErr) {
                                        if (detachErr) {
                                            debug('error detaching methods links: ' + detachErr.toString());
                                            if (!finalError) {
                                                finalError = azure_iot_amqp_base_1.translateError('error while detaching the methods links when disconnecting', detachErr);
                                            }
                                        }
                                        else {
                                            debug('device methods links detached.');
                                        }
                                        callback();
                                    });
                                }
                            },
                            function (callback) {
                                _this._twinClient.detach(function (twinDetachError) {
                                    if (twinDetachError) {
                                        debug('error detaching twin links: ' + twinDetachError.toString());
                                        if (!finalError) {
                                            finalError = azure_iot_amqp_base_1.translateError('error while detaching twin links', twinDetachError);
                                        }
                                    }
                                    else {
                                        debug('device twin links detached');
                                    }
                                    callback();
                                });
                            },
                            function (callback) {
                                if (_this._d2cLink) {
                                    var tmpD2CLink_1 = _this._d2cLink;
                                    _this._d2cLink = undefined;
                                    if (err) {
                                        /*Codes_SRS_NODE_DEVICE_AMQP_16_023: [The `disconnect` method shall forcefully detach all attached links if a connection error is the causing the transport to be disconnected.]*/
                                        tmpD2CLink_1.forceDetach(err);
                                        tmpD2CLink_1.removeListener('error', _this._d2cErrorListener);
                                    }
                                    tmpD2CLink_1.detach(function (detachErr) {
                                        if (detachErr) {
                                            debug('error detaching the D2C link: ' + detachErr.toString());
                                        }
                                        else {
                                            debug('D2C link detached');
                                        }
                                        tmpD2CLink_1.removeListener('error', _this._d2cErrorListener);
                                        if (!finalError && detachErr) {
                                            finalError = azure_iot_amqp_base_1.translateError('error while detaching the D2C link when disconnecting', detachErr);
                                        }
                                        callback();
                                    });
                                }
                                else {
                                    callback();
                                }
                            },
                            function (callback) {
                                if (_this._c2dLink) {
                                    /*Codes_SRS_NODE_DEVICE_AMQP_16_022: [The `disconnect` method shall detach all attached links.]*/
                                    _this._stopC2DListener(err, function (detachErr) {
                                        if (!finalError && detachErr) {
                                            finalError = azure_iot_amqp_base_1.translateError('error while detaching the D2C link when disconnecting', detachErr);
                                        }
                                        callback();
                                    });
                                }
                                else {
                                    callback();
                                }
                            },
                            function (callback) {
                                _this._amqp.disconnect(function (disconnectErr) {
                                    if (disconnectErr) {
                                        debug('error disconnecting the AMQP connection: ' + disconnectErr.toString());
                                    }
                                    else {
                                        debug('amqp connection successfully disconnected.');
                                    }
                                    if (!finalError && disconnectErr) {
                                        finalError = azure_iot_amqp_base_1.translateError('error while disconnecting the AMQP connection', disconnectErr);
                                    }
                                    callback();
                                });
                            }
                        ], function () {
                            /*Codes_SRS_NODE_DEVICE_AMQP_16_010: [The `done` callback method passed in argument shall be called when disconnected.]*/
                            /*Codes_SRS_NODE_DEVICE_AMQP_16_011: [The `done` callback method passed in argument shall be called with an error object if disconnecting fails.]*/
                            _this._fsm.transition('disconnected', finalError, disconnectCallback);
                        });
                    },
                    '*': function (connectCallback) { return _this._fsm.deferUntilTransition(); }
                },
            }
        });
        _this._fsm.on('transition', function (data) {
            debug(data.fromState + ' -> ' + data.toState + ' (' + data.action + ')');
        });
        return _this;
    }
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#connect
     * @description         Establishes a connection with the IoT Hub instance.
     * @param {Function}   done   Called when the connection is established of if an error happened.
     *
     */
    /*Codes_SRS_NODE_DEVICE_AMQP_16_008: [The done callback method passed in argument shall be called if the connection is established]*/
    /*Codes_SRS_NODE_DEVICE_AMQP_16_009: [The done callback method passed in argument shall be called with an error object if the connection fails]*/
    Amqp.prototype.connect = function (done) {
        this._fsm.handle('connect', done);
    };
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#disconnect
     * @description         Disconnects the link to the IoT Hub instance.
     * @param {Function}   done   Called when disconnected of if an error happened.
     */
    /*Codes_SRS_NODE_DEVICE_AMQP_16_010: [The done callback method passed in argument shall be called when disconnected]*/
    /*Codes_SRS_NODE_DEVICE_AMQP_16_011: [The done callback method passed in argument shall be called with an error object if disconnecting fails]*/
    Amqp.prototype.disconnect = function (done) {
        this._fsm.handle('disconnect', done);
    };
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
    Amqp.prototype.sendEvent = function (message, done) {
        var amqpMessage = azure_iot_amqp_base_1.AmqpMessage.fromMessage(message);
        this._fsm.handle('sendEvent', amqpMessage, done);
    };
    /**
     * @private
     * @method             module:azure-iot-device-amqp.Amqp#sendEventBatch
     * @description        Not Implemented.
     * @param {Message[]}  messages    The [messages]{@linkcode module:common/message.Message}
     *                                 to be sent.
     * @param {Function}   done        The callback to be invoked when `sendEventBatch`
     *                                 completes execution.
     */
    Amqp.prototype.sendEventBatch = function (messages, done) {
        /*Codes_SRS_NODE_DEVICE_AMQP_16_052: [The `sendEventBatch` method shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('AMQP Transport does not support batching yet');
    };
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#complete
     * @description         Settles the message as complete and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as complete.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    /*Codes_SRS_NODE_DEVICE_AMQP_16_013: [The ‘complete’ method shall call the ‘complete’ method of the C2D `ReceiverLink` object and pass it the message and the callback given as parameters.] */
    Amqp.prototype.complete = function (message, done) {
        if (this._c2dLink) {
            this._c2dLink.complete(message.transportObj, done);
        }
        else {
            done(new azure_iot_common_1.errors.DeviceMessageLockLostError('No active C2D link'));
        }
    };
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#reject
     * @description         Settles the message as rejected and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as rejected.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    /*Codes_SRS_NODE_DEVICE_AMQP_16_014: [The ‘reject’ method shall call the ‘reject’ method of the C2D `ReceiverLink` object and pass it the message and the callback given as parameters.] */
    Amqp.prototype.reject = function (message, done) {
        if (this._c2dLink) {
            this._c2dLink.reject(message.transportObj, done);
        }
        else {
            done(new azure_iot_common_1.errors.DeviceMessageLockLostError('No active C2D link'));
        }
    };
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#abandon
     * @description         Settles the message as abandoned and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as abandoned.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    /*Codes_SRS_NODE_DEVICE_AMQP_16_012: [The ‘abandon’ method shall call the ‘abandon’ method of the C2D `ReceiverLink` object and pass it the message and the callback given as parameters.] */
    Amqp.prototype.abandon = function (message, done) {
        if (this._c2dLink) {
            this._c2dLink.abandon(message.transportObj, done);
        }
        else {
            done(new azure_iot_common_1.errors.DeviceMessageLockLostError('No active C2D link'));
        }
    };
    /**
     * @private
     * @method          module:azure-iot-device-amqp.Amqp#updateSharedAccessSignature
     * @description     This methods sets the SAS token used to authenticate with the IoT Hub service and performs re-authorization using the CBS links with this new token
     *                  Updating the expiry time of the token is the responsibility of the caller.
     *
     * @param {String}        sharedAccessSignature  The new SAS token.
     * @param {Function}      done      The callback to be invoked when `updateSharedAccessSignature` completes.
     */
    Amqp.prototype.updateSharedAccessSignature = function (sharedAccessSignature, done) {
        /*Codes_SRS_NODE_DEVICE_AMQP_16_015: [The updateSharedAccessSignature method shall save the new shared access signature given as a parameter to its configuration.] */
        this._authenticationProvider.updateSharedAccessSignature(sharedAccessSignature);
        this._fsm.handle('updateSharedAccessSignature', sharedAccessSignature, done);
    };
    /**
     * @private
     * @method          module:azure-iot-device-amqp.Amqp#setOptions
     * @description     This methods sets the AMQP specific options of the transport.
     *
     * @param {object}        options   Options to set.  Currently for amqp these are the x509 cert, key, and optional passphrase properties. (All strings)
     * @param {Function}      done      The callback to be invoked when `setOptions` completes.
     */
    Amqp.prototype.setOptions = function (options, done) {
        /*Codes_SRS_NODE_DEVICE_AMQP_06_001: [The `setOptions` method shall throw a ReferenceError if the `options` parameter has not been supplied.]*/
        if (!options)
            throw new ReferenceError('The options parameter can not be \'' + options + '\'');
        if (options.hasOwnProperty('cert')) {
            if (this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.X509) {
                this._authenticationProvider.setX509Options(options);
            }
            else {
                /*Codes_SRS_NODE_DEVICE_AMQP_16_053: [The `setOptions` method shall throw an `InvalidOperationError` if the method is called with a cert option while using token-based authentication.]*/
                throw new azure_iot_common_1.errors.InvalidOperationError('cannot set X509 options when using token-based authentication');
            }
        }
        /* Codes_SRS_NODE_DEVICE_AMQP_06_012: [The `setOptions` method shall throw an `InvalidOperationError` if the method is called with token renewal options while using using cert or non renewal authentication.] */
        if (options.tokenRenewal) {
            if (this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.X509) {
                throw new azure_iot_common_1.errors.InvalidOperationError('cannot set token renewal options when using X509 authentication');
            }
            else if (!this._authenticationProvider.setTokenRenewalValues) {
                throw new azure_iot_common_1.errors.InvalidOperationError('can only set token renewal options when using pre-shared key authentication');
            }
            else {
                /* Codes_SRS_NODE_DEVICE_AMQP_06_013: [The authentication providers `setTokenRenewalValues` method shall be invoked with the values provided in the tokenRenewal option.] */
                this._authenticationProvider.setTokenRenewalValues(options.tokenRenewal.tokenValidTimeInSeconds, options.tokenRenewal.tokenRenewalMarginInSeconds);
            }
        }
        /*Codes_SRS_NODE_DEVICE_AMQP_13_001: [ The setOptions method shall save the options passed in. ]*/
        this._options = options;
        if (done) {
            /*Codes_SRS_NODE_DEVICE_AMQP_06_003: [`setOptions` should not throw if `done` has not been specified.]*/
            done();
        }
    };
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
    Amqp.prototype.onDeviceMethod = function (methodName, methodCallback) {
        /*Codes_SRS_NODE_DEVICE_AMQP_16_022: [The `onDeviceMethod` method shall call the `onDeviceMethod` method on the `AmqpDeviceMethodClient` object with the same arguments.]*/
        this._deviceMethodClient.onDeviceMethod(methodName, methodCallback);
    };
    /**
     * @private
     * The `sendMethodResponse` method sends a direct method response to the IoT Hub
     * @param {Object}     methodResponse   Object describing the device method response.
     * @param {Function}   callback         The callback to be invoked when
     *                                      `sendMethodResponse` completes execution.
     */
    Amqp.prototype.sendMethodResponse = function (methodResponse, callback) {
        /*Codes_SRS_NODE_DEVICE_AMQP_16_019: [The `sendMethodResponse` shall throw a `ReferenceError` if the `methodResponse` object is falsy.]*/
        if (!methodResponse) {
            throw new ReferenceError('\'methodResponse\' cannot be \'' + methodResponse + '\'');
        }
        /*Codes_SRS_NODE_DEVICE_AMQP_16_020: [The `sendMethodResponse` response shall call the `AmqpDeviceMethodClient.sendMethodResponse` method with the arguments that were given to it.]*/
        this._deviceMethodClient.sendMethodResponse(methodResponse, callback);
    };
    /**
     * @private
     * Gets the Twin for the connected device.
     *
     * @param callback called when the transport has a twin or encountered and error trying to retrieve it.
     */
    Amqp.prototype.getTwin = function (callback) {
        this._fsm.handle('getTwin', callback);
    };
    /**
     * @private
     */
    Amqp.prototype.updateTwinReportedProperties = function (patch, callback) {
        this._fsm.handle('updateTwinReportedProperties', patch, callback);
    };
    /**
     * @private
     */
    Amqp.prototype.enableTwinDesiredPropertiesUpdates = function (callback) {
        this._fsm.handle('enableTwinDesiredPropertiesUpdates', callback);
    };
    /**
     * @private
     */
    Amqp.prototype.disableTwinDesiredPropertiesUpdates = function (callback) {
        this._fsm.handle('disableTwinDesiredPropertiesUpdates', callback);
    };
    /**
     * @private
     */
    Amqp.prototype.enableC2D = function (callback) {
        this._fsm.handle('enableC2D', callback);
    };
    /**
     * @private
     */
    Amqp.prototype.disableC2D = function (callback) {
        this._fsm.handle('disableC2D', callback);
    };
    /**
     * @private
     */
    Amqp.prototype.enableMethods = function (callback) {
        this._fsm.handle('enableMethods', callback);
    };
    /**
     * @private
     */
    Amqp.prototype.disableMethods = function (callback) {
        this._fsm.handle('disableMethods', callback);
    };
    /**
     * @private
     */
    Amqp.prototype.enableInputMessages = function (callback) {
        /*Codes_SRS_NODE_DEVICE_AMQP_18_010: [The `enableInputMessages` method shall enable C2D messages]*/
        this._fsm.handle('enableC2D', callback);
    };
    /**
     * @private
     */
    Amqp.prototype.disableInputMessages = function (callback) {
        /*Codes_SRS_NODE_DEVICE_AMQP_18_011: [The `disableInputMessages` method shall disable C2D messages]*/
        this._fsm.handle('disableC2D', callback);
    };
    /**
     * @private
     */
    /*Codes_SRS_NODE_DEVICE_AMQP_18_007: [The `sendOutputEvent` method shall construct an AMQP request using the message passed in argument as the body of the message.]*/
    /*Codes_SRS_NODE_DEVICE_AMQP_18_008: [The `sendOutputEvent` method shall call the `done` callback with a null error object and a MessageEnqueued result object when the message has been successfully sent.]*/
    /*Codes_SRS_NODE_DEVICE_AMQP_18_009: [If `sendOutputEvent` encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    Amqp.prototype.sendOutputEvent = function (outputName, message, callback) {
        var amqpMessage = azure_iot_amqp_base_1.AmqpMessage.fromMessage(message);
        if (!amqpMessage.application_properties) {
            amqpMessage.application_properties = {};
        }
        /*Codes_SRS_NODE_DEVICE_AMQP_18_012: [The `sendOutputEvent` method  shall set the application property "iothub-outputname" on the message to the `outputName`.]*/
        amqpMessage.application_properties['iothub-outputname'] = outputName;
        this._fsm.handle('sendEvent', amqpMessage, callback);
    };
    /**
     * @private
     */
    Amqp.prototype.sendOutputEventBatch = function (outputName, messages, done) {
        /*Codes_SRS_NODE_DEVICE_AMQP_18_004: [`sendOutputEventBatch` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Output events are not implemented over AMQP.');
    };
    Amqp.prototype._getConnectionUri = function (credentials) {
        return 'amqps://' + (credentials.gatewayHostName || credentials.host);
    };
    Amqp.prototype._stopC2DListener = function (err, callback) {
        var _this = this;
        var tmpC2DLink = this._c2dLink;
        this._c2dLink = undefined;
        if (tmpC2DLink) {
            if (err) {
                debug('forceDetaching C2D link');
                tmpC2DLink.forceDetach(err);
                // detaching listeners and getting rid of the object anyway.
                tmpC2DLink.removeListener('error', this._c2dErrorListener);
                tmpC2DLink.removeListener('message', this._c2dMessageListener);
                callback();
            }
            else {
                tmpC2DLink.detach(function (err) {
                    if (err) {
                        debug('error detaching C2D link: ' + err.toString());
                    }
                    else {
                        debug('C2D link successfully detached');
                    }
                    // detaching listeners and getting rid of the object anyway.
                    tmpC2DLink.removeListener('error', _this._c2dErrorListener);
                    tmpC2DLink.removeListener('message', _this._c2dMessageListener);
                    callback(err);
                });
            }
        }
        else {
            debug('No C2D Link to detach');
            callback();
        }
    };
    return Amqp;
}(events_1.EventEmitter));
exports.Amqp = Amqp;
//# sourceMappingURL=amqp.js.map