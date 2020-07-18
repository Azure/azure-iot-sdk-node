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
var machina = require("machina");
var dbg = require("debug");
var debug = dbg('azure-iot-mqtt-base:MqttBase');
var azure_iot_common_1 = require("azure-iot-common");
/*Codes_SRS_NODE_COMMON_MQTT_BASE_16_004: [The `MqttBase` constructor shall instanciate the default MQTT.JS library if no argument is passed to it.]*/
/*Codes_SRS_NODE_COMMON_MQTT_BASE_16_005: [The `MqttBase` constructor shall use the object passed as argument instead of the default MQTT.JS library if it's not falsy.]*/
/**
 * @private
 */
var MqttBase = /** @class */ (function (_super) {
    __extends(MqttBase, _super);
    function MqttBase(mqttprovider) {
        var _this = _super.call(this) || this;
        _this.mqttprovider = mqttprovider ? mqttprovider : require('mqtt');
        _this._fsm = new machina.Fsm({
            namespace: 'mqtt-base',
            initialState: 'disconnected',
            states: {
                disconnected: {
                    _onEnter: function (callback, err) {
                        if (_this._mqttClient) {
                            _this._mqttClient.removeAllListeners();
                            _this._mqttClient = undefined;
                        }
                        if (callback) {
                            callback(err);
                        }
                        else {
                            if (err) {
                                _this.emit('error', err);
                            }
                        }
                    },
                    connect: function (callback) { return _this._fsm.transition('connecting', callback); },
                    disconnect: function (callback) { return callback(); },
                    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_020: [The `publish` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`.]*/
                    publish: function (topic, payload, options, callback) { return callback(new azure_iot_common_1.errors.NotConnectedError()); },
                    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_026: [The `subscribe` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`.]*/
                    subscribe: function (topic, options, callback) { return callback(new azure_iot_common_1.errors.NotConnectedError()); },
                    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_027: [The `unsubscribe` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`.]*/
                    unsubscribe: function (topic, callback) { return callback(new azure_iot_common_1.errors.NotConnectedError()); },
                    updateSharedAccessSignature: function (callback) {
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_034: [The `updateSharedAccessSignature` method shall not trigger any network activity if the mqtt client is not connected.]*/
                        debug('updating shared access signature while disconnected');
                        callback();
                    }
                },
                connecting: {
                    _onEnter: function (connectCallback) {
                        _this._connectClient(function (err, connack) {
                            if (err) {
                                _this._fsm.transition('disconnected', connectCallback, err);
                            }
                            else {
                                _this._fsm.transition('connected', connectCallback, connack);
                            }
                        });
                    },
                    disconnect: function (callback) {
                        _this._fsm.transition('disconnecting', callback);
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                connected: {
                    _onEnter: function (connectCallback, conack) {
                        _this._mqttClient.on('close', function () {
                            debug('close event received from mqtt.js client - no error');
                            _this._fsm.handle('closeEvent');
                        });
                        connectCallback(null, new azure_iot_common_1.results.Connected(conack));
                    },
                    connect: function (callback) { return callback(null, new azure_iot_common_1.results.Connected()); },
                    disconnect: function (callback) { return _this._fsm.transition('disconnecting', callback); },
                    publish: function (topic, payload, options, callback) {
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_017: [The `publish` method publishes a `payload` on a `topic` using `options`.]*/
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_021: [The  `publish` method shall call `publish` on the mqtt client object and call the `callback` argument with `null` and the `puback` object if it succeeds.]*/
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_022: [The `publish` method shall call the `callback` argument with an Error if the operation fails.]*/
                        _this._mqttClient.publish(topic, payload, options, callback);
                    },
                    subscribe: function (topic, options, callback) {
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_12_008: [The `subscribe` method shall call `subscribe`  on MQTT.JS  library and pass it the `topic` and `options` arguments.]*/
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_024: [The `subscribe` method shall call the callback with `null` and the `suback` object if the mqtt library successfully subscribes to the `topic`.]*/
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_025: [The `subscribe` method shall call the callback with an `Error` if the mqtt library fails to subscribe to the `topic`.]*/
                        _this._mqttClient.subscribe(topic, options, callback);
                    },
                    unsubscribe: function (topic, callback) {
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_028: [The `unsubscribe` method shall call `unsubscribe` on the mqtt library and pass it the `topic`.]*/
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_029: [The `unsubscribe` method shall call the `callback` argument with no arguments if the operation succeeds.]*/
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_030: [The `unsubscribe` method shall call the `callback` argument with an `Error` if the operation fails.]*/
                        _this._mqttClient.unsubscribe(topic, callback);
                    },
                    updateSharedAccessSignature: function (callback) {
                        _this._fsm.transition('reconnecting', callback);
                    },
                    closeEvent: function () {
                        _this._fsm.transition('disconnected', undefined, new azure_iot_common_1.errors.NotConnectedError('Connection to the server has been closed.'));
                    }
                },
                disconnecting: {
                    _onEnter: function (disconnectCallback, err) {
                        _this._disconnectClient(!!err, function () {
                            _this._fsm.transition('disconnected', disconnectCallback, err);
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                reconnecting: {
                    _onEnter: function (callback) {
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_033: [The `updateSharedAccessSignature` method shall disconnect and reconnect the mqtt client with the new `sharedAccessSignature`.]*/
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_035: [The `updateSharedAccessSignature` method shall call the `callback` argument with no parameters if the operation succeeds.]*/
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_036: [The `updateSharedAccessSignature` method shall call the `callback` argument with an `Error` if the operation fails.]*/
                        debug('disconnecting mqtt client');
                        _this._disconnectClient(false, function () {
                            debug('mqtt client disconnected - reconnecting');
                            _this._connectClient(function (err, connack) {
                                if (err) {
                                    debug('failed to reconnect the client: ' + err.toString());
                                    _this._fsm.transition('disconnected', callback, err);
                                }
                                else {
                                    debug('mqtt client reconnected successfully');
                                    _this._fsm.transition('connected', callback, connack);
                                }
                            });
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                }
            }
        });
        _this._fsm.on('transition', function (data) {
            debug(data.fromState + ' -> ' + data.toState + ' (' + data.action + ')');
        });
        return _this;
    }
    MqttBase.prototype.connect = function (config, done) {
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_006: [The `connect` method shall throw a ReferenceError if the config argument is falsy, or if one of the following properties of the config argument is falsy: uri, clientId, username, and one of sharedAccessSignature or x509.cert and x509.key.]*/
        if ((!config) ||
            (!config.uri) ||
            (!config.clientId) ||
            (!config.username) ||
            (!config.sharedAccessSignature && (!config.x509 || !config.x509.cert || !config.x509.key))) {
            throw new ReferenceError('Invalid transport configuration');
        }
        this._config = config;
        this._fsm.handle('connect', done);
    };
    MqttBase.prototype.disconnect = function (done) {
        this._fsm.handle('disconnect', done);
    };
    MqttBase.prototype.publish = function (topic, payload, options, done) {
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_018: [The `publish` method shall throw a `ReferenceError` if the topic is falsy.]*/
        if (!topic) {
            throw new ReferenceError('Invalid topic');
        }
        this._fsm.handle('publish', topic, payload, options, done);
    };
    MqttBase.prototype.subscribe = function (topic, options, callback) {
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_023: [The `subscribe` method shall throw a `ReferenceError` if the topic is falsy.]*/
        if (!topic) {
            throw new ReferenceError('Topic cannot be \'' + topic + '\'');
        }
        this._fsm.handle('subscribe', topic, options, callback);
    };
    MqttBase.prototype.unsubscribe = function (topic, callback) {
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_031: [The `unsubscribe` method shall throw a `ReferenceError` if the `topic` argument is falsy.]*/
        if (!topic) {
            throw new ReferenceError('Topic cannot be \'' + topic + '\'');
        }
        this._fsm.handle('unsubscribe', topic, callback);
    };
    MqttBase.prototype.updateSharedAccessSignature = function (sharedAccessSignature, callback) {
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_032: [The `updateSharedAccessSignature` method shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
        if (!sharedAccessSignature) {
            throw new ReferenceError('sharedAccessSignature cannot be \'' + sharedAccessSignature + '\'');
        }
        this._config.sharedAccessSignature = sharedAccessSignature;
        this._fsm.handle('updateSharedAccessSignature', callback);
    };
    /**
     * @private
     */
    MqttBase.prototype.setOptions = function (options) {
        this._options = options;
    };
    MqttBase.prototype._connectClient = function (callback) {
        var _this = this;
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_002: [The `connect` method shall use the authentication parameters contained in the `config` argument to connect to the server.]*/
        var options = {
            protocolId: 'MQTT',
            protocolVersion: 4,
            clean: this._config.clean || false,
            clientId: this._config.clientId,
            rejectUnauthorized: true,
            username: this._config.username,
            reconnectPeriod: 0,
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_016: [The `connect` method shall configure the `keepalive` ping interval to 3 minutes by default since the Azure Load Balancer TCP Idle timeout default is 4 minutes.]*/
            keepalive: 180,
            reschedulePings: false
        };
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_18_001: [The `connect` method shall set the `ca` option based on the `ca` string passed in the `options` structure via the `setOptions` function.]*/
        if (this._options) {
            if (this._options.ca) {
                options.ca = this._options.ca;
            }
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_41_001: [The `connect` method shall set the `keepalive` option based on the `keepalive` numeric value passed in the `options` structure via the `setOptions` function.]*/
            if (this._options.keepalive) {
                options.keepalive = this._options.keepalive;
            }
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_18_002: [The `connect` method shall set the `wsOptions.agent` option based on the `mqtt.webSocketAgent` object passed in the `options` structure via the `setOptions` function.]*/
            if (this._options.mqtt && this._options.mqtt.webSocketAgent) {
                options.wsOptions = {
                    agent: this._options.mqtt.webSocketAgent
                };
            }
        }
        if (this._config.sharedAccessSignature) {
            options.password = this._config.sharedAccessSignature.toString();
            debug('username: ' + options.username);
            debug('uri:      ' + this._config.uri);
        }
        else {
            options.cert = this._config.x509.cert;
            options.key = this._config.x509.key;
            options.passphrase = this._config.x509.passphrase; // forced to cast to any because passphrase is used by tls options but not surfaced by the types definition.
        }
        var createErrorCallback = function (eventName) {
            return function (error) {
                debug('received \'' + eventName + '\' from mqtt client');
                var err = error || new azure_iot_common_1.errors.NotConnectedError('Unable to establish a connection');
                callback(err);
            };
        };
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_003: [The `connect` method shall call the `done` callback with a standard javascript `Error` object if the connection failed.]*/
        var errorCallback = createErrorCallback('error');
        var closeCallback = createErrorCallback('close');
        var offlineCallback = createErrorCallback('offline');
        var disconnectCallback = createErrorCallback('disconnect');
        var messageCallback = function (topic, payload) {
            process.nextTick(function () {
                _this.emit('message', topic, payload);
            });
        };
        this._mqttClient = this.mqttprovider.connect(this._config.uri, options);
        this._mqttClient.on('message', messageCallback);
        this._mqttClient.on('error', errorCallback);
        this._mqttClient.on('close', closeCallback);
        this._mqttClient.on('offline', offlineCallback);
        this._mqttClient.on('disconnect', disconnectCallback);
        this._mqttClient.on('connect', function (connack) {
            debug('Device is connected');
            debug('CONNACK: ' + JSON.stringify(connack));
            _this._mqttClient.removeListener('close', closeCallback);
            _this._mqttClient.removeListener('offline', offlineCallback);
            _this._mqttClient.removeListener('disconnect', disconnectCallback);
            callback(null, connack);
        });
    };
    MqttBase.prototype._disconnectClient = function (forceDisconnect, callback) {
        this._mqttClient.removeAllListeners();
        /* Codes_SRS_NODE_COMMON_MQTT_BASE_16_001: [The disconnect method shall call the done callback when the connection to the server has been closed.] */
        this._mqttClient.end(forceDisconnect, callback);
    };
    return MqttBase;
}(events_1.EventEmitter));
exports.MqttBase = MqttBase;
//# sourceMappingURL=mqtt_base.js.map