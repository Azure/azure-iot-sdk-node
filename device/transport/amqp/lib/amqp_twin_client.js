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
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_amqp_base_1 = require("azure-iot-amqp-base");
var uuid = require("uuid");
var dbg = require("debug");
var rhea = require("rhea");
var debug = dbg('azure-iot-device-amqp:AmqpTwinClient');
var TwinMethod;
(function (TwinMethod) {
    TwinMethod["GET"] = "GET";
    TwinMethod["PATCH"] = "PATCH";
    TwinMethod["PUT"] = "PUT";
    TwinMethod["DELETE"] = "DELETE";
})(TwinMethod || (TwinMethod = {}));
/**
 * @private
 * @class        module:azure-iot-device-amqp.AmqpTwinClient
 * @classdesc    Acts as a client for device-twin traffic
 *
 * @param {Object} config                        configuration object
 * @fires AmqpTwinClient#error                   an error has occurred
 * @fires AmqpTwinClient#desiredPropertyUpdate   a desired property has been updated
 * @throws {ReferenceError}                      If client parameter is falsy.
 *
 */
/* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_005: [The `AmqpTwinClient` shall inherit from the `EventEmitter` class.] */
var AmqpTwinClient = /** @class */ (function (_super) {
    __extends(AmqpTwinClient, _super);
    function AmqpTwinClient(authenticationProvider, client) {
        var _this = _super.call(this) || this;
        _this._client = client;
        _this._authenticationProvider = authenticationProvider;
        _this._senderLink = null;
        _this._receiverLink = null;
        _this._pendingTwinRequests = {};
        _this._messageHandler = function (message) {
            //
            // The ONLY time we should see a message on the receiver link without a correlationId is if the message is a desired property delta update.
            //
            var correlationId = message.correlation_id;
            if (correlationId) {
                _this._onResponseMessage(message);
            }
            else if (message.hasOwnProperty('body')) {
                _this._onDesiredPropertyDelta(message);
            }
            else {
                //
                // Can't be any message we know what to do with.  Just drop it on the floor.
                //
                debug('malformed response message received from service: ' + JSON.stringify(message));
            }
        };
        _this._errorHandler = function (err) { return _this._fsm.handle('handleLinkError', err); };
        _this._fsm = new machina.Fsm({
            namespace: 'amqp-twin-client',
            initialState: 'detached',
            states: {
                detached: {
                    _onEnter: function (err, detachCallback) {
                        if (detachCallback) {
                            detachCallback(err);
                        }
                        else {
                            if (err) {
                                _this.emit('error', err);
                            }
                        }
                    },
                    getTwin: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_007: [The `getTwin` method shall attach the sender link if it's not already attached.]*/
                        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_009: [THe `getTwin` method shall attach the receiver link if it's not already attached.]*/
                        _this._fsm.transition('attaching', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_008: [If attaching the sender link fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_010: [If attaching the receiver link fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('getTwin', callback);
                            }
                        });
                    },
                    updateTwinReportedProperties: function (patch, callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_015: [The `updateTwinReportedProperties` method shall attach the sender link if it's not already attached.]*/
                        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_017: [THe `updateTwinReportedProperties` method shall attach the receiver link if it's not already attached.]*/
                        _this._fsm.transition('attaching', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_016: [If attaching the sender link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_018: [If attaching the receiver link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('updateTwinReportedProperties', patch, callback);
                            }
                        });
                    },
                    enableTwinDesiredPropertiesUpdates: function (callback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_023: [The `enableTwinDesiredPropertiesUpdates` method shall attach the sender link if it's not already attached.]*/
                        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_025: [The `enableTwinDesiredPropertiesUpdates` method shall attach the receiver link if it's not already attached.]*/
                        _this._fsm.transition('attaching', function (err) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_024: [If attaching the sender link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_026: [If attaching the receiver link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('enableTwinDesiredPropertiesUpdates', callback);
                            }
                        });
                    },
                    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_031: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback immediately and with no arguments if the links are detached.]*/
                    disableTwinDesiredPropertiesUpdates: function (callback) { return callback(); },
                    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_004: [The `detach` method shall call its `callback` immediately if the links are already detached.]*/
                    detach: function (callback) { return callback(); }
                },
                attaching: {
                    _onEnter: function (attachCallback) {
                        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_007: [The `attach` method shall call the `getDeviceCredentials` method on the `authenticationProvider` object passed as an argument to the constructor to retrieve the device id.]*/
                        _this._authenticationProvider.getDeviceCredentials(function (err, credentials) {
                            if (err) {
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_008: [The `attach` method shall call its callback with an error if the call to `getDeviceCredentials` fails with an error.]*/
                                _this._fsm.transition('detached', err, attachCallback);
                            }
                            else {
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_007: [The endpoint argument for attachReceiverLink shall be `/device/<deviceId>/twin`.] */
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_18_001: [If a `moduleId` value was set in the device's connection string, the endpoint argument for `attachReceiverLink` shall be `/devices/<deviceId>/modules/<moduleId>/twin`]*/
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_009: [The endpoint argument for attachSenderLink shall be `/device/<deviceId>/twin`.] */
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_18_002: [If a `moduleId` value was set in the device's connection string, the endpoint argument for `attachSenderLink` shall be `/device/<deviceId>/modules/<moduleId>/twin`.]*/
                                if (credentials.moduleId) {
                                    _this._endpoint = azure_iot_common_1.endpoint.moduleTwinPath(credentials.deviceId, credentials.moduleId);
                                }
                                else {
                                    _this._endpoint = azure_iot_common_1.endpoint.deviceTwinPath(credentials.deviceId);
                                }
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_006: [When a listener is added for the `response` event, and the `post` event is NOT already subscribed, upstream and downstream links are established via calls to `attachReceiverLink` and `attachSenderLink`.] */
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_012: [When a listener is added for the `post` event, and the `response` event is NOT already subscribed, upstream and downstream links are established via calls to `attachReceiverLink` and `attachSenderLine`.] */
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_036: [The same correlationId shall be used for both the sender and receiver links.]*/
                                var linkCorrelationId_1 = uuid.v4().toString();
                                _this._client.attachSenderLink(_this._endpoint, _this._generateTwinLinkProperties(linkCorrelationId_1), function (senderLinkError, senderTransportObject) {
                                    if (senderLinkError) {
                                        /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_022: [If an error occurs on establishing the upstream or downstream link then the `error` event shall be emitted.] */
                                        _this._fsm.transition('detached', senderLinkError, attachCallback);
                                    }
                                    else {
                                        _this._senderLink = senderTransportObject;
                                        _this._senderLink.on('error', _this._errorHandler);
                                        _this._client.attachReceiverLink(_this._endpoint, _this._generateTwinLinkProperties(linkCorrelationId_1), function (receiverLinkError, receiverTransportObject) {
                                            if (receiverLinkError) {
                                                _this._fsm.transition('detached', receiverLinkError, attachCallback);
                                            }
                                            else {
                                                _this._receiverLink = receiverTransportObject;
                                                _this._receiverLink.on('message', _this._messageHandler);
                                                _this._receiverLink.on('error', _this._errorHandler);
                                                _this._fsm.transition('attached', attachCallback);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    },
                    handleLinkError: function (err, callback) { return _this._fsm.transition('detaching', err, callback); },
                    detach: function (callback) { return _this._fsm.transition('detaching', null, callback); },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                attached: {
                    _onEnter: function (callback) {
                        callback();
                    },
                    handleLinkError: function (err) {
                        _this._fsm.transition('detaching', err);
                    },
                    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_011: [** The `getTwin` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
                    - `operation` annotation set to `GET`.
                    - `resource` annotation set to `undefined`
                    - `correlationId` property set to a uuid
                    - `body` set to ` `.]*/
                    getTwin: function (callback) { return _this._sendTwinRequest(TwinMethod.GET, undefined, ' ', callback); },
                    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_019: [The `updateTwinReportedProperties` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
                    - `operation` annotation set to `PATCH`.
                    - `resource` annotation set to `/properties/reported`
                    - `correlationId` property set to a uuid
                    - `body` set to the stringified patch object.]*/
                    updateTwinReportedProperties: function (patch, callback) { return _this._sendTwinRequest(TwinMethod.PATCH, '/properties/reported', JSON.stringify(patch), callback); },
                    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_027: [The `enableTwinDesiredPropertiesUpdates` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
                    - `operation` annotation set to `PUT`.
                    - `resource` annotation set to `/notifications/twin/properties/desired`
                    - `correlationId` property set to a uuid
                    - `body` set to `undefined`.]*/
                    enableTwinDesiredPropertiesUpdates: function (callback) { return _this._sendTwinRequest(TwinMethod.PUT, '/notifications/twin/properties/desired', ' ', callback); },
                    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_032: [The `disableTwinDesiredPropertiesUpdates` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
                    - `operation` annotation set to `DELETE`.
                    - `resource` annotation set to `/notifications/twin/properties/desired`
                    - `correlationId` property set to a uuid
                    - `body` set to `undefined`.]*/
                    disableTwinDesiredPropertiesUpdates: function (callback) { return _this._sendTwinRequest(TwinMethod.DELETE, '/notifications/twin/properties/desired', ' ', callback); },
                    detach: function (callback) { return _this._fsm.transition('detaching', null, callback); }
                },
                detaching: {
                    _onEnter: function (err, detachCallback) {
                        var senderLink = _this._senderLink;
                        var receiverLink = _this._receiverLink;
                        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_005: [The `detach` method shall detach the links and call its `callback` with no arguments if the links are successfully detached.]*/
                        _this._client.detachSenderLink(_this._endpoint, function (detachSenderError, result) {
                            senderLink.removeListener('error', _this._errorHandler);
                            if (detachSenderError) {
                                debug('we received an error for the detach of the upstream link during the disconnect.  Moving on to the downstream link.');
                            }
                            _this._client.detachReceiverLink(_this._endpoint, function (detachReceiverError, result) {
                                receiverLink.removeListener('message', _this._messageHandler);
                                receiverLink.removeListener('error', _this._errorHandler);
                                if (detachReceiverError) {
                                    debug('we received an error for the detach of the downstream link during the disconnect.');
                                }
                                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_006: [The `detach` method shall call its `callback` with an `Error` if detaching either of the links fail.]*/
                                var possibleError = err || detachSenderError || detachReceiverError;
                                _this._fsm.transition('detached', possibleError, detachCallback);
                            });
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                }
            }
        });
        return _this;
    }
    AmqpTwinClient.prototype.getTwin = function (callback) {
        this._fsm.handle('getTwin', callback);
    };
    AmqpTwinClient.prototype.updateTwinReportedProperties = function (patch, callback) {
        this._fsm.handle('updateTwinReportedProperties', patch, callback);
    };
    AmqpTwinClient.prototype.enableTwinDesiredPropertiesUpdates = function (callback) {
        this._fsm.handle('enableTwinDesiredPropertiesUpdates', callback);
    };
    AmqpTwinClient.prototype.disableTwinDesiredPropertiesUpdates = function (callback) {
        this._fsm.handle('disableTwinDesiredPropertiesUpdates', callback);
    };
    /**
     * Necessary for the client to be able to properly detach twin links
     * attach() isn't necessary because it's done by the FSM automatically when one of the APIs is called.
     */
    AmqpTwinClient.prototype.detach = function (callback) {
        this._fsm.handle('detach', callback);
    };
    AmqpTwinClient.prototype._generateTwinLinkProperties = function (correlationId) {
        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_010: [** The link options argument for attachSenderLink shall be:
             attach: {
                    properties: {
                      'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
                      'com.microsoft:api-version' : endpoint.apiVersion
                    },
                    sndSettleMode: 1,
                    rcvSettleMode: 0
                  } ] */
        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_008: [The link options argument for attachReceiverLink shall be:
             attach: {
                    properties: {
                      'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
                      'com.microsoft:api-version' : endpoint.apiVersion
                    },
                    sndSettleMode: 1,
                    rcvSettleMode: 0
                  } ] */
        // Note that the settle mode hard coded values correspond to the defined constant values in the amqp10 specification.
        return {
            properties: {
                'com.microsoft:channel-correlation-id': 'twin:' + correlationId,
                'com.microsoft:api-version': azure_iot_common_1.endpoint.apiVersion
            },
            snd_settle_mode: 1,
            rcv_settle_mode: 0
        };
    };
    AmqpTwinClient.prototype._onResponseMessage = function (message) {
        debug('onResponseMessage: The downstream message is: ' + JSON.stringify(message));
        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_013: [The `getTwin` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler until a message with the same `correlationId` as the one that was sent is received.]*/
        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_021: [The `updateTwinReportedProperties` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler until a message with the same `correlationId` as the one that was sent is received.]*/
        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_029: [The `enableTwinDesiredPropertiesUpdates` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler until a message with the same `correlationId` as the one that was sent is received.]*/
        /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_034: [The `disableTwinDesiredPropertiesUpdates` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler until a message with the same `correlationId` as the one that was sent is received.]*/
        if (this._pendingTwinRequests[message.correlation_id]) {
            var pendingRequestCallback = this._pendingTwinRequests[message.correlation_id];
            delete this._pendingTwinRequests[message.correlation_id];
            if (!message.message_annotations) {
                var result = (message.body && message.body.content.length > 0) ? JSON.parse(message.body.content) : undefined;
                pendingRequestCallback(null, result);
            }
            else if (message.message_annotations.status >= 200 && message.message_annotations.status <= 300) {
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_014: [The `getTwin` method shall parse the body of the received message and call its callback with a `null` error object and the parsed object as a result.]*/
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_022: [The `updateTwinReportedProperties` method shall call its callback with no argument when a response is received]*/
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_030: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with no argument when a response is received]*/
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_035: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback with no argument when a response is received]*/
                var result = (message.body && message.body.content.length > 0) ? JSON.parse(message.body.content) : undefined;
                pendingRequestCallback(null, result);
            }
            else {
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_038: [The `getTwin` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the `status` message annotation is `> 300`.]*/
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_039: [The `updateTwinReportedProperties` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the `status` message annotation is `> 300`.]*/
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_040: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the status message annotation is `> 300`.]*/
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_041: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the status message annotation is `> 300`.]*/
                pendingRequestCallback(this._translateErrorResponse(message));
            }
        }
        else {
            debug('received a response for an unknown request: ' + JSON.stringify(message));
        }
    };
    AmqpTwinClient.prototype._onDesiredPropertyDelta = function (message) {
        debug('onDesiredPropertyDelta: The message is: ' + JSON.stringify(message));
        this.emit('twinDesiredPropertiesUpdate', JSON.parse(message.body.content));
    };
    AmqpTwinClient.prototype._sendTwinRequest = function (method, resource, body, callback) {
        var _this = this;
        var amqpMessage = new azure_iot_amqp_base_1.AmqpMessage();
        amqpMessage.message_annotations = {
            operation: method
        };
        if (resource) {
            amqpMessage.message_annotations.resource = resource;
        }
        var correlationId = uuid.v4();
        //
        // Just a reminder here.  The correlation id will not be serialized into a amqp uuid encoding (0x98).
        // The service doesn't require it and leaving it as a string will be just fine.
        //
        amqpMessage.correlation_id = correlationId;
        if (body) {
            amqpMessage.body = rhea.message.data_section(Buffer.from(body));
        }
        this._pendingTwinRequests[correlationId] = callback;
        this._senderLink.send(amqpMessage, function (err) {
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_012: [If the `SenderLink.send` call fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_020: [If the `SenderLink.send` call fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_028: [If the `SenderLink.send` call fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_033: [If the `SenderLink.send` call fails, the `disableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
            if (err) {
                debug('could not get twin: ' + err.toString());
                delete _this._pendingTwinRequests[correlationId];
                callback(err);
            }
            else {
                debug(method + ' request sent with correlationId: ' + correlationId);
            }
        });
    };
    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_037: [The responses containing errors received on the receiver link shall be translated according to the following table:
      | statusCode | ErrorType               |
      | ---------- | ------------------------|
      | 400        | FormatError             |
      | 401        | UnauthorizedError       |
      | 403        | InvalidOperationError   |
      | 404        | DeviceNotFoundError     |
      | 429        | ThrottlingError         |
      | 500        | InternalServerError     |
      | 503        | ServiceUnavailableError |
      | 504        | TimeoutError            |
      | others     | TwinRequestError        |
    ]*/
    AmqpTwinClient.prototype._translateErrorResponse = function (amqpMessage) {
        var err;
        var statusCode;
        var errorMessage = 'Twin operation failed';
        if (amqpMessage.message_annotations) {
            statusCode = amqpMessage.message_annotations.status;
        }
        if (amqpMessage.body) {
            errorMessage = JSON.parse(amqpMessage.body.content);
        }
        switch (statusCode) {
            case 400:
                err = new azure_iot_common_1.errors.FormatError(errorMessage);
                break;
            case 401:
                err = new azure_iot_common_1.errors.UnauthorizedError(errorMessage);
                break;
            case 403:
                err = new azure_iot_common_1.errors.InvalidOperationError(errorMessage);
                break;
            case 404:
                err = new azure_iot_common_1.errors.DeviceNotFoundError(errorMessage);
                break;
            case 429:
                err = new azure_iot_common_1.errors.ThrottlingError(errorMessage);
                break;
            case 500:
                err = new azure_iot_common_1.errors.InternalServerError(errorMessage);
                break;
            case 503:
                err = new azure_iot_common_1.errors.ServiceUnavailableError(errorMessage);
                break;
            case 504:
                err = new azure_iot_common_1.errors.TimeoutError(errorMessage);
                break;
            default:
                err = new azure_iot_common_1.errors.TwinRequestError(errorMessage);
        }
        err.amqpError = amqpMessage;
        return err;
    };
    return AmqpTwinClient;
}(events_1.EventEmitter));
exports.AmqpTwinClient = AmqpTwinClient;
//# sourceMappingURL=amqp_twin_client.js.map