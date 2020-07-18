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
var azure_iot_mqtt_base_1 = require("azure-iot-mqtt-base");
var querystring = require("querystring");
var url = require("url");
var uuid = require("uuid");
var machina = require("machina");
var dbg = require("debug");
var debug = dbg('azure-iot-device-mqtt:MqttTwinClient');
// $iothub/twin/PATCH/properties/reported/?$rid={request id}&$version={base version}
/* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_009: [** The subscribed topic for `response` events shall be '$iothub/twin/res/#' **]** */
var responseTopic = '$iothub/twin/res/#';
/* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_019: [** The subscribed topic for post events shall be $iothub/twin/PATCH/properties/desired/# **]** */
var desiredPropertiesUpdatesTopic = '$iothub/twin/PATCH/properties/desired/#';
/**
 * @private
 * @class        module:azure-iot-device-mqtt.MqttTwinReceiver
 * @classdesc    Acts as a receiver for device-twin traffic
 *
 * @param {Object} config   configuration object
 * @fires MqttTwinReceiver#subscribed   an MQTT topic has been successfully subscribed to
 * @fires MqttTwinReceiver#error    an error has occured while subscribing to an MQTT topic
 * @fires MqttTwinReceiver#response   a response message has been received from the service
 * @fires MqttTwinReceiver#post a post message has been received from the service
 * @throws {ReferenceError} If client parameter is falsy.
 *
 */
var MqttTwinClient = /** @class */ (function (_super) {
    __extends(MqttTwinClient, _super);
    function MqttTwinClient(client) {
        var _this = _super.call(this) || this;
        _this._pendingTwinRequests = {};
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_18_001: [The `MqttTwinClient` constructor shall accept a `client` object.]*/
        _this._mqtt = client;
        var messageHandler = _this._onMqttMessage.bind(_this);
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_001: [The `MqttTwinClient` constructor shall immediately subscribe to the `message` event of the `client` object.]*/
        _this._mqtt.on('message', messageHandler);
        _this._topicFsm = new machina.BehavioralFsm({
            initialState: 'unsubscribed',
            states: {
                unsubscribed: {
                    _onEnter: function (topicSubscription, err, callback) {
                        if (callback) {
                            callback(err);
                        }
                    },
                    subscribe: function (topicSubscription, callback) {
                        this.transition(topicSubscription, 'subscribing', callback);
                    },
                    unsubscribe: function (topicSubscription, callback) {
                        // not entirely sure about that. if subscription are restored because cleanSession is false, it means technically a user may want to unsubscribe
                        // even though subscribe hasn't been called yet.
                        callback();
                    }
                },
                subscribing: {
                    _onEnter: function (topicSubscription, callback) {
                        var _this = this;
                        topicSubscription.mqttClient.subscribe(topicSubscription.topic, { qos: 0 }, function (err, result) {
                            if (err) {
                                _this.transition(topicSubscription, 'unsubscribed', err, callback);
                            }
                            else {
                                debug('subscribed to response topic: ' + JSON.stringify(result));
                                _this.transition(topicSubscription, 'subscribed', callback);
                            }
                        });
                    },
                    '*': function (topicSubscription) { this.deferUntilTransition(topicSubscription); }
                },
                subscribed: {
                    _onEnter: function (topicSubscription, callback) {
                        callback();
                    },
                    subscribe: function (topicSubscription, callback) {
                        callback();
                    },
                    unsubscribe: function (topicSubscription, callback) {
                        this.transition(topicSubscription, 'unsubscribing', callback);
                    }
                },
                unsubscribing: {
                    _onEnter: function (topicSubscription, callback) {
                        var _this = this;
                        topicSubscription.mqttClient.unsubscribe(topicSubscription.topic, function (err, result) {
                            if (err) {
                                debug('failed to unsubscribe: ' + err.toString());
                            }
                            else {
                                debug('unsubscribed from: ' + topicSubscription.topic);
                            }
                            _this.transition(topicSubscription, 'unsubscribed', err, callback);
                        });
                    },
                    '*': function (topicSubscription) { this.deferUntilTransition(topicSubscription); }
                }
            },
            subscribe: function (topicSubscription, callback) {
                this.handle(topicSubscription, 'subscribe', callback);
            },
            unsubscribe: function (topicSubscription, callback) {
                this.handle(topicSubscription, 'unsubscribe', callback);
            }
        });
        _this._responseTopic = {
            mqttClient: _this._mqtt,
            topic: responseTopic
        };
        _this._desiredPropertiesUpdatesTopic = {
            mqttClient: _this._mqtt,
            topic: desiredPropertiesUpdatesTopic
        };
        return _this;
    }
    MqttTwinClient.prototype.getTwin = function (callback) {
        var _this = this;
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_002: [The `getTwin` method shall subscribe to the `$iothub/twin/res/#` topic if not already subscribed.]*/
        this._topicFsm.subscribe(this._responseTopic, function (err) {
            if (err) {
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_009: [If subscribing to the response topic fails, the callback shall be called with the translated version of the error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
                callback(azure_iot_mqtt_base_1.translateError(err));
            }
            else {
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_003: [The `getTwin` method shall publish the request message on the `$iothub/twin/get/?rid=<requestId>` topic using the `MqttBase.publish` method.]*/
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_006: [The request message published by the `getTwin` method shall have an empty body.]*/
                _this._sendTwinRequest('GET', '/', ' ', callback);
            }
        });
    };
    MqttTwinClient.prototype.updateTwinReportedProperties = function (patch, callback) {
        var _this = this;
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_011: [The `updateTwinReportedProperties` method shall subscribe to the `$iothub/twin/res/#` topic if not already subscribed.]*/
        this._topicFsm.subscribe(this._responseTopic, function (err) {
            if (err) {
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_012: [If subscribing to the response topic fails, the callback shall be called with the translated version of the error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
                callback(azure_iot_mqtt_base_1.translateError(err));
            }
            else {
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_013: [The `updateTwinReportedProperties` method shall publish the request message on the `$iothub/twin/patch/properties/reported/?rid=<requestId>` topic using the `MqttBase.publish` method.]*/
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_016: [The body of the request message published by the `updateTwinReportedProperties` method shall be a JSON string of the reported properties patch.]*/
                _this._sendTwinRequest('PATCH', '/properties/reported/', JSON.stringify(patch), callback);
            }
        });
    };
    MqttTwinClient.prototype.enableTwinDesiredPropertiesUpdates = function (callback) {
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_019: [The `enableTwinDesiredPropertiesUpdates` shall subscribe to the `$iothub/twin/PATCH/properties/desired/#` topic using the `MqttBase.subscribe` method if it hasn't been subscribed to already.]*/
        this._topicFsm.subscribe(this._desiredPropertiesUpdatesTopic, function (err, suback) {
            if (err) {
                debug('failed to subscribe to desired properties updates: ' + err.toString());
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_021: [if subscribing fails with an error the `enableTwinDesiredPropertiesUpdates` shall call its callback with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
                callback(azure_iot_mqtt_base_1.translateError(err));
            }
            else {
                debug('suback: ' + JSON.stringify(suback));
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_020: [The `enableTwinDesiredPropertiesUpdates` shall call its callback with no arguments if the subscription is successful.]*/
                callback();
            }
        });
    };
    MqttTwinClient.prototype.disableTwinDesiredPropertiesUpdates = function (callback) {
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_022: [The `disableTwinDesiredPropertiesUpdates` shall unsubscribe from the `$iothub/twin/PATCH/properties/desired/#` topic using the `MqttBase.unsubscribe` method if it hasn't been unsubscribed from already.]*/
        this._topicFsm.unsubscribe(this._desiredPropertiesUpdatesTopic, function (err, suback) {
            if (err) {
                debug('failed to subscribe to desired properties updates: ' + err.toString());
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_024: [if unsubscribing fails with an error the `disableTwinDesiredPropertiesUpdates` shall call its callback with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
                callback(azure_iot_mqtt_base_1.translateError(err));
            }
            else {
                debug('suback: ' + JSON.stringify(suback));
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_023: [The `disableTwinDesiredPropertiesUpdates` shall call its callback with no arguments if the unsubscription is successful.]*/
                callback();
            }
        });
    };
    MqttTwinClient.prototype._sendTwinRequest = function (method, resource, body, callback) {
        var _this = this;
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_005: [The `requestId` property in the topic querystring should be set to a unique identifier that will be used to identify the response later on.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_015: [The `requestId` property in the topic querystring should be set to a unique identifier that will be used to identify the response later on.]*/
        var requestId = uuid.v4();
        var propString = '?$rid=' + requestId;
        var topic = '$iothub/twin/' + method + resource + propString;
        this._pendingTwinRequests[requestId] = callback;
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_004: [The `getTwin` method shall publish the request message with QoS=0, DUP=0 and Retain=0.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_014: [The `updateTwinReportedProperties` method shall publish the request message with QoS=0, DUP=0 and Retain=0.]*/
        this._mqtt.publish(topic, body.toString(), { qos: 0, retain: false }, function (err, puback) {
            if (err) {
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_008: [If an error happen while publishing the request message, the `callback` shall be called with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_018: [If an error happen while publishing the request message, the `callback` shall be called with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
                delete _this._pendingTwinRequests[requestId];
                callback(azure_iot_mqtt_base_1.translateError(err));
            }
            else {
                debug('twin request sent: ' + puback);
            }
        });
    };
    MqttTwinClient.prototype._onMqttMessage = function (topic, message) {
        debug('mqtt message received');
        if (topic.indexOf('$iothub/twin/res') === 0) {
            debug('response message received');
            this._onResponseMessage(topic, message);
        }
        else if (topic.indexOf('$iothub/twin/PATCH/properties/desired') === 0) {
            /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_025: [Once the desired properties update topic has been subscribed to the `MqttTwinClient` shall emit a `twinDesiredPropertiesUpdate` event for messages received on that topic.]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_026: [The argument of the `twinDesiredPropertiesUpdate` event emitted shall be the object parsed from the JSON string contained in the received message.]*/
            this.emit(MqttTwinClient.desiredPropertiesUpdateEvent, JSON.parse(message));
        }
        else {
            debug('Message received on a topic we can ignore: ' + topic);
        }
    };
    MqttTwinClient.prototype._onResponseMessage = function (topic, message) {
        var urlObject;
        var path;
        var query;
        try {
            urlObject = url.parse(topic);
            path = urlObject.path.split('/');
            query = querystring.parse(urlObject.query);
        }
        catch (err) {
            return;
        }
        if ((path[0] === '$iothub') &&
            (path[1] === 'twin') &&
            (path[2] === 'res') &&
            (path[3]) &&
            (path[3].toString().length > 0) &&
            (query.$rid) &&
            (query.$rid.toString().length > 0)) {
            if (this._pendingTwinRequests[query.$rid]) {
                var requestCallback = this._pendingTwinRequests[query.$rid];
                delete this._pendingTwinRequests[query.$rid];
                // should we really ignore the status code?
                var responseBody = message.toString();
                var parsedMessage = responseBody ? JSON.parse(responseBody) : undefined;
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_007: [When a message is received on the response topic with an `$rid` property in the query string of the topic matching the one that was sent on the request topic, the `callback` shall be called with a `null` error object and the parsed content of the response message.]*/
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_017: [When a message is received on the response topic with an `$rid` property in the query string of the topic matching the one that was sent on the request topic, the `callback` shall be called with a `null` error object.]*/
                /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_41_001: [The `callback` shall be called with a Error object containing the error message if the `parsedMessage` contains an errorCode.]*/
                if (parsedMessage && parsedMessage.errorCode) {
                    requestCallback(new Error(parsedMessage.message));
                }
                else {
                    requestCallback(null, parsedMessage);
                }
            }
            else {
                debug('received a response for a request we do not know about: ' + query.$rid);
            }
        }
        else {
            debug('received a response with a malformed topic property: ' + topic);
        }
    };
    MqttTwinClient.desiredPropertiesUpdateEvent = 'twinDesiredPropertiesUpdate';
    return MqttTwinClient;
}(events_1.EventEmitter));
exports.MqttTwinClient = MqttTwinClient;
//# sourceMappingURL=mqtt_twin_client.js.map