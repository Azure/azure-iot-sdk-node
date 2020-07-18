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
var uuid = require("uuid");
var machina = require("machina");
var dbg = require("debug");
var queryString = require("querystring");
var debug = dbg('azure-iot-provisioning-device-mqtt:Mqtt');
var azure_iot_mqtt_base_1 = require("azure-iot-mqtt-base");
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_provisioning_device_1 = require("azure-iot-provisioning-device");
var azure_iot_provisioning_device_2 = require("azure-iot-provisioning-device");
/**
 * Topic to subscribe to for responses
 */
var responseTopic = '$dps/registrations/res/#';
/**
 * Transport used to provision a device over MQTT.
 */
var Mqtt = /** @class */ (function (_super) {
    __extends(Mqtt, _super);
    /**
     * @private
     */
    function Mqtt(mqttBase) {
        var _this = _super.call(this) || this;
        _this._config = {};
        _this._operations = {};
        _this._mqttBase = mqttBase || new azure_iot_mqtt_base_1.MqttBase();
        _this._config.pollingInterval = azure_iot_provisioning_device_1.ProvisioningDeviceConstants.defaultPollingInterval;
        var responseHandler = function (topic, payload) {
            var payloadString = payload.toString('ascii');
            debug('message received on ' + topic);
            debug('request payload is: ' + payloadString);
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_010: [ When waiting for responses, `registrationRequest` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_024: [ When waiting for responses, `queryOperationStatus` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
            var match = topic.match(/^\$dps\/registrations\/res\/(.*)\/\?(.*)$/);
            if (!!match && match.length === 3) {
                var queryParameters = queryString.parse(match[2]);
                if (queryParameters.$rid) {
                    var rid = queryParameters.$rid;
                    if (_this._operations[rid]) {
                        var status_1 = Number(match[1]);
                        var payloadJson = JSON.parse(payloadString);
                        var handler = _this._operations[rid].handler;
                        var statusString = _this._operations[rid].statusString;
                        var operationId = _this._operations[rid].operationId;
                        var retryAfterInMilliseconds = _this._config.pollingInterval;
                        var retryParameter = 'retry-after';
                        /* Codes_SRS_NODE_PROVISIONING_MQTT_06_005: [ If the response to the `queryOperationStatus` contains a query parameter of `retry-after` that value * 1000 shall be the value of `callback` `pollingInterval` argument, otherwise default.] */
                        /* Codes_SRS_NODE_PROVISIONING_MQTT_06_006: [ If the response to the `registrationRequest` contains a query parameter of `retry-after` that value * 1000 shall be the value of `callback` `pollingInterval` argument, otherwise default.] */
                        if (queryParameters[retryParameter]) {
                            retryAfterInMilliseconds = Number(queryParameters[retryParameter]) * 1000;
                        }
                        delete _this._operations[rid];
                        if (status_1 < 300) {
                            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_013: [ When `registrationRequest` receives a successful response from the service, it shall call `callback` passing in null and the response.] */
                            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_027: [ When `queryOperationStatus` receives a successful response from the service, it shall call `callback` passing in null and the response.] */
                            handler(null, payloadJson, retryAfterInMilliseconds);
                        }
                        else if (status_1 >= 429) {
                            /*Codes_SRS_NODE_PROVISIONING_MQTT_06_003: [ When `registrationRequest` receives a response with status >429, it shall invoke `callback` with a result object containing property `status` with a value `registering` and no `operationId` property.] */
                            /*Codes_SRS_NODE_PROVISIONING_MQTT_06_004: [ When `queryOperationStatus` receives a response with status >429, it shall invoke `callback` with a result object containing property `status` with a value `assigning` and `operationId` property with value of the passed to the request.] */
                            handler(null, { status: statusString, operationId: operationId }, retryAfterInMilliseconds);
                        }
                        else {
                            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_012: [ If `registrationRequest` receives a response with status >= 300 and <429, it shall consider the request failed and create an error using `translateError`.] */
                            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_015: [ When `registrationRequest` receives an error from the service, it shall call `callback` passing in the error.] */
                            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_026: [ If `queryOperationStatus` receives a response with status >= 300 and <429, it shall consider the query failed and create an error using `translateError`.] */
                            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_029: [ When `queryOperationStatus` receives an error from the service, it shall call `callback` passing in the error.] */
                            handler(azure_iot_provisioning_device_2.translateError('incoming message failure', status_1, payloadJson, { topic: topic, payload: payloadJson }));
                        }
                    }
                    else {
                        debug('received an unknown request id: ' + rid + ' topic: ' + topic);
                    }
                }
                else {
                    debug('received message with no request id. Topic is: ' + topic);
                }
            }
            else {
                debug('received a topic string with insufficient content: ' + topic);
            }
        };
        var errorHandler = function (err) {
            _this._fsm.handle('disconnect', err);
        };
        _this._mqttBase.on('message', responseHandler);
        _this._mqttBase.on('error', errorHandler);
        _this._fsm = new machina.Fsm({
            namespace: 'provisioning-transport-mqtt',
            initialState: 'disconnected',
            states: {
                disconnected: {
                    _onEnter: function (err, callback) {
                        if (callback) {
                            callback(err);
                        }
                        else if (err) {
                            _this.emit('error', err);
                        }
                    },
                    registrationRequest: function (request, rid, callback) {
                        _this._operations[rid] = { handler: callback, statusString: 'registering' };
                        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_002: [ If the transport is not connected, `registrationRequest` shall connect it and subscribe to the response topic.] */
                        _this._fsm.handle('connect', request, function (err) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('registrationRequest', request, rid, callback);
                            }
                        });
                    },
                    queryOperationStatus: function (request, rid, operationId, callback) {
                        _this._operations[rid] = { handler: callback, statusString: 'assigning', operationId: operationId };
                        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_016: [ If the transport is not connected, `queryOperationStatus` shall connect it and subscribe to the response topic.] */
                        _this._fsm.handle('connect', request, function (err) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('queryOperationStatus', request, rid, operationId, callback);
                            }
                        });
                    },
                    connect: function (request, callback) { return _this._fsm.transition('connecting', request, callback); },
                    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_052: [ If `disconnect` is called while the transport is disconnected, it will call `callback` immediately. ] */
                    disconnect: function (err, callback) { return callback(err); },
                    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_030: [ If `cancel` is called while the transport is disconnected, it will call `callback` immediately.] */
                    cancel: function (callback) { return callback(); }
                },
                connecting: {
                    _onEnter: function (request, callback) {
                        _this._connect(request, function (err) {
                            if (err) {
                                /* Codes_SRS_NODE_PROVISIONING_MQTT_18_051: [ If either `_mqttBase.connect` or `_mqttBase.subscribe` fails, `mqtt` will disconnect the transport. ] */
                                _this._fsm.transition('disconnecting', err, callback);
                            }
                            else {
                                _this._fsm.transition('connected', null, request, null, callback);
                            }
                        });
                    },
                    cancel: function (callback) {
                        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_062: [ If `cancel` is called while the transport is in the process of connecting, it shell disconnect transport and cancel the operation that initiated the connection. ] */
                        _this._cancelAllOperations();
                        _this._fsm.transition('disconnecting', null, callback);
                    },
                    disconnect: function (err, callback) {
                        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_061: [ If `disconnect` is called while the transport is in the process of connecting, it shell disconnect connection and cancel the operation that initiated the connection. ] */
                        _this._cancelAllOperations();
                        _this._fsm.transition('disconnecting', err, callback);
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                connected: {
                    _onEnter: function (err, request, result, callback) { return callback(err, result, request); },
                    registrationRequest: function (request, rid, callback) {
                        _this._operations[rid] = { handler: callback, statusString: 'registering' };
                        _this._sendRegistrationRequest(request, rid, function (err, result) {
                            callback(err, result, request);
                        });
                    },
                    queryOperationStatus: function (request, rid, operationId, callback) {
                        _this._operations[rid] = { handler: callback, statusString: 'assigning', operationId: operationId };
                        _this._sendOperationStatusQuery(request, rid, operationId, function (err, result) {
                            callback(err, result, request);
                        });
                    },
                    cancel: function (callback) {
                        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_032: [ If `cancel` is called while the transport is connected and idle, it will call `callback` immediately.] */
                        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_033: [ If `cancel` is called while the transport is in the middle of a `registrationRequest` operation, it will stop listening for a response and cause `registrationRequest` call it's `callback` passing an `OperationCancelledError` error.] */
                        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_034: [ If `cancel` is called while the transport is in the middle of a `queryOperationStatus` operation, it will stop listening for a response and cause `registrationRequest` call it's `callback` passing an `OperationCancelledError` error.] */
                        _this._cancelAllOperations();
                        callback();
                    },
                    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_054: [ If `disconnect` is called while the transport is connected and idle, it shall disconnect. ] */
                    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_055: [ If `disconnect` is called while the transport is in the middle of a `registrationRequest` operation, it shall cancel the `registrationRequest` operation and disconnect the transport. ] */
                    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_056: [ If `disconnect` is called while the transport is in the middle of a `queryOperationStatus` operation, it shall cancel the `queryOperationStatus` operation and disconnect the transport. ] */
                    disconnect: function (err, callback) {
                        _this._cancelAllOperations();
                        _this._fsm.transition('disconnecting', err, callback);
                    }
                },
                disconnecting: {
                    _onEnter: function (err, callback) {
                        _this._disconnect(function (disconnectErr) {
                            _this._fsm.transition('disconnected', err || disconnectErr, callback);
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                }
            }
        });
        _this._fsm.on('transition', function (data) { return debug('MQTT State Machine: ' + data.fromState + ' -> ' + data.toState + ' (' + data.action + ')'); });
        return _this;
    }
    /**
     * @private
     *
     */
    Mqtt.prototype.setTransportOptions = function (options) {
        var _this = this;
        [
            'pollingInterval',
        ].forEach(function (optionName) {
            if (options.hasOwnProperty(optionName)) {
                _this._config[optionName] = options[optionName];
            }
        });
    };
    /**
     * @private
     */
    Mqtt.prototype.registrationRequest = function (request, callback) {
        var rid = uuid.v4();
        debug('registration request given id of: ' + rid);
        this._fsm.handle('registrationRequest', request, rid, function (err, result, pollingInterval) {
            if (err) {
                callback(err);
            }
            else {
                callback(null, result, null, pollingInterval);
            }
        });
    };
    /**
     * @private
     */
    Mqtt.prototype.queryOperationStatus = function (request, operationId, callback) {
        var rid = uuid.v4();
        debug('query operation request given id of: ' + rid);
        this._fsm.handle('queryOperationStatus', request, rid, operationId, function (err, result, pollingInterval) {
            if (err) {
                callback(err);
            }
            else {
                callback(null, result, null, pollingInterval);
            }
        });
    };
    /**
     * @private
     */
    Mqtt.prototype.cancel = function (callback) {
        this._fsm.handle('cancel', callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.disconnect = function (callback) {
        this._fsm.handle('disconnect', null, callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.setAuthentication = function (auth) {
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_001: [ The certificate and key passed as properties of the `auth` function shall be used to connect to the Device Provisioning Service.] */
        this._auth = auth;
    };
    /**
     * @private
     */
    Mqtt.prototype.setSharedAccessSignature = function (sas) {
        this._sas = sas;
    };
    Mqtt.prototype._getConnectionUri = function (request) {
        return 'mqtts://' + request.provisioningHost;
    };
    Mqtt.prototype._connect = function (request, callback) {
        var _this = this;
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_037: [ When connecting, `Mqtt` shall pass in the `X509` certificate that was passed into `setAuthentication` in the base `TransportConfig` object.] */
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_050: [ When connecting, `Mqtt` shall set `uri` in the base `TransportConfig` object to the 'mqtts://' + `provisioningDeviceHost`.] */
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_035: [ When connecting, `Mqtt` shall set `clientId` in the base `registrationRequest` object to the registrationId.] */
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_036: [ When connecting, `Mqtt` shall set the `clean` flag in the base `TransportConfig` object to true.] */
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_038: [ When connecting, `Mqtt` shall set the `username` in the base `TransportConfig` object to '<idScope>/registrations/<registrationId>/api-version=<apiVersion>&clientVersion=<UrlEncode<userAgent>>'.] */
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_039: [ If a uri is specified in the request object, `Mqtt` shall set it in the base `TransportConfig` object.] */
        var baseConfig = {
            clientId: request.registrationId,
            clean: true,
            x509: this._auth,
            sharedAccessSignature: this._sas,
            username: request.idScope + '/registrations/' + request.registrationId + '/api-version=' + azure_iot_provisioning_device_1.ProvisioningDeviceConstants.apiVersion + '&ClientVersion=' + encodeURIComponent(azure_iot_provisioning_device_1.ProvisioningDeviceConstants.userAgent),
            uri: this._getConnectionUri(request)
        };
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_040: [ When connecting, `Mqtt` shall call `_mqttBase.connect`.] */
        this._mqttBase.connect(baseConfig, function (err) {
            if (err) {
                /* Codes_SRS_NODE_PROVISIONING_MQTT_18_041: [ If an error is returned from `_mqttBase.connect`, `Mqtt` shall call `callback` passing in the error.] */
                debug('connect error: ' + err.toString());
                callback(err);
            }
            else {
                /* Codes_SRS_NODE_PROVISIONING_MQTT_18_042: [ After connecting the transport, `Mqtt` will subscribe to '$dps/registrations/res/#'  by calling `_mqttBase.subscribe`.] */
                _this._mqttBase.subscribe(responseTopic, { qos: 1 }, function (err) {
                    if (err) {
                        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_043: [ If an error is returned from _mqttBase.subscribe, `Mqtt` shall call `callback` passing in the error.] */
                        debug('subscribe error: ' + err.toString());
                        callback(err);
                    }
                    else {
                        _this._subscribed = true;
                        debug('connected and subscribed successfully');
                        callback();
                    }
                });
            }
        });
    };
    Mqtt.prototype._disconnect = function (callback) {
        var _this = this;
        var disconnect = function (unsubscribeError) {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_045: [ When Disconnecting, `Mqtt` shall call `_mqttBase.disconnect`.] */
            _this._mqttBase.disconnect(function (disconnectError) {
                if (disconnectError) {
                    debug('error disconnecting: ' + disconnectError.toString());
                }
                /* Codes_SRS_NODE_PROVISIONING_MQTT_18_048: [ If either `_mqttBase.unsubscribe` or `_mqttBase.disconnect` fails, `Mqtt` shall call the disconnect `callback` with the failing error, giving preference to the disconnect error.] */
                callback(disconnectError || unsubscribeError);
            });
        };
        if (this._subscribed) {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_044: [ When Disconnecting, `Mqtt` shall call _`mqttBase.unsubscribe`.] */
            this._mqttBase.unsubscribe(responseTopic, function (unsubscribeError) {
                _this._subscribed = false;
                if (unsubscribeError) {
                    debug('error unsubscribing: ' + unsubscribeError.toString());
                }
                disconnect(unsubscribeError);
            });
        }
        else {
            disconnect();
        }
    };
    Mqtt.prototype._sendRegistrationRequest = function (request, rid, callback) {
        var _this = this;
        /*Codes_SRS_NODE_PROVISIONING_MQTT_06_001: [The `registrationRequest` will send a body in the message which contains a stringified JSON object with a `registrationId` property.] */
        var requestBody = { registrationId: request.registrationId };
        /*Codes_SRS_NODE_PROVISIONING_MQTT_06_002: [The `registrationRequest` will, if utilizing custom allocation data, send a `payload` property in the JSON body.] */
        if (request.payload) {
            requestBody.payload = request.payload;
        }
        debug('registration publish: ' + '$dps/registrations/PUT/iotdps-register/?$rid=' + rid + ' body: ' + JSON.stringify(requestBody));
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_003: [ `registrationRequest` shall publish to '$dps/registrations/PUT/iotdps-register/?$rid<rid>'.] */
        this._mqttBase.publish('$dps/registrations/PUT/iotdps-register/?$rid=' + rid, JSON.stringify(requestBody), { qos: 1 }, function (err) {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_004: [ If the publish fails, `registrationRequest` shall call `callback` passing in the error.] */
            if (err) {
                debug('received an error from the registration publish: ' + err.name);
                delete _this._operations[rid];
                callback(err);
            }
        });
    };
    Mqtt.prototype._sendOperationStatusQuery = function (request, rid, operationId, callback) {
        var _this = this;
        debug('operationStatus publish ' + '$dps/registrations/GET/iotdps-get-operationstatus/?$rid=' + rid + '&operationId=' + operationId);
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_017: [ `queryOperationStatus` shall publish to $dps/registrations/GET/iotdps-get-operationstatus/?$rid=<rid>&operationId=<operationId>.] */
        this._mqttBase.publish('$dps/registrations/GET/iotdps-get-operationstatus/?$rid=' + rid + '&operationId=' + operationId, ' ', { qos: 1 }, function (err) {
            if (err) {
                debug('received an error from the operationStatus publish: ' + err.name);
                /* Codes_SRS_NODE_PROVISIONING_MQTT_18_018: [ If the publish fails, `queryOperationStatus` shall call `callback` passing in the error */
                delete _this._operations[rid];
                callback(err);
            }
        });
    };
    /**
     * @private
     */
    Mqtt.prototype._cancelAllOperations = function () {
        var _loop_1 = function (op) {
            debug('cancelling ' + op);
            var callback = this_1._operations[op].handler;
            delete this_1._operations[op];
            process.nextTick(function () {
                callback(new azure_iot_common_1.errors.OperationCancelledError());
            });
        };
        var this_1 = this;
        for (var op in this._operations) {
            _loop_1(op);
        }
    };
    return Mqtt;
}(events_1.EventEmitter));
exports.Mqtt = Mqtt;
//# sourceMappingURL=mqtt.js.map