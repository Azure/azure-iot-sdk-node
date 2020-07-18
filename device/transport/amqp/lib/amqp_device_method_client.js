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
var async = require("async");
var dbg = require("debug");
var debug = dbg('azure-iot-device-amqp:AmqpDeviceMethodClient');
var azure_iot_common_1 = require("azure-iot-common");
var rhea = require("rhea");
var methodMessagePropertyKeys = {
    methodName: 'IoThub-methodname',
    status: 'IoThub-status'
};
/**
 * @private
 */
var AmqpDeviceMethodClient = /** @class */ (function (_super) {
    __extends(AmqpDeviceMethodClient, _super);
    function AmqpDeviceMethodClient(authenticationProvider, amqpClient) {
        var _this = _super.call(this) || this;
        /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_003: [The `AmqpDeviceMethodClient` shall inherit from the `EventEmitter` class.]*/
        _this._authenticationProvider = authenticationProvider;
        _this._amqpClient = amqpClient;
        _this._fsm = new machina.Fsm({
            namespace: 'amqp-device-method-client',
            initialState: 'detached',
            states: {
                detached: {
                    _onEnter: function (callback, err) {
                        _this._senderLink = undefined;
                        _this._receiverLink = undefined;
                        if (callback) {
                            callback(err);
                        }
                        else {
                            if (err) {
                                debug('detached with error: ' + err.toString());
                                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_015: [The `AmqpDeviceMethodClient` object shall forward any error received on a link to any listening client in an `error` event.]*/
                                _this.emit('error', err);
                            }
                        }
                    },
                    attach: function (callback) {
                        _this._fsm.transition('attaching', callback);
                    },
                    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_023: [The `detach` method shall call the callback with no arguments if the links are properly detached.]*/
                    detach: function (callback) { return callback(); },
                    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_025: [The `forceDetach` method shall immediately return if all links are already detached.]*/
                    forceDetach: function () { return; },
                    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_026: [The `sendMethodResponse` shall fail with a `NotConnectedError` if it is called while the links are detached.]*/
                    sendMethodResponse: function (response, callback) { return callback(new azure_iot_common_1.errors.NotConnectedError('Method Links were detached - the service already considers this method failed')); },
                    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_006: [The `onDeviceMethod` method shall save the `callback` argument so that it is called when the corresponding method call is received.]*/
                    onDeviceMethod: function (methodName, methodCallback) {
                        debug('attaching callback for method: ' + methodName + 'while detached.');
                        _this.on('method_' + methodName, methodCallback);
                    }
                },
                attaching: {
                    _onEnter: function (attachCallback) {
                        /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_027: [The `attach` method shall call the `getDeviceCredentials` method on the `authenticationProvider` object passed as an argument to the constructor to retrieve the device id.]*/
                        _this._authenticationProvider.getDeviceCredentials(function (err, credentials) {
                            if (err) {
                                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_028: [The `attach` method shall call its callback with an error if the call to `getDeviceCredentials` fails with an error.]*/
                                _this._fsm.transition('detached', attachCallback, err);
                            }
                            else {
                                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_017: [The endpoint used to for the sender and receiver link shall be `/devices/<device-id>/methods/devicebound`.]*/
                                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_18_001: [If a `moduleId` value was set in the device's connection string, The endpoint used to for the sender and receiver link shall be `/devices/<deviceId>/modules/<moduleId>/methods/devicebound`.]*/
                                if (credentials.moduleId) {
                                    _this._methodEndpoint = azure_iot_common_1.endpoint.moduleMethodPath(credentials.deviceId, credentials.moduleId);
                                }
                                else {
                                    _this._methodEndpoint = azure_iot_common_1.endpoint.deviceMethodPath(credentials.deviceId);
                                }
                                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_014: [** The `AmqpDeviceMethodClient` object shall set 2 properties of any AMQP link that it create:
                                - `com.microsoft:api-version` shall be set to the current API version in use.
                                - `com.microsoft:channel-correlation-id` shall be set to the string "methods:" followed by a guid.]*/
                                var linkOptions_1 = {
                                    properties: {
                                        'com.microsoft:api-version': azure_iot_common_1.endpoint.apiVersion,
                                        'com.microsoft:channel-correlation-id': 'methods:' + uuid.v4()
                                    },
                                    rcv_settle_mode: 0
                                };
                                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_019: [The `attach` method shall create a SenderLink and a ReceiverLink and attach them.]*/
                                _this._amqpClient.attachSenderLink(_this._methodEndpoint, linkOptions_1, function (err, senderLink) {
                                    if (err) {
                                        _this._fsm.transition('detaching', attachCallback, err);
                                    }
                                    else {
                                        _this._senderLink = senderLink;
                                        _this._amqpClient.attachReceiverLink(_this._methodEndpoint, linkOptions_1, function (err, receiverLink) {
                                            if (err) {
                                                _this._fsm.transition('detaching', attachCallback, err);
                                            }
                                            else {
                                                _this._receiverLink = receiverLink;
                                                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_021: [The `attach` method shall subscribe to the `message` and `error` events on the `ReceiverLink` object associated with the method endpoint.]*/
                                                _this._receiverLink.on('message', function (msg) {
                                                    debug('got method request');
                                                    debug(JSON.stringify(msg, null, 2));
                                                    var methodName = msg.application_properties[methodMessagePropertyKeys.methodName];
                                                    //
                                                    // The rhea library will de-serialize an encoded uuid (0x98) as a 16 byte buffer.
                                                    //
                                                    var methodRequest = {};
                                                    methodRequest.methods = { methodName: methodName };
                                                    if (msg.body && msg.body.content) {
                                                        methodRequest.body = msg.body.content.toString();
                                                    }
                                                    if ((msg.correlation_id instanceof Buffer) && (msg.correlation_id.length === 16)) {
                                                        methodRequest.requestId = rhea.uuid_to_string(msg.correlation_id);
                                                    }
                                                    else {
                                                        methodRequest.requestId = msg.correlation_id;
                                                    }
                                                    debug(JSON.stringify(methodRequest, null, 2));
                                                    _this.emit('method_' + methodName, methodRequest);
                                                });
                                                _this._receiverLink.on('error', function (err) {
                                                    _this._fsm.transition('detaching', undefined, err);
                                                });
                                                _this._fsm.transition('attached', attachCallback);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    },
                    forceDetach: function () {
                        /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_024: [The `forceDetach` method shall forcefully detach all links.]*/
                        if (_this._senderLink) {
                            _this._senderLink.forceDetach();
                        }
                        if (_this._receiverLink) {
                            _this._receiverLink.forceDetach();
                        }
                        _this._fsm.transition('detached');
                    },
                    detach: function () { return _this._fsm.deferUntilTransition(); },
                    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_026: [The `sendMethodResponse` shall fail with a `NotConnectedError` if it is called while the links are detached.]*/
                    sendMethodResponse: function (response, callback) { return callback(new azure_iot_common_1.errors.NotConnectedError('Method Links were detached - the service already considers this method failed')); },
                    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_006: [The `onDeviceMethod` method shall save the `callback` argument so that it is called when the corresponding method call is received.]*/
                    onDeviceMethod: function (methodName, methodCallback) {
                        debug('attaching callback for method: ' + methodName + 'while attaching.');
                        _this.on('method_' + methodName, methodCallback);
                    }
                },
                attached: {
                    _onEnter: function (attachCallback) {
                        attachCallback();
                    },
                    sendMethodResponse: function (response, callback) {
                        var message = new azure_iot_common_1.Message(JSON.stringify(response.payload));
                        message.correlationId = response.requestId;
                        message.properties.add(methodMessagePropertyKeys.status, response.status);
                        _this._amqpClient.send(message, _this._methodEndpoint, undefined, callback);
                    },
                    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_006: [The `onDeviceMethod` method shall save the `callback` argument so that it is called when the corresponding method call is received.]*/
                    onDeviceMethod: function (methodName, methodCallback) {
                        debug('attaching callback for method: ' + methodName);
                        _this.on('method_' + methodName, methodCallback);
                    },
                    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_020: [The `attach` method shall immediately call the callback if the links are already attached.]*/
                    attach: function (callback) { return callback(); },
                    detach: function (callback) { return _this._fsm.transition('detaching', callback); },
                    forceDetach: function () {
                        /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_024: [The `forceDetach` method shall forcefully detach all links.]*/
                        _this._senderLink.forceDetach();
                        _this._receiverLink.forceDetach();
                        _this._fsm.transition('detached');
                    }
                },
                detaching: {
                    _onEnter: function (forwardedCallback, err) {
                        /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_022: [The `detach` method shall detach both Sender and Receiver links.]*/
                        var links = [_this._senderLink, _this._receiverLink];
                        async.each(links, function (link, callback) {
                            if (link) {
                                link.detach(callback);
                            }
                            else {
                                callback();
                            }
                        }, function () {
                            _this._fsm.transition('detached', forwardedCallback, err);
                        });
                    },
                    '*': function (callback) { return _this._fsm.deferUntilTransition('detached'); }
                }
            }
        });
        _this._fsm.on('transition', function (transition) {
            debug(transition.fromState + ' -> ' + transition.toState + ' (action:' + transition.action + ')');
        });
        return _this;
    }
    AmqpDeviceMethodClient.prototype.attach = function (callback) {
        this._fsm.handle('attach', callback);
    };
    AmqpDeviceMethodClient.prototype.detach = function (callback) {
        this._fsm.handle('detach', callback);
    };
    AmqpDeviceMethodClient.prototype.forceDetach = function () {
        this._fsm.handle('forceDetach');
    };
    AmqpDeviceMethodClient.prototype.sendMethodResponse = function (response, callback) {
        if (!response)
            throw new ReferenceError('response cannot be \'' + response + '\'');
        if (response.status === null || response.status === undefined)
            throw new azure_iot_common_1.errors.ArgumentError('response.status cannot be \'' + response.status + '\'');
        if (!response.requestId)
            throw new azure_iot_common_1.errors.ArgumentError('response.requestId cannot be \'' + response.requestId + '\'');
        this._fsm.handle('sendMethodResponse', response, callback);
    };
    AmqpDeviceMethodClient.prototype.onDeviceMethod = function (methodName, callback) {
        if (!methodName)
            throw new ReferenceError('methodName cannot be \'' + methodName + '\'');
        /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_018: [The `onDeviceMethod` method shall throw an `ArgumentError` if the `methodName` argument is not a string.]*/
        if (typeof methodName !== 'string')
            throw new azure_iot_common_1.errors.ArgumentError('methodName must be a string');
        this._fsm.handle('onDeviceMethod', methodName, callback);
    };
    return AmqpDeviceMethodClient;
}(events_1.EventEmitter));
exports.AmqpDeviceMethodClient = AmqpDeviceMethodClient;
//# sourceMappingURL=amqp_device_method_client.js.map