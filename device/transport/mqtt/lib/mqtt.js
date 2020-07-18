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
var querystring = require("querystring");
var URL = require("url");
var machina = require("machina");
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_device_1 = require("azure-iot-device");
var events_1 = require("events");
var util = require("util");
var dbg = require("debug");
var debug = dbg('azure-iot-device-mqtt:Mqtt');
var azure_iot_mqtt_base_1 = require("azure-iot-mqtt-base");
var mqtt_twin_client_1 = require("./mqtt_twin_client");
var TOPIC_RESPONSE_PUBLISH_FORMAT = '$iothub/%s/res/%d/?$rid=%s';
/**
 * @class        module:azure-iot-device-mqtt.Mqtt
 * @classdesc    Provides MQTT transport for the device [client]{@link module:azure-iot-device.Client} class.
 *
 * This class is not meant to be used directly, instead it should just be passed to the [client]{@link module:azure-iot-device.Client} object.
 *
 * @param   {Object}    config  Configuration object derived from the connection string by the client.
 */
/*
 Codes_SRS_NODE_DEVICE_MQTT_12_001: [The `Mqtt` constructor shall accept the transport configuration structure
 Codes_SRS_NODE_DEVICE_MQTT_12_002: [The `Mqtt` constructor shall store the configuration structure in a member variable
 Codes_SRS_NODE_DEVICE_MQTT_12_003: [The Mqtt constructor shall create an base transport object and store it in a member variable.]
*/
var Mqtt = /** @class */ (function (_super) {
    __extends(Mqtt, _super);
    /**
     * @private
     */
    function Mqtt(authenticationProvider, mqttBase) {
        var _this = _super.call(this) || this;
        _this._mid = '';
        _this._authenticationProvider = authenticationProvider;
        /*Codes_SRS_NODE_DEVICE_MQTT_16_071: [The constructor shall subscribe to the `newTokenAvailable` event of the `authenticationProvider` passed as an argument if it uses tokens for authentication.]*/
        if (_this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.Token) {
            _this._authenticationProvider.on('newTokenAvailable', function (newCredentials) {
                /*Codes_SRS_NODE_DEVICE_MQTT_16_072: [If the `newTokenAvailable` event is fired, the `Mqtt` object shall do nothing if it isn't connected.]*/
                /*Codes_SRS_NODE_DEVICE_MQTT_16_073: [If the `newTokenAvailable` event is fired, the `Mqtt` object shall call `updateSharedAccessSignature` on the `mqttBase` object if it is connected.]*/
                _this._fsm.handle('updateSharedAccessSignature', newCredentials.sharedAccessSignature, function (err) {
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_074: [If updating the shared access signature fails when the `newTokenAvailable` event is fired, the `Mqtt` state machine shall fire a `disconnect` event.]*/
                    if (err) {
                        _this.emit('disconnect', err);
                    }
                });
            });
        }
        /* Codes_SRS_NODE_DEVICE_MQTT_18_025: [ If the Mqtt constructor receives a second parameter, it shall be used as a mqttBase in place of mqtt.js ]*/
        if (mqttBase) {
            _this._mqtt = mqttBase;
        }
        else {
            _this._mqtt = new azure_iot_mqtt_base_1.MqttBase();
        }
        /* Codes_SRS_NODE_DEVICE_MQTT_18_026: When MqttTransport fires the close event, the Mqtt object shall emit a disconnect event */
        _this._mqtt.on('error', function (err) {
            debug('on close');
            _this._fsm.handle('disconnect', function () {
                _this.emit('disconnect', err);
            });
        });
        _this._mqtt.on('message', _this._dispatchMqttMessage.bind(_this));
        _this._twinClient = new mqtt_twin_client_1.MqttTwinClient(_this._mqtt);
        /*Codes_SRS_NODE_DEVICE_MQTT_16_081: [The `Mqtt` constructor shall subscribe to the `MqttTwinClient` `twinDesiredPropertiesUpdates`.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_16_082: [A `twinDesiredPropertiesUpdates` shall be emitted by the `Mqtt` object for each `twinDesiredPropertiesUpdates` event received from the `MqttTwinClient` with the same payload. **/
        _this._twinClient.on('twinDesiredPropertiesUpdate', function (patch) { return _this.emit('twinDesiredPropertiesUpdate', patch); });
        _this._fsm = new machina.Fsm({
            initialState: 'disconnected',
            states: {
                disconnected: {
                    _onEnter: function (disconnectedCallback, err, result) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_085: [Once the MQTT transport is disconnected and if it is using a token authentication provider, the `stop` method of the `AuthenticationProvider` object shall be called to stop any running timer.]*/
                        if (_this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.Token) {
                            _this._authenticationProvider.stop();
                        }
                        if (disconnectedCallback) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_019: [The `connect` method shall calls its callback with an `Error` that has been translated from the `MqttBase` error using the `translateError` method if it fails to establish a connection.]*/
                                disconnectedCallback(azure_iot_mqtt_base_1.translateError(err));
                            }
                            else {
                                disconnectedCallback(undefined, result);
                            }
                        }
                        else {
                            /* Codes_SRS_NODE_DEVICE_MQTT_18_026: When MqttTransport fires the close event, the Mqtt object shall emit a disconnect event */
                            _this.emit('disconnect', err);
                        }
                    },
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_021: [The `disconnect` method shall call its callback immediately with a `null` argument and a `results.Disconnected` second argument if `MqttBase` is already disconnected.]*/
                    disconnect: function (callback) { return callback(null, new azure_iot_common_1.results.Disconnected()); },
                    connect: function (callback) {
                        _this._fsm.transition('connecting', callback);
                    },
                    sendEvent: function (message, outputProps, sendEventCallback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_023: [The `sendEvent` method shall connect the Mqtt connection if it is disconnected.]*/
                        /*Codes_SRS_NODE_DEVICE_MQTT_18_045: [The `sendOutputEvent` method shall connect the Mqtt connection if it is disconnected. ]*/
                        _this._fsm.handle('connect', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_024: [The `sendEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to establish a connection.]*/
                                /*Codes_SRS_NODE_DEVICE_MQTT_18_046: [The `sendOutputEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to establish a connection. ]*/
                                sendEventCallback(azure_iot_mqtt_base_1.translateError(err));
                            }
                            else {
                                _this._fsm.handle('sendEvent', message, outputProps, sendEventCallback);
                            }
                        });
                    },
                    updateSharedAccessSignature: function (sharedAccessSignature, callback) { callback(null, new azure_iot_common_1.results.SharedAccessSignatureUpdated(false)); },
                    sendMethodResponse: function (response, callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_034: [The `sendMethodResponse` method shall fail with a `NotConnectedError` if the `MqttBase` object is not connected.]*/
                        callback(new azure_iot_common_1.errors.NotConnectedError('device disconnected: the service already considers the method has failed'));
                    },
                    getTwin: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_075: [`getTwin` shall establish the MQTT connection by calling `connect` on the `MqttBase` object if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_076: [`getTwin` shall call its callback with an error if it fails to connect the transport]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('getTwin', callback);
                            }
                        });
                    },
                    updateTwinReportedProperties: function (patch, callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_078: [`updateTwinReportedProperties` shall establish the MQTT connection by calling `connect` on the `MqttBase` object if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_079: [`updateTwinReportedProperties` shall call its callback with an error if it fails to connect the transport]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('updateTwinReportedProperties', patch, callback);
                            }
                        });
                    },
                    enableC2D: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_047: [`enableC2D` shall connect the MQTT connection if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_048: [`enableC2D` shall calls its callback with an `Error` object if it fails to connect.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('enableC2D', callback);
                            }
                        });
                    },
                    enableMethods: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_038: [`enableMethods` shall connect the MQTT connection if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_039: [`enableMethods` shall calls its callback with an `Error` object if it fails to connect.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('enableMethods', callback);
                            }
                        });
                    },
                    enableInputMessages: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_18_059: [ `enableInputMessages` shall connect the MQTT connection if it is disconnected. ]*/
                        _this._fsm.handle('connect', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_18_060: [ `enableInputMessages` shall calls its callback with an `Error` object if it fails to connect. ]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('enableInputMessages', callback);
                            }
                        });
                    },
                    disableC2D: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_041: [`disableC2D` shall call its callback immediately if the MQTT connection is already disconnected.]*/
                        callback();
                    },
                    disableMethods: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_044: [`disableMethods` shall call its callback immediately if the MQTT connection is already disconnected.]*/
                        callback();
                    },
                    enableTwinDesiredPropertiesUpdates: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_057: [`enableTwinDesiredPropertiesUpdates` shall connect the MQTT connection if it is disconnected.]*/
                        _this._fsm.handle('connect', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_058: [`enableTwinDesiredPropertiesUpdates` shall calls its callback with an `Error` object if it fails to connect.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('enableTwinDesiredPropertiesUpdates', callback);
                            }
                        });
                    },
                    disableTwinDesiredPropertiesUpdates: function (callback) { return callback(); },
                    disableInputMessages: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_18_064: [ `disableInputMessages` shall call its callback immediately if the MQTT connection is already disconnected. ]*/
                        callback();
                    },
                },
                connecting: {
                    _onEnter: function (connectCallback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_067: [The `connect` method shall call the `getDeviceCredentials` method of the `AuthenticationProvider` object passed to the constructor to obtain the credentials of the device.]*/
                        _this._authenticationProvider.getDeviceCredentials(function (err, credentials) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_068: [The `connect` method shall call its callback with the error returned by `getDeviceCredentials` if it fails to return the device credentials.]*/
                                _this._fsm.transition('disconnected', connectCallback, err);
                            }
                            else {
                                _this._configureEndpoints(credentials);
                                _this._ensureAgentString(function () {
                                    var baseConfig = _this._getBaseTransportConfig(credentials);
                                    _this._mqtt.connect(baseConfig, function (err, result) {
                                        debug('connect');
                                        if (err) {
                                            _this._fsm.transition('disconnected', connectCallback, err);
                                        }
                                        else {
                                            _this._fsm.transition('connected', connectCallback, result);
                                        }
                                    });
                                });
                            }
                        });
                    },
                    disconnect: function (disconnectCallback) {
                        _this._fsm.transition('disconnecting', disconnectCallback);
                    },
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_025: [If `sendEvent` is called while `MqttBase` is establishing the connection, it shall wait until the connection is established and then send the event.]*/
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_035: [If `sendEvent` is called while `MqttBase` is establishing the connection, and `MqttBase` fails to establish the connection, then sendEvent shall fail.]*/
                    /*Codes_SRS_NODE_DEVICE_MQTT_18_047: [If `sendOutputEvent` is called while `MqttBase` is establishing the connection, it shall wait until the connection is established and then send the event. ]*/
                    /*Codes_SRS_NODE_DEVICE_MQTT_18_048: [If `sendOutputEvent` is called while `MqttBase` is establishing the connection, and `MqttBase` fails to establish the connection, then sendEvent shall fail. ]*/
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                connected: {
                    _onEnter: function (connectedCallback, connectResult) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_020: [The `connect` method shall call its callback with a `null` error parameter and a `results.Connected` response if `MqttBase` successfully connects.]*/
                        if (connectedCallback)
                            connectedCallback(null, new azure_iot_common_1.results.Connected(connectResult));
                    },
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_018: [The `connect` method shall call its callback immediately if `MqttBase` is already connected.]*/
                    connect: function (connectCallback) { return connectCallback(null, new azure_iot_common_1.results.Connected()); },
                    disconnect: function (disconnectCallback) {
                        _this._fsm.transition('disconnecting', disconnectCallback);
                    },
                    sendEvent: function (message, outputProps, sendEventCallback) {
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_008: [The `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`.]*/
                        var topic = _this._getEventTopicFromMessage(message, outputProps);
                        if (outputProps) {
                            topic += '/';
                        }
                        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_010: [** The `sendEvent` method shall use QoS level of 1.]*/
                        _this._mqtt.publish(topic, message.data, { qos: 1, retain: false }, function (err, result) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_027: [The `sendEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to publish the message.]*/
                                /*Codes_SRS_NODE_DEVICE_MQTT_18_050: [The `sendOutputEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to publish the message. ]*/
                                sendEventCallback(azure_iot_mqtt_base_1.translateError(err));
                            }
                            else {
                                /*Codes_SRS_NODE_DEVICE_MQTT_41_004 [ The `sendEvent` method shall call its callback with a `MessageEnqueued` ]*/
                                /*Codes_SRS_NODE_DEVICE_MQTT_41_005 [ The `sendOutputEvent` method shall call its callback with a `MessageEnqueued` ]*/
                                sendEventCallback(null, new azure_iot_common_1.results.MessageEnqueued(result));
                            }
                        });
                    },
                    updateSharedAccessSignature: function (sharedAccessSignature, callback) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_028: [The `updateSharedAccessSignature` method shall call the `updateSharedAccessSignature` method on the `MqttBase` object if it is connected.]*/
                        _this._mqtt.updateSharedAccessSignature(sharedAccessSignature, function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_009: [The `updateSharedAccessSignature` method shall call the `done` method with an `Error` object if `MqttBase.updateSharedAccessSignature` fails.]*/
                                _this._fsm.transition('disconnected', callback, err);
                            }
                            else {
                                /*Codes_SRS_NODE_DEVICE_MQTT_16_010: [The `updateSharedAccessSignature` method shall call the `done` callback with a `null` error object and a `SharedAccessSignatureUpdated` object with its `needToReconnect` property set to `false`, if `MqttBase.updateSharedAccessSignature` succeeds.]*/
                                callback(null, new azure_iot_common_1.results.SharedAccessSignatureUpdated(false));
                            }
                        });
                    },
                    sendMethodResponse: function (response, callback) {
                        // Codes_SRS_NODE_DEVICE_MQTT_13_002: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <STATUS> is response.status. ]
                        // Codes_SRS_NODE_DEVICE_MQTT_13_003: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <REQUEST ID> is response.requestId. ]
                        // Codes_SRS_NODE_DEVICE_MQTT_13_004: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <PROPERTIES> is URL encoded. ]
                        var topicName = util.format(TOPIC_RESPONSE_PUBLISH_FORMAT, 'methods', response.status, response.requestId);
                        debug('sending response using topic: ' + topicName);
                        debug(JSON.stringify(response.payload));
                        // publish the response message
                        _this._mqtt.publish(topicName, JSON.stringify(response.payload), { qos: 0, retain: false }, function (err) {
                            // Codes_SRS_NODE_DEVICE_MQTT_13_006: [ If the MQTT publish fails then an error shall be returned via the done callback's first parameter. ]
                            // Codes_SRS_NODE_DEVICE_MQTT_13_007: [ If the MQTT publish is successful then the done callback shall be invoked passing null for the first parameter. ]
                            callback(!!err ? azure_iot_mqtt_base_1.translateError(err) : null);
                        });
                    },
                    enableC2D: function (callback) {
                        _this._setupSubscription(_this._topics.message, 1, callback);
                    },
                    enableMethods: function (callback) {
                        _this._setupSubscription(_this._topics.method, 0, callback);
                    },
                    enableInputMessages: function (callback) {
                        _this._setupSubscription(_this._topics.inputMessage, 1, callback);
                    },
                    disableC2D: function (callback) {
                        _this._removeSubscription(_this._topics.message, callback);
                    },
                    disableMethods: function (callback) {
                        _this._removeSubscription(_this._topics.method, callback);
                    },
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_077: [`getTwin` shall call the `getTwin` method on the `MqttTwinClient` object and pass it its callback.]*/
                    getTwin: function (callback) { return _this._twinClient.getTwin(callback); },
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_080: [`updateTwinReportedProperties` shall call the `updateTwinReportedProperties` method on the `MqttTwinClient` object and pass it its callback.]*/
                    updateTwinReportedProperties: function (patch, callback) { return _this._twinClient.updateTwinReportedProperties(patch, callback); },
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_059: [`enableTwinDesiredPropertiesUpdates` shall call the `enableTwinDesiredPropertiesUpdates` on the `MqttTwinClient` object created by the constructor and pass it its callback.]*/
                    enableTwinDesiredPropertiesUpdates: function (callback) { return _this._twinClient.enableTwinDesiredPropertiesUpdates(callback); },
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_083: [`disableTwinDesiredPropertiesUpdates` shall call the `disableTwinDesiredPropertiesUpdates` on the `MqttTwinClient` object created by the constructor and pass it its callback.]*/
                    disableTwinDesiredPropertiesUpdates: function (callback) { return _this._twinClient.disableTwinDesiredPropertiesUpdates(callback); },
                    disableInputMessages: function (callback) {
                        _this._removeSubscription(_this._topics.inputMessage, callback);
                    },
                },
                disconnecting: {
                    _onEnter: function (disconnectCallback, err) {
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_001: [The `disconnect` method should call the `disconnect` method on `MqttBase`.]*/
                        /*Codes_SRS_NODE_DEVICE_MQTT_16_022: [The `disconnect` method shall call its callback with a `null` error parameter and a `results.Disconnected` response if `MqttBase` successfully disconnects if not disconnected already.]*/
                        _this._mqtt.disconnect(function (err, result) {
                            _this._fsm.transition('disconnected', disconnectCallback, err, new azure_iot_common_1.results.Disconnected(result));
                        });
                    },
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_026: [If `sendEvent` is called while `MqttBase` is disconnecting, it shall wait until the disconnection is complete and then try to connect again and send the event. ]*/
                    /*Codes_SRS_NODE_DEVICE_MQTT_18_049: [If `sendOutputEvent` is called while `MqttBase` is disconnecting, it shall wait until the disconnection is complete and then try to connect again and send the event. ]*/
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                }
            }
        });
        _this._fsm.on('transition', function (data) {
            debug(data.fromState + ' -> ' + data.toState + ' (' + data.action + ')');
        });
        return _this;
    }
    /**
     * @private
     * @method              module:azure-iot-device-mqtt.Mqtt#connect
     * @description         Establishes the connection to the Azure IoT Hub instance using the MQTT protocol.
     *
     * @param {Function}    done   callback that shall be called when the connection is established.
     */
    /* Codes_SRS_NODE_DEVICE_MQTT_12_004: [The connect method shall call the connect method on MqttTransport */
    Mqtt.prototype.connect = function (done) {
        this._fsm.handle('connect', done);
    };
    /**
     * @private
     * @method              module:azure-iot-device-mqtt.Mqtt#disconnect
     * @description         Terminates the connection to the IoT Hub instance.
     *
     * @param {Function}    done      Callback that shall be called when the connection is terminated.
     */
    /* Codes_SRS_NODE_DEVICE_MQTT_16_001: [The disconnect method should call the disconnect method on MqttTransport.] */
    Mqtt.prototype.disconnect = function (done) {
        this._fsm.handle('disconnect', done);
    };
    /**
     * @private
     * @method              module:azure-iot-device-mqtt.Mqtt#sendEvent
     * @description         Sends an event to the server.
     *
     * @param {Message}     message   Message used for the content of the event sent to the server.
     */
    /* Codes_SRS_NODE_DEVICE_MQTT_12_005: [The sendEvent method shall call the publish method on MqttTransport */
    Mqtt.prototype.sendEvent = function (message, done) {
        debug('sendEvent ' + JSON.stringify(message));
        this._fsm.handle('sendEvent', message, undefined, function (err, puback) {
            if (err) {
                debug('send error: ' + err.toString());
                done(err);
            }
            else {
                debug('PUBACK: ' + JSON.stringify(puback));
                done(null, puback);
            }
        });
    };
    /**
     * @private
     * @method             module:azure-iot-device-mqtt.Mqtt#sendEventBatch
     * @description        Not Implemented.
     * @param {Message[]}  messages    The [messages]{@linkcode module:common/message.Message}
     *                                 to be sent.
     * @param {Function}   done        The callback to be invoked when `sendEventBatch`
     *                                 completes execution.
     */
    Mqtt.prototype.sendEventBatch = function (messages, done) {
        /*Codes_SRS_NODE_DEVICE_MQTT_16_056: [The `sendEventBatch` method shall throw a `NotImplementedError`]*/
        throw new azure_iot_common_1.errors.NotImplementedError('MQTT Transport does not support batching yet');
    };
    /**
     * @private
     * @deprecated          // Implementation test belongs in the client.
     * @method              module:azure-iot-device-mqtt.Mqtt#complete
     * @description         Settles the message as complete and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as complete.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    Mqtt.prototype.complete = function (message, done) {
        /*Codes_SRS_NODE_DEVICE_MQTT_16_005: [The ‘complete’ method shall call the callback given as argument immediately since all messages are automatically completed.]*/
        done(null, new azure_iot_common_1.results.MessageCompleted());
    };
    /**
     * @private
     * @deprecated          // Implementation test belongs in the client.
     * @method              module:azure-iot-device-mqtt.Mqtt#reject
     * @description         Settles the message as rejected and calls the done callback with the result.
     *
     * @throws {Error}      The MQTT transport does not support rejecting messages.
     */
    Mqtt.prototype.reject = function () {
        /*Codes_SRS_NODE_DEVICE_MQTT_16_006: [The ‘reject’ method shall throw because MQTT doesn’t support rejecting messages.] */
        throw new azure_iot_common_1.errors.NotImplementedError('the MQTT transport does not support rejecting messages.');
    };
    /**
     * @private
     * @deprecated          // Implementation test belongs in the client.
     * @method              module:azure-iot-device-mqtt.Mqtt#abandon
     * @description         Settles the message as abandoned and calls the done callback with the result.
     *
     * @throws {Error}      The MQTT transport does not support abandoning messages.
     */
    Mqtt.prototype.abandon = function () {
        /*Codes_SRS_NODE_DEVICE_MQTT_16_004: [The ‘abandon’ method shall throw because MQTT doesn’t support abandoning messages.] */
        throw new azure_iot_common_1.errors.NotImplementedError('The MQTT transport does not support abandoning messages.');
    };
    /**
     * @private
     * @method          module:azure-iot-device-mqtt.Mqtt#updateSharedAccessSignature
     * @description     This methods sets the SAS token used to authenticate with the IoT Hub service.
     *
     * @param {String}        sharedAccessSignature  The new SAS token.
     * @param {Function}      done      The callback to be invoked when `updateSharedAccessSignature` completes.
     */
    Mqtt.prototype.updateSharedAccessSignature = function (sharedAccessSignature, done) {
        debug('updateSharedAccessSignature');
        /*Codes_SRS_NODE_DEVICE_MQTT_16_007: [The `updateSharedAccessSignature` method shall save the new shared access signature given as a parameter to its configuration.]*/
        this._authenticationProvider.updateSharedAccessSignature(sharedAccessSignature);
        this._fsm.handle('updateSharedAccessSignature', sharedAccessSignature, function (err, result) {
            done(err, result);
        });
    };
    /**
     * @private
     * @method          module:azure-iot-device-mqtt.Mqtt#setOptions
     * @description     This methods sets the MQTT specific options of the transport.
     *
     * @param {object}        options   Options to set.  Currently for MQTT these are the x509 cert, key, and optional passphrase properties. (All strings)
     * @param {Function}      done      The callback to be invoked when `setOptions` completes.
     */
    Mqtt.prototype.setOptions = function (options, done) {
        var _this = this;
        /*Codes_SRS_NODE_DEVICE_MQTT_16_011: [The `setOptions` method shall throw a `ReferenceError` if the `options` argument is falsy]*/
        if (!options)
            throw new ReferenceError('The options parameter can not be \'' + options + '\'');
        /*Codes_SRS_NODE_DEVICE_MQTT_16_015: [The `setOptions` method shall throw an `ArgumentError` if the `cert` property is populated but the device uses symmetric key authentication.]*/
        if (this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.Token && options.cert)
            throw new azure_iot_common_1.errors.ArgumentError('Cannot set x509 options on a device that uses token authentication.');
        if (options.modelId) {
            this._mid = '&digital-twin-model-id=' + options.modelId;
        }
        /*Codes_SRS_NODE_DEVICE_MQTT_41_001: [The MQTT transport should use the productInfo string in the `options` object if present]*/
        if (options.productInfo) {
            // To enforce proper use of the productInfo option, if the setOption is called after HTTP calls have already been made (therefore _userAgentString already set) an error is thrown.
            if (this._userAgentString) {
                /*Codes_SRS_NODE_DEVICE_MQTT_41_003: [`productInfo` must be set before `mqtt._ensureAgentString` is invoked for the first time]*/
                throw Error('Ensure you call setOption for productInfo before initiating any connection to IoT Hub');
            }
            else {
                this._productInfo = options.productInfo;
            }
        }
        /* Codes_SRS_NODE_DEVICE_MQTT_06_001: [The `setOptions` method shall throw an `InvalidOperationError` if the method is called with token renewal options while using using cert or non renewal authentication.] */
        if (options.tokenRenewal) {
            if (this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.X509) {
                throw new azure_iot_common_1.errors.InvalidOperationError('cannot set token renewal options when using X509 authentication');
            }
            else if (!this._authenticationProvider.setTokenRenewalValues) {
                throw new azure_iot_common_1.errors.InvalidOperationError('can only set token renewal options when using pre-shared key authentication');
            }
            else {
                /* Codes_SRS_NODE_DEVICE_MQTT_06_002: [The authentication providers `setTokenRenewalValues` method shall be invoked with the values provided in the tokenRenewal option.] */
                this._authenticationProvider.setTokenRenewalValues(options.tokenRenewal.tokenValidTimeInSeconds, options.tokenRenewal.tokenRenewalMarginInSeconds);
            }
        }
        this._mqtt.setOptions(options);
        if (!options.cert) {
            if (done)
                done(null);
        }
        else {
            /*Codes_SRS_NODE_DEVICE_MQTT_16_069: [The `setOptions` method shall obtain the current credentials by calling `getDeviceCredentials` on the `AuthenticationProvider` passed to the constructor as an argument.]*/
            this._authenticationProvider.getDeviceCredentials(function (err, credentials) {
                if (err) {
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_070: [The `setOptions` method shall call its callback with the error returned by `getDeviceCredentials` if it fails to return the credentials.]*/
                    if (done)
                        done(err);
                }
                else {
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_012: [The `setOptions` method shall update the existing configuration of the MQTT transport with the content of the `options` object.]*/
                    _this._authenticationProvider.setX509Options(options);
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_013: [If a `done` callback function is passed as a argument, the `setOptions` method shall call it when finished with no arguments.]*/
                    /*Codes_SRS_NODE_DEVICE_MQTT_16_014: [The `setOptions` method shall not throw if the `done` argument is not passed.]*/
                    if (done)
                        done(null);
                }
            });
        }
    };
    /**
     * @private
     * @method            module:azure-iot-device-mqtt.Mqtt.Mqtt#sendMethodResponse
     * @description       Sends the response for a device method call to the service.
     *
     * @param {Object}   response     This is the `response` object that was
     *                                produced by the device client object when a
     *                                C2D device method call was received.
     * @param {Function} done         The callback to be invoked when the response
     *                                has been sent to the service.
     *
     * @throws {Error}                If the `response` parameter is falsy or does
     *                                not have the expected shape.
     */
    Mqtt.prototype.sendMethodResponse = function (response, done) {
        // Codes_SRS_NODE_DEVICE_MQTT_13_001: [ sendMethodResponse shall throw an Error if response is falsy or does not conform to the shape defined by DeviceMethodResponse. ]
        if (!response) {
            throw new Error('Parameter \'response\' is falsy');
        }
        if (!response.requestId) {
            throw new Error('Parameter \'response.requestId\' is falsy');
        }
        if (typeof (response.requestId) !== 'string') {
            throw new Error('Parameter \'response.requestId\' is not a string.');
        }
        if (!response.status) {
            throw new Error('Parameter \'response.status\' is falsy');
        }
        if (typeof (response.status) !== 'number') {
            throw new Error('Parameter \'response.status\' is not a number');
        }
        this._fsm.handle('sendMethodResponse', response, done);
    };
    /**
     * @private
     */
    Mqtt.prototype.onDeviceMethod = function (methodName, callback) {
        /*Codes_SRS_NODE_DEVICE_MQTT_16_066: [The `methodCallback` parameter shall be called whenever a `method_<methodName>` is emitted and device methods have been enabled.]*/
        this.on('method_' + methodName, callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.enableC2D = function (callback) {
        this._fsm.handle('enableC2D', callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.disableC2D = function (callback) {
        this._fsm.handle('disableC2D', callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.enableInputMessages = function (callback) {
        this._fsm.handle('enableInputMessages', callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.disableInputMessages = function (callback) {
        this._fsm.handle('disableInputMessages', callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.enableMethods = function (callback) {
        this._fsm.handle('enableMethods', callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.disableMethods = function (callback) {
        this._fsm.handle('disableMethods', callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.getTwin = function (callback) {
        this._fsm.handle('getTwin', callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.updateTwinReportedProperties = function (patch, callback) {
        this._fsm.handle('updateTwinReportedProperties', patch, callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.enableTwinDesiredPropertiesUpdates = function (callback) {
        this._fsm.handle('enableTwinDesiredPropertiesUpdates', callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.disableTwinDesiredPropertiesUpdates = function (callback) {
        this._fsm.handle('disableTwinDesiredPropertiesUpdates', callback);
    };
    /**
     * @private
     */
    Mqtt.prototype.sendOutputEvent = function (outputName, message, done) {
        debug('sendOutputEvent ' + JSON.stringify(message));
        /*Codes_SRS_NODE_DEVICE_MQTT_18_035: [ The `sendOutputEvent` method shall call the publish method on `MqttBase`. ]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_039: [ The `sendOutputEvent` method shall use QoS level of 1. ]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_068: [ The `sendOutputEvent` method shall serialize the `outputName` property of the message as a key-value pair on the topic with the key `$.on`. ] */
        this._fsm.handle('sendEvent', message, { '$.on': outputName }, function (err, puback) {
            if (err) {
                debug('send error: ' + err.toString());
                done(err);
            }
            else {
                debug('PUBACK: ' + JSON.stringify(puback));
                done(null, puback);
            }
        });
    };
    /**
     * @private
     */
    Mqtt.prototype.sendOutputEventBatch = function (outputName, messages, done) {
        /*Codes_SRS_NODE_DEVICE_MQTT_18_051: [ `sendOutputEventBatch` shall throw a `NotImplementedError` exception. ]*/
        throw new azure_iot_common_1.errors.NotImplementedError('MQTT Transport does not support batching yet');
    };
    Mqtt.prototype._getBaseTransportConfig = function (credentials) {
        var clientId;
        /*Codes_SRS_NODE_DEVICE_MQTT_18_052: [ If a `moduleId` is specified in the connection string, the Mqtt constructor shall initialize the `clientId` property of the `config` object to '<deviceId>/<moduleId>'. ]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_053: [ If a `moduleId` is not specified in the connection string, the Mqtt constructor shall initialize the `clientId` property of the `config` object to '<deviceId>'. ]*/
        if (credentials.moduleId) {
            clientId = credentials.deviceId + '/' + credentials.moduleId;
        }
        else {
            clientId = credentials.deviceId;
        }
        /*Codes_SRS_NODE_DEVICE_MQTT_16_016: [If the connection string does not specify a `gatewayHostName` value, the Mqtt constructor shall initialize the `uri` property of the `config` object to `mqtts://<host>`.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_054: [If a `gatewayHostName` is specified in the connection string, the Mqtt constructor shall initialize the `uri` property of the `config` object to `mqtts://<gatewayhostname>`. ]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_055: [The Mqtt constructor shall initialize the `username` property of the `config` object to '<host>/<clientId>/api-version=<version>&DeviceClientType=<agentString>'. ]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_41_002: [The MQTT constructor shall append the productInfo to the `username` property of the `config` object.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_41_006: [For a Plug and Play Device the modelID should be included as `&digital-twin-model-id=<DEVICE’s MODEL ID>` after the api-version]*/
        var baseConfig = {
            uri: 'mqtts://' + (credentials.gatewayHostName || credentials.host),
            username: credentials.host + '/' + clientId +
                '/' + azure_iot_common_1.endpoint.versionQueryString() + this._mid +
                '&DeviceClientType=' + encodeURIComponent(this._userAgentString),
            clientId: clientId,
            sharedAccessSignature: credentials.sharedAccessSignature,
            x509: credentials.x509
        };
        return baseConfig;
    };
    Mqtt.prototype._configureEndpoints = function (credentials) {
        if (credentials.moduleId) {
            this._topicTelemetryPublish = azure_iot_common_1.endpoint.moduleEventPath(credentials.deviceId, credentials.moduleId).substring(1) + '/';
        }
        else {
            this._topicTelemetryPublish = azure_iot_common_1.endpoint.deviceEventPath(credentials.deviceId).substring(1) + '/';
        }
        debug('topic publish: ' + this._topicTelemetryPublish);
        // MQTT topics to subscribe to
        this._topics = {};
        this._topics.method = {
            name: '$iothub/methods/POST/#',
            subscribeInProgress: false,
            subscribed: false,
            topicMatchRegex: /^\$iothub\/methods\/POST\/.*$/g,
            handler: this._onDeviceMethod.bind(this)
        };
        if (credentials.moduleId) {
            this._topics.inputMessage = {
                name: azure_iot_common_1.endpoint.moduleInputMessagePath(credentials.deviceId, credentials.moduleId).substring(1) + '/#',
                subscribeInProgress: false,
                subscribed: false,
                topicMatchRegex: /^devices\/.*\/modules\/.*\/inputs\/.*\/.*$/g,
                handler: this._onInputMessage.bind(this)
            };
            debug('inputMessage topic subscribe: ' + this._topics.inputMessage.name);
        }
        else {
            this._topics.message = {
                name: azure_iot_common_1.endpoint.deviceMessagePath(credentials.deviceId).substring(1) + '/#',
                subscribeInProgress: false,
                subscribed: false,
                topicMatchRegex: /^devices\/.*\/messages\/devicebound\/.*$/g,
                handler: this._onC2DMessage.bind(this)
            };
            debug('message topic subscribe: ' + this._topics.message.name);
        }
    };
    Mqtt.prototype._setupSubscription = function (topic, qos, callback) {
        debug('subscribe: ' + JSON.stringify(topic));
        topic.subscribeInProgress = true;
        /*Codes_SRS_NODE_DEVICE_MQTT_16_049: [`enableC2D` shall subscribe to the MQTT topic for messages with a QoS of `1`.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_16_040: [`enableMethods` shall subscribe to the MQTT topic for direct methods.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_061: [`enableInputMessages` shall subscribe to the MQTT topic for inputMessages. ]*/
        this._mqtt.subscribe(topic.name, { qos: qos }, function (err) {
            topic.subscribeInProgress = false;
            topic.subscribed = true;
            /*Codes_SRS_NODE_DEVICE_MQTT_16_050: [`enableC2D` shall call its callback with no arguments when the `SUBACK` packet is received.]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_16_051: [`enableMethods` shall call its callback with no arguments when the `SUBACK` packet is received.]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_18_062: [`enableInputMessages` shall call its callback with no arguments when the `SUBACK` packet is received. ]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_16_052: [`enableC2D` shall call its callback with an `Error` if subscribing to the topic fails.]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_16_053: [`enableMethods` shall call its callback with an `Error` if subscribing to the topic fails.]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_18_063: [`enableInputMessages` shall call its callback with an `Error` if subscribing to the topic fails. ]*/
            callback(err);
        });
    };
    Mqtt.prototype._removeSubscription = function (topic, callback) {
        debug('unsubscribe ' + JSON.stringify(topic));
        /*Codes_SRS_NODE_DEVICE_MQTT_16_042: [`disableC2D` shall unsubscribe from the topic for C2D messages.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_16_045: [`disableMethods` shall unsubscribe from the topic for direct methods.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_065: [`disableInputMessages` shall unsubscribe from the topic for inputMessages. ]*/
        this._mqtt.unsubscribe(topic.name, function (err) {
            topic.subscribed = !err;
            /*Codes_SRS_NODE_DEVICE_MQTT_16_054: [`disableC2D` shall call its callback with no arguments when the `UNSUBACK` packet is received.]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_16_055: [`disableMethods` shall call its callback with no arguments when the `UNSUBACK` packet is received.]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_18_066: [`disableInputMessages` shall call its callback with no arguments when the `UNSUBACK` packet is received. ]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_16_043: [`disableC2D` shall call its callback with an `Error` if an error is received while unsubscribing.]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_16_046: [`disableMethods` shall call its callback with an `Error` if an error is received while unsubscribing.]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_18_067: [ `disableInputMessages` shall call its callback with an `Error` if an error is received while unsubscribing. ]*/
            callback(err);
        });
    };
    Mqtt.prototype._dispatchMqttMessage = function (topic, payload) {
        var _this = this;
        debug('message received on ' + topic);
        debug(JSON.stringify(payload ? payload.toString() : null));
        // dispatch the message to either the c2d message handler or the device method handler.
        // finding out which topic we should dispatch the call to is done by running the regex for each topic in the this._topics dictionary
        // after searching for the topic with regexes, targetTopic will contain the entry of the this._topics dictionary that corresponds to the topic passed as argument.
        var targetTopic = null;
        Object.keys(this._topics).some(function (topicIndex) {
            // Turns out regexes are stateful. We need to reset the search index back to
            // the beginning every time we use it.
            var theTopic = _this._topics[topicIndex];
            theTopic.topicMatchRegex.lastIndex = 0;
            if (theTopic.topicMatchRegex.test(topic)) {
                targetTopic = theTopic;
            }
            return targetTopic !== null;
        });
        // we have now run through all regexes in the this._topics table but we're still not sure we found something
        if (!!targetTopic) {
            // if the targetTopic is truthy then it means one of the regex matched, therefore we can call its corresponding handler.
            targetTopic.handler(topic, payload);
        }
    };
    Mqtt.prototype._onC2DMessage = function (topic, payload) {
        /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_005: [When a message event is emitted, the parameter shall be of type Message]*/
        var msg = new azure_iot_common_1.Message(payload);
        var topicParts = topic.split('/');
        // Message properties are always the 5th segment of the topic
        if (topicParts[4]) {
            this._extractPropertiesFromTopicPart(topicParts[4], msg);
        }
        /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_004: [If there is a listener for the message event, a message event shall be emitted for each message received.]*/
        this.emit('message', msg);
    };
    Mqtt.prototype._extractPropertiesFromTopicPart = function (properties, msg) {
        var keyValuePairs = properties.split('&');
        for (var i = 0; i < keyValuePairs.length; i++) {
            var keyValuePair = keyValuePairs[i].split('=');
            var k = decodeURIComponent(keyValuePair[0]);
            var v = decodeURIComponent(keyValuePair[1]);
            switch (k) {
                case '$.mid':
                    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_008: [When a message is received, the receiver shall populate the generated `Message` object `messageId` with the value of the property `$.mid` serialized in the topic, if present.]*/
                    msg.messageId = v;
                    break;
                case '$.to':
                    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_009: [When a message is received, the receiver shall populate the generated `Message` object `to` with the value of the property `$.to` serialized in the topic, if present.]*/
                    msg.to = v;
                    break;
                case '$.exp':
                    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_010: [When a message is received, the receiver shall populate the generated `Message` object `expiryTimeUtc` with the value of the property `$.exp` serialized in the topic, if present.]*/
                    msg.expiryTimeUtc = v;
                    break;
                case '$.cid':
                    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_011: [When a message is received, the receiver shall populate the generated `Message` object `correlationId` with the value of the property `$.cid` serialized in the topic, if present.]*/
                    msg.correlationId = v;
                    break;
                case '$.uid':
                    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_012: [When a message is received, the receiver shall populate the generated `Message` object `userId` with the value of the property `$.uid` serialized in the topic, if present.]*/
                    msg.userId = v;
                    break;
                case '$.ct':
                    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_013: [When a message is received, the receiver shall populate the generated `Message` object `contentType` with the value of the property `$.ct` serialized in the topic, if present.]*/
                    msg.contentType = v;
                    break;
                case '$.ce':
                    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_014: [When a message is received, the receiver shall populate the generated `Message` object `contentEncoding` with the value of the property `$.ce` serialized in the topic, if present.]*/
                    msg.contentEncoding = v;
                    break;
                default:
                    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_007: [When a message is received, the receiver shall populate the generated `Message` object `properties` property with the user properties serialized in the topic.]*/
                    msg.properties.add(k, v);
                    break;
            }
        }
    };
    Mqtt.prototype._onInputMessage = function (topic, payload) {
        /*Codes_SRS_NODE_DEVICE_MQTT_18_056: [ When an `inputMessage` event is emitted, the first parameter shall be the inputName and the second parameter shall be of type `Message`. ]*/
        var msg = new azure_iot_common_1.Message(payload);
        /*Codes_SRS_NODE_DEVICE_MQTT_18_058: [ When an `inputMessage` event is received, Mqtt shall extract the inputName from the topic according to the following convention: 'devices/<deviceId>/modules/<moduleId>/inputs/<inputName>' ]*/
        var topicParts = topic.split('/');
        if (topicParts[6]) {
            this._extractPropertiesFromTopicPart(topicParts[6], msg);
        }
        var inputName = topicParts[5];
        /*Codes_SRS_NODE_DEVICE_MQTT_18_057: [ An `inputMessage` event shall be emitted for each message received. ]*/
        this.emit('inputMessage', inputName, msg);
    };
    Mqtt.prototype._onDeviceMethod = function (topic, payload) {
        // The topic name looks like this:
        //  $iothub/methods/POST/{method name}?$rid={request id}&{serialized properties}
        // We parse out the message.
        /* Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_13_005: [ When a method_<METHOD NAME> event is emitted the parameter shall conform to the shape as defined by the interface specified below:
    
          interface StringMap {
              [key: string]: string;
          }
    
          interface MethodMessage {
              methods: { methodName: string; };
              requestId: string;
              properties: StringMap;
              body: Buffer;
              verb: string;
          }
        ]*/
        var methodMessage = _parseMessage(topic, payload);
        if (!!methodMessage) {
            // Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_13_003: [ If there is a listener for the method event, a method_<METHOD NAME> event shall be emitted for each message received. ]
            // we emit a message for the event 'method_{method name}'
            this.emit('method_' + methodMessage.methods.methodName, methodMessage);
        }
    };
    Mqtt.prototype._getEventTopicFromMessage = function (message, extraSystemProperties) {
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_008: [The `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_036: [ If a `moduleId` was not specified in the transport connection, the `sendOutputEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`. ]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_037: [ If a `moduleId` was specified in the transport connection, the `sendOutputEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/<moduleId>/messages/events/`. ]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_034: [ If the connection string specifies a `moduleId` value, the `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/<moduleId>/messages/events/` ]*/
        var topic = this._topicTelemetryPublish;
        var systemProperties = extraSystemProperties || {};
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_011: [The `sendEvent` method shall serialize the `messageId` property of the message as a key-value pair on the topic with the key `$.mid`.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_040: [ The `sendOutputEvent` method shall serialize the `messageId` property of the message as a key-value pair on the topic with the key `$.mid`. ]*/
        if (message.messageId)
            systemProperties['$.mid'] = message.messageId;
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_012: [The `sendEvent` method shall serialize the `correlationId` property of the message as a key-value pair on the topic with the key `$.cid`.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_041: [ The `sendOutputEvent` method shall serialize the `correlationId` property of the message as a key-value pair on the topic with the key `$.cid`. ]*/
        if (message.correlationId)
            systemProperties['$.cid'] = message.correlationId;
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_013: [The `sendEvent` method shall serialize the `userId` property of the message as a key-value pair on the topic with the key `$.uid`.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_042: [ The `sendOutputEvent` method shall serialize the `userId` property of the message as a key-value pair on the topic with the key `$.uid`. ]*/
        if (message.userId)
            systemProperties['$.uid'] = message.userId;
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_014: [The `sendEvent` method shall serialize the `to` property of the message as a key-value pair on the topic with the key `$.to`.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_043: [ The `sendOutputEvent` method shall serialize the `to` property of the message as a key-value pair on the topic with the key `$.to`. ]*/
        if (message.to)
            systemProperties['$.to'] = message.to;
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_015: [The `sendEvent` method shall serialize the `expiryTimeUtc` property of the message as a key-value pair on the topic with the key `$.exp`.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_044: [ The `sendOutputEvent` method shall serialize the `expiryTimeUtc` property of the message as a key-value pair on the topic with the key `$.exp`. ]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_16_084: [The `sendEvent` method shall serialize the `contentType` property of the message as a key-value pair on the topic with the key `$.ct`.]*/
        if (message.contentType)
            systemProperties['$.ct'] = message.contentType;
        /*Codes_SRS_NODE_DEVICE_MQTT_16_083: [The `sendEvent` method shall serialize the `contentEncoding` property of the message as a key-value pair on the topic with the key `$.ce`.]*/
        if (message.contentEncoding)
            systemProperties['$.ce'] = message.contentEncoding;
        if (message.interfaceId)
            systemProperties['$.ifid'] = message.interfaceId;
        if (message.expiryTimeUtc) {
            var expiryString = message.expiryTimeUtc instanceof Date ? message.expiryTimeUtc.toISOString() : message.expiryTimeUtc;
            systemProperties['$.exp'] = (expiryString || undefined);
        }
        var sysPropString = querystring.stringify(systemProperties);
        topic += sysPropString;
        /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_009: [If the message has properties, the property keys and values shall be uri-encoded, then serialized and appended at the end of the topic with the following convention: `<key>=<value>&<key2>=<value2>&<key3>=<value3>(...)`.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_18_038: [ If the outputEvent message has properties, the property keys and values shall be uri-encoded, then serialized and appended at the end of the topic with the following convention: `<key>=<value>&<key2>=<value2>&<key3>=<value3>(...)`. ]*/
        if (message.properties && message.properties.count() > 0) {
            for (var i = 0; i < message.properties.count(); i++) {
                if (i > 0 || sysPropString)
                    topic += '&';
                topic += encodeURIComponent(message.properties.propertyList[i].key) + '=' + encodeURIComponent(message.properties.propertyList[i].value);
            }
        }
        return topic;
    };
    Mqtt.prototype._ensureAgentString = function (done) {
        var _this = this;
        if (this._userAgentString) {
            done();
        }
        else {
            var customInfo = (this._productInfo) ? this._productInfo : '';
            azure_iot_device_1.getUserAgentString(customInfo, function (agent) {
                _this._userAgentString = agent;
                done();
            });
        }
    };
    return Mqtt;
}(events_1.EventEmitter));
exports.Mqtt = Mqtt;
/**
 * @private
 */
var MethodDescription = /** @class */ (function () {
    function MethodDescription() {
    }
    return MethodDescription;
}());
/**
 * @private
 */
var MethodMessageImpl = /** @class */ (function () {
    function MethodMessageImpl() {
    }
    return MethodMessageImpl;
}());
function _parseMessage(topic, body) {
    var url;
    var path;
    var query;
    try {
        url = URL.parse(topic);
        path = url.path.split('/');
        query = querystring.parse(url.query);
    }
    catch (err) {
        debug('could not parse topic for received message: ' + topic);
        return undefined;
    }
    // if the topic has a querystring then 'path' will include it; so
    // we strip it out
    var lastPathComponent = path[path.length - 1];
    if (lastPathComponent.indexOf('?') !== -1) {
        path[path.length - 1] = lastPathComponent.substr(0, lastPathComponent.indexOf('?'));
    }
    if (path.length > 0 && path[0] === '$iothub') {
        var message = new MethodMessageImpl();
        if (path.length > 1 && path[1].length > 0) {
            // create an object for the module; for example, $iothub/twin/...
            // would result in there being a message.twin object
            var mod = message[path[1]] = new MethodDescription();
            // populates the request ID if there is one
            if (!!(query.$rid)) {
                message.requestId = query.$rid;
            }
            // parse the other properties properties (excluding $rid)
            message.properties = query;
            delete message.properties.$rid;
            // save the body
            message.body = body;
            // parse the verb
            if (path.length > 2 && path[2].length > 0) {
                mod.verb = path[2];
                // This is a topic that looks like this:
                //  $iothub/methods/POST/{method name}?$rid={request id}&{serialized properties}
                // We parse the method name out.
                if (path.length > 3 && path[3].length > 0) {
                    mod.methodName = path[3];
                }
                else {
                    // The service published a message on a strange topic name. This is
                    // probably a service bug. At any rate we don't know what to do with
                    // this strange topic so we throw.
                    throw new Error('Device method call\'s MQTT topic name does not include the method name.');
                }
            }
        }
        return message;
    }
    return undefined;
}
//# sourceMappingURL=mqtt.js.map