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
var events_1 = require("events");
var dbg = require("debug");
var machina = require("machina");
var async = require("async");
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_amqp_base_1 = require("azure-iot-amqp-base");
var amqp_service_errors_js_1 = require("./amqp_service_errors.js");
var service_receiver_js_1 = require("./service_receiver.js");
var interfaces_js_1 = require("./interfaces.js");
var UnauthorizedError = azure_iot_common_1.errors.UnauthorizedError;
var DeviceNotFoundError = azure_iot_common_1.errors.DeviceNotFoundError;
var NotConnectedError = azure_iot_common_1.errors.NotConnectedError;
var debug = dbg('azure-iothub:Amqp');
// tslint:disable-next-line:no-var-requires
var packageJson = require('../package.json');
function handleResult(errorMessage, done) {
    return function (err, result) {
        if (err) {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_018: [All asynchronous instance methods shall call the `done` callback with either no arguments or a first null argument and a second argument that is the result of the operation if the operation succeeded.]*/
            done(amqp_service_errors_js_1.translateError(errorMessage, err));
        }
        else {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_017: [All asynchronous instance methods shall call the `done` callback with a single parameter that is derived from the standard Javascript `Error` object if the operation failed.]*/
            done(null, result);
        }
    };
}
function getTranslatedError(err, message) {
    if (err instanceof UnauthorizedError || err instanceof NotConnectedError || err instanceof DeviceNotFoundError) {
        return err;
    }
    return amqp_service_errors_js_1.translateError(message, err);
}
/**
 * Transport class used by the [service client]{@link azure-iothub.Client} to connect to the Azure IoT hub using the AMQP protocol over a secure (TLS) socket.
 * This class should not be used directly and instead be passed to one of the {@link azure-iothub.Client} factory methods: {@link azure-iothub.Client.fromConnectionString|fromConnectionString} or {@link azure-iothub.Client.fromSharedAccessSignature|fromSharedAccessSignature}.
 */
/*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_001: [The Amqp constructor shall accept a config object with those 4 properties:
host – (string) the fully-qualified DNS hostname of an IoT Hub
keyName – (string) the name of a key that can be used to communicate with the IoT Hub instance
sharedAccessSignature – (string) the key associated with the key name.] */
var Amqp = /** @class */ (function (_super) {
    __extends(Amqp, _super);
    /**
     * @private
     */
    function Amqp(config, amqpBase) {
        var _this = _super.call(this) || this;
        _this._renewalNumberOfMilliseconds = 2700000;
        _this._c2dEndpoint = '/messages/devicebound';
        _this._feedbackEndpoint = '/messages/serviceBound/feedback';
        _this._fileNotificationEndpoint = '/messages/serviceBound/filenotifications';
        _this._amqp = amqpBase ? amqpBase : new azure_iot_amqp_base_1.Amqp(true);
        _this._config = config;
        _this._renewalTimeout = null;
        _this._amqp.setDisconnectHandler(function (err) {
            _this._fsm.handle('amqpError', err);
        });
        _this._c2dErrorListener = function (err) {
            debug('Error on the C2D link: ' + err.toString());
            _this._c2dLink = null;
        };
        _this._feedbackErrorListener = function (err) {
            debug('Error on the message feedback link: ' + err.toString());
            _this._feedbackReceiver = null;
        };
        _this._fileNotificationErrorListener = function (err) {
            debug('Error on the file notification link: ' + err.toString());
            _this._fileNotificationReceiver = null;
        };
        _this._fsm = new machina.Fsm({
            namespace: 'azure-iothub:Amqp',
            initialState: 'disconnected',
            states: {
                disconnected: {
                    _onEnter: function (err, callback) {
                        if (err) {
                            if (callback) {
                                callback(err);
                            }
                            else {
                                _this.emit('disconnect', err);
                            }
                        }
                        else {
                            if (callback) {
                                callback();
                            }
                        }
                    },
                    connect: function (callback) {
                        _this._fsm.transition('connecting', callback);
                    },
                    disconnect: function (callback) { return callback(); },
                    send: function (amqpMessage, deviceEndpoint, callback) {
                        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_025: [The `send` method shall connect and authenticate the transport if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_026: [The `send` method shall call its callback with an error if connecting and/or authenticating the transport fails.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('send', amqpMessage, deviceEndpoint, callback);
                            }
                        });
                    },
                    getFeedbackReceiver: function (callback) {
                        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_033: [The `getFeedbackReceiver` method shall connect and authenticate the transport if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_034: [The `getFeedbackReceiver` method shall call its callback with an error if the transport fails to connect or authenticate.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('getFeedbackReceiver', callback);
                            }
                        });
                    },
                    getFileNotificationReceiver: function (callback) {
                        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_036: [The `getFileNotificationReceiver` method shall connect and authenticate the transport if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_037: [The `getFileNotificationReceiver` method shall call its callback with an error if the transport fails to connect or authenticate.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('getFileNotificationReceiver', callback);
                            }
                        });
                    },
                    updateSharedAccessSignature: function (updatedSAS, callback) {
                        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_032: [The `updateSharedAccessSignature` shall not establish a connection if the transport is disconnected, but should use the new shared access signature on the next manually initiated connection attempt.]*/
                        callback();
                    },
                    amqpError: function (err) {
                        debug('Late arriving error received while in disconnected state.');
                        if (err) {
                            debug(err.toString());
                        }
                    }
                },
                connecting: {
                    _onEnter: function (callback) {
                        var config = {
                            uri: _this._getConnectionUri(),
                            userAgentString: packageJson.name + '/' + packageJson.version
                        };
                        debug('connecting');
                        _this._amqp.connect(config, function (err, result) {
                            if (err) {
                                debug('failed to connect' + err.toString());
                                _this._fsm.transition('disconnected', err, callback);
                            }
                            else {
                                debug('connected');
                                _this._fsm.transition('authenticating', callback);
                            }
                        });
                    },
                    disconnect: function (callback) {
                        _this._fsm.transition('disconnecting', null, callback);
                    },
                    amqpError: function (err) {
                        _this._fsm.transition('disconnecting', err);
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                authenticating: {
                    _onEnter: function (callback) {
                        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_001: [`initializeCBS` shall be invoked.]*/
                        _this._amqp.initializeCBS(function (err) {
                            if (err) {
                                debug('error trying to initialize CBS: ' + err.toString());
                                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_002: [If `initializeCBS` is not successful then the client will remain disconnected and the callback, if provided, will be invoked with an error object.]*/
                                _this._fsm.transition('disconnecting', err, callback);
                            }
                            else {
                                debug('CBS initialized');
                                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_003: [If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback.]*/
                                var audience = azure_iot_common_1.SharedAccessSignature.parse(_this._config.sharedAccessSignature.toString(), ['sr', 'sig', 'se']).sr;
                                var applicationSuppliedSas_1 = typeof (_this._config.sharedAccessSignature) === 'string';
                                var sasToken = applicationSuppliedSas_1 ? _this._config.sharedAccessSignature : _this._config.sharedAccessSignature.extend(azure_iot_common_1.anHourFromNow());
                                _this._amqp.putToken(audience, sasToken, function (err) {
                                    if (err) {
                                        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_004: [** If `putToken` is not successful then the client will remain disconnected and the callback, if provided, will be invoked with an error object.]*/
                                        _this._fsm.transition('disconnecting', err, callback);
                                    }
                                    else {
                                        _this._fsm.transition('authenticated', applicationSuppliedSas_1, callback);
                                    }
                                });
                            }
                        });
                    },
                    disconnect: function (callback) {
                        _this._fsm.transition('disconnecting', null, callback);
                    },
                    amqpError: function (err) {
                        _this._fsm.transition('disconnecting', err);
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                authenticated: {
                    _onEnter: function (applicationSuppliedSas, callback) {
                        if (!applicationSuppliedSas) {
                            _this._renewalTimeout = setTimeout(_this._handleSASRenewal.bind(_this), _this._renewalNumberOfMilliseconds);
                        }
                        callback(null, new azure_iot_common_1.results.Connected());
                    },
                    _onExit: function (callback) {
                        if (_this._renewalTimeout) {
                            clearTimeout(_this._renewalTimeout);
                        }
                    },
                    connect: function (callback) { return callback(); },
                    disconnect: function (callback) { return _this._fsm.transition('disconnecting', null, callback); },
                    send: function (amqpMessage, deviceEndpoint, callback) {
                        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_003: [The message generated by the `send` method should have its “to” field set to the device ID passed as an argument.]*/
                        amqpMessage.to = deviceEndpoint;
                        if (!_this._c2dLink) {
                            debug('attaching new sender link: ' + _this._c2dEndpoint);
                            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_027: [The `send` method shall attach the C2D link if necessary.]*/
                            _this._amqp.attachSenderLink(_this._c2dEndpoint, null, function (err, link) {
                                if (err) {
                                    debug('error trying to attach new sender link: ' + err.toString());
                                    /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_029: [The `send` method shall call its callback with an error if it fails to attach the C2D link.]*/
                                    callback(err);
                                }
                                else {
                                    debug('sender link attached. sending message.');
                                    _this._c2dLink = link;
                                    _this._c2dLink.on('error', _this._c2dErrorListener);
                                    /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_030: [The `send` method shall call the `send` method of the C2D link and pass it the Amqp request that it created.]*/
                                    _this._c2dLink.send(amqpMessage, callback);
                                }
                            });
                        }
                        else {
                            debug('reusing existing sender link: ' + _this._c2dEndpoint + '. sending message.');
                            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_028: [The `send` method shall reuse the C2D link if it is already attached.]*/
                            _this._c2dLink.send(amqpMessage, callback);
                        }
                    },
                    getFeedbackReceiver: function (callback) {
                        if (_this._feedbackReceiver) {
                            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_035: [The `getFeedbackReceiver` method shall reuse the existing feedback receiver it if has already been attached.]*/
                            callback(null, _this._feedbackReceiver);
                        }
                        else {
                            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_013: [The `getFeedbackReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/feedback` endpoint.]*/
                            _this._amqp.attachReceiverLink(_this._feedbackEndpoint, null, function (err, link) {
                                if (err) {
                                    callback(err);
                                }
                                else {
                                    _this._feedbackReceiver = new service_receiver_js_1.ServiceReceiver(link);
                                    _this._feedbackReceiver.on('error', _this._feedbackErrorListener);
                                    callback(null, _this._feedbackReceiver);
                                }
                            });
                        }
                    },
                    getFileNotificationReceiver: function (callback) {
                        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_038: [The `getFileNotificationReceiver` method shall reuse the existing feedback receiver it if has already been attached.]*/
                        if (_this._fileNotificationReceiver) {
                            callback(null, _this._fileNotificationReceiver);
                        }
                        else {
                            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_016: [The `getFileNotificationReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/filenotifications` endpoint.]*/
                            _this._amqp.attachReceiverLink(_this._fileNotificationEndpoint, null, function (err, link) {
                                if (err) {
                                    callback(err);
                                }
                                else {
                                    _this._fileNotificationReceiver = new service_receiver_js_1.ServiceReceiver(link);
                                    _this._fileNotificationReceiver.on('error', _this._fileNotificationErrorListener);
                                    callback(null, _this._fileNotificationReceiver);
                                }
                            });
                        }
                    },
                    updateSharedAccessSignature: function (updatedSAS, callback) {
                        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_031: [The `updateSharedAccessSignature` shall trigger a `putToken` call on the base transport if it is connected.]*/
                        var audience = azure_iot_common_1.SharedAccessSignature.parse(_this._config.sharedAccessSignature.toString(), ['sr', 'sig', 'se']).sr;
                        _this._amqp.putToken(audience, updatedSAS, callback);
                    },
                    amqpError: function (err) {
                        _this._fsm.transition('disconnecting', err);
                    }
                },
                disconnecting: {
                    _onEnter: function (err, disconnectCallback) {
                        var finalError = err;
                        async.series([
                            function (callback) {
                                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_021: [The `disconnect` method shall detach the C2D messaging link if it is attached.]*/
                                if (_this._c2dLink) {
                                    var tmpC2DLink = _this._c2dLink;
                                    _this._c2dLink = undefined;
                                    if (err) {
                                        debug('force-detaching c2d links');
                                        tmpC2DLink.forceDetach(err);
                                        callback();
                                    }
                                    else {
                                        tmpC2DLink.detach(function (detachErr) {
                                            if (detachErr) {
                                                debug('error detaching the c2d link: ' + detachErr.toString());
                                                if (!finalError) {
                                                    finalError = amqp_service_errors_js_1.translateError('error while detaching the c2d link when disconnecting', detachErr);
                                                }
                                            }
                                            else {
                                                debug('c2d link detached.');
                                            }
                                            callback();
                                        });
                                    }
                                }
                                else {
                                    callback();
                                }
                            },
                            function (callback) {
                                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_022: [The `disconnect` method shall detach the C2D feedback receiver link if it is attached.]*/
                                if (_this._feedbackReceiver) {
                                    var tmpFeedbackReceiver_1 = _this._feedbackReceiver;
                                    _this._feedbackReceiver = undefined;
                                    if (err) {
                                        tmpFeedbackReceiver_1.forceDetach(err);
                                        tmpFeedbackReceiver_1.removeListener('error', _this._feedbackErrorListener);
                                        callback();
                                    }
                                    else {
                                        tmpFeedbackReceiver_1.detach(function (detachErr) {
                                            if (detachErr) {
                                                debug('error detaching the message feedback link: ' + detachErr.toString());
                                            }
                                            else {
                                                debug('feedback link detached');
                                            }
                                            tmpFeedbackReceiver_1.removeListener('error', _this._feedbackErrorListener);
                                            if (!finalError && detachErr) {
                                                finalError = amqp_service_errors_js_1.translateError('error while detaching the message feedback link when disconnecting', detachErr);
                                            }
                                            callback();
                                        });
                                    }
                                }
                                else {
                                    callback();
                                }
                            },
                            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_023: [The `disconnect` method shall detach the file notification receiver link if it is attached.]*/
                            function (callback) {
                                if (_this._fileNotificationReceiver) {
                                    var tmpFileNotificationReceiver_1 = _this._fileNotificationReceiver;
                                    _this._fileNotificationReceiver = undefined;
                                    if (err) {
                                        tmpFileNotificationReceiver_1.forceDetach(err);
                                        tmpFileNotificationReceiver_1.removeListener('error', _this._fileNotificationErrorListener);
                                        callback();
                                    }
                                    else {
                                        tmpFileNotificationReceiver_1.detach(function (detachErr) {
                                            if (detachErr) {
                                                debug('error detaching the file upload notification link: ' + detachErr.toString());
                                            }
                                            else {
                                                debug('File notification link detached');
                                            }
                                            tmpFileNotificationReceiver_1.removeListener('error', _this._fileNotificationErrorListener);
                                            if (!finalError && detachErr) {
                                                finalError = amqp_service_errors_js_1.translateError('error while detaching the file upload notification link when disconnecting', detachErr);
                                            }
                                            callback();
                                        });
                                    }
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
                                        finalError = amqp_service_errors_js_1.translateError('error while disconnecting the AMQP connection', disconnectErr);
                                    }
                                    callback();
                                });
                            }
                        ], function () {
                            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_024: [Any error generated by detaching a link should be passed as the single argument of the callback of the `disconnect` method.]*/
                            _this._fsm.transition('disconnected', finalError, disconnectCallback);
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                }
            }
        });
        return _this;
    }
    Amqp.prototype.connect = function (done) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            _this._fsm.handle('connect', function (err) {
                if (err) {
                    _callback(amqp_service_errors_js_1.translateError('AMQP Transport: Could not connect', err));
                }
                else {
                    _callback(null, new azure_iot_common_1.results.Connected());
                }
            });
        }, done);
    };
    Amqp.prototype.disconnect = function (done) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            _this._fsm.handle('disconnect', function (err) {
                if (err) {
                    _callback(getTranslatedError(err, 'error while disconnecting'));
                }
                else {
                    _callback(null, new azure_iot_common_1.results.Disconnected());
                }
            });
        }, done);
    };
    Amqp.prototype.send = function (deviceId, message, done) {
        var _this = this;
        return azure_iot_common_1.tripleValueCallbackToPromise(function (_callback) {
            var deviceEndpoint = azure_iot_common_1.endpoint.deviceMessagePath(encodeURIComponent(deviceId));
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_002: [The `send` method shall construct an AMQP request using the message passed in argument as the body of the message.]*/
            var amqpMessage = azure_iot_amqp_base_1.AmqpMessage.fromMessage(message);
            _this._fsm.handle('send', amqpMessage, deviceEndpoint, handleResult('AMQP Transport: Could not send message', _callback));
        }, function (r, m) { return interfaces_js_1.createResultWithIncomingMessage(r, m); }, done);
    };
    Amqp.prototype.getFeedbackReceiver = function (done) {
        var _this = this;
        return azure_iot_common_1.tripleValueCallbackToPromise(function (_callback) {
            _this._fsm.handle('getFeedbackReceiver', handleResult('AMQP Transport: Could not get feedback receiver', _callback));
        }, function (r, m) { return interfaces_js_1.createResultWithIncomingMessage(r, m); }, done);
    };
    Amqp.prototype.getFileNotificationReceiver = function (done) {
        var _this = this;
        return azure_iot_common_1.tripleValueCallbackToPromise(function (_callback) {
            _this._fsm.handle('getFileNotificationReceiver', handleResult('AMQP Transport: Could not get file notification receiver', _callback));
        }, function (r, m) { return interfaces_js_1.createResultWithIncomingMessage(r, m); }, done);
    };
    Amqp.prototype.updateSharedAccessSignature = function (sharedAccessSignature, callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            if (!sharedAccessSignature) {
                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_039: [The `updateSharedAccessSignature` shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
                throw new ReferenceError('sharedAccessSignature cannot be \'' + sharedAccessSignature + '\'');
            }
            _this._config.sharedAccessSignature = sharedAccessSignature;
            _this._fsm.handle('updateSharedAccessSignature', sharedAccessSignature, function (err) {
                if (err) {
                    /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_017: [** All asynchronous instance methods shall call the `_callback` callback with a single parameter that is derived from the standard Javascript `Error` object if the operation failed.]*/
                    _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_018: [All asynchronous instance methods shall call the `_callback` callback with either no arguments or a first null argument and a second argument that is the result of the operation if the operation succeeded.]*/
                    _callback(null, new azure_iot_common_1.results.SharedAccessSignatureUpdated(false));
                }
            });
        }, callback);
    };
    Amqp.prototype._getConnectionUri = function () {
        return 'amqps://' + this._config.host;
    };
    Amqp.prototype._handleSASRenewal = function () {
        var _this = this;
        var newSas = this._config.sharedAccessSignature.extend(azure_iot_common_1.anHourFromNow());
        this._fsm.handle('updateSharedAccessSignature', newSas, function (err) {
            if (err) {
                debug('error automatically renewing the sas token: ' + err.toString());
            }
            else {
                _this._renewalTimeout = setTimeout(_this._handleSASRenewal.bind(_this), _this._renewalNumberOfMilliseconds);
            }
        });
    };
    return Amqp;
}(events_1.EventEmitter));
exports.Amqp = Amqp;
//# sourceMappingURL=amqp.js.map