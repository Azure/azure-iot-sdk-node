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
var uuid = require("uuid");
var async = require("async");
var debug = dbg('azure-iot-provisioning-device-amqp:Amqp');
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_provisioning_device_1 = require("azure-iot-provisioning-device");
var azure_iot_amqp_base_1 = require("azure-iot-amqp-base");
var sasl_tpm_1 = require("./sasl_tpm");
var rhea_1 = require("rhea");
/**
 * @private
 */
var MessagePropertyNames;
(function (MessagePropertyNames) {
    MessagePropertyNames["OperationType"] = "iotdps-operation-type";
    MessagePropertyNames["OperationId"] = "iotdps-operation-id";
    MessagePropertyNames["Status"] = "iotdps-status";
    MessagePropertyNames["ForceRegistration"] = "iotdps-forceRegistration";
    MessagePropertyNames["retryAfter"] = "retry-after";
})(MessagePropertyNames || (MessagePropertyNames = {}));
/**
 * @private
 */
var DeviceOperations;
(function (DeviceOperations) {
    DeviceOperations["Register"] = "iotdps-register";
    DeviceOperations["GetRegistration"] = "iotdps-get-registration";
    DeviceOperations["GetOperationStatus"] = "iotdps-get-operationstatus";
})(DeviceOperations || (DeviceOperations = {}));
/**
 * Transport used to provision a device over AMQP.
 */
var Amqp = /** @class */ (function (_super) {
    __extends(Amqp, _super);
    /**
     * @private
     */
    function Amqp(amqpBase) {
        var _this = _super.call(this) || this;
        _this._config = {};
        _this._operations = {};
        _this._amqpBase = amqpBase || new azure_iot_amqp_base_1.Amqp(true);
        _this._config.pollingInterval = azure_iot_provisioning_device_1.ProvisioningDeviceConstants.defaultPollingInterval;
        var amqpErrorListener = function (err) { return _this._amqpStateMachine.handle('amqpError', err); };
        var responseHandler = function (msg) {
            debug('got message with correlation_id: ' + msg.correlation_id);
            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_007: [The `registrationRequest` method shall call its callback with a `RegistrationResult` object parsed from the body of the response message which `correlation_id` matches the `correlation_id` of the request message sent on the sender link.]*/
            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_017: [The `queryOperationStatus` method shall call its callback with a `RegistrationResult` object parsed from the body of the response message which `correlation_id` matches the `correlation_id` of the request message sent on the sender link.]*/
            var registrationResult = JSON.parse(msg.body.content);
            if (_this._operations[msg.correlation_id]) {
                debug('Got the registration/operationStatus message we were looking for.');
                var requestCallback = _this._operations[msg.correlation_id];
                delete _this._operations[msg.correlation_id];
                var retryAfterInMilliseconds = void 0;
                /*Codes_SRS_NODE_PROVISIONING_AMQP_06_010: [If the amqp response to a request contains the application property`retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.  Otherwise default.] */
                if (msg.application_properties && msg.application_properties[MessagePropertyNames.retryAfter]) {
                    retryAfterInMilliseconds = Number(msg.application_properties[MessagePropertyNames.retryAfter]) * 1000;
                    debug('registration/operation retry after value of: ' + msg.application_properties[MessagePropertyNames.retryAfter]);
                }
                else {
                    debug('registration/operation retry after value defaulting.');
                    retryAfterInMilliseconds = _this._config.pollingInterval;
                }
                requestCallback(null, registrationResult, msg, retryAfterInMilliseconds);
            }
            else {
                debug('ignoring message with unknown correlation_id');
            }
        };
        _this._amqpStateMachine = new machina.Fsm({
            namespace: 'provisioning-amqp',
            initialState: 'disconnected',
            states: {
                disconnected: {
                    _onEnter: function (err, registrationResult, callback) {
                        if (callback) {
                            callback(err, registrationResult);
                        }
                        else if (err) {
                            _this.emit('error', err);
                        }
                    },
                    registrationRequest: function (request, correlationId, callback) {
                        _this._operations[correlationId] = callback;
                        _this._amqpStateMachine.transition('connectingX509OrSymmetricKey', request, function (err) {
                            if (err) {
                                delete _this._operations[correlationId];
                                callback(err);
                            }
                            else {
                                _this._amqpStateMachine.handle('registrationRequest', request, correlationId, callback);
                            }
                        });
                    },
                    queryOperationStatus: function (request, correlationId, operationId, callback) {
                        _this._operations[correlationId] = callback;
                        _this._amqpStateMachine.transition('connectingX509OrSymmetricKey', request, function (err) {
                            if (err) {
                                delete _this._operations[correlationId];
                                callback(err);
                            }
                            else {
                                _this._amqpStateMachine.handle('queryOperationStatus', request, correlationId, operationId, callback);
                            }
                        });
                    },
                    getAuthenticationChallenge: function (request, callback) { return _this._amqpStateMachine.transition('connectingTpm', request, callback); },
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_017: [ `respondToAuthenticationChallenge` shall call `callback` with an `InvalidOperationError` if called before calling `getAuthenticationChallenge`. ]*/
                    respondToAuthenticationChallenge: function (request, sasToken, callback) { return callback(new azure_iot_common_1.errors.InvalidOperationError('Cannot respond to challenge while disconnected.')); },
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_003: [ `cancel` shall call its callback immediately if the AMQP connection is disconnected. ] */
                    cancel: function (callback) { return callback(); },
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_022: [`disconnect` shall call its callback immediately if the AMQP connection is disconnected.]*/
                    disconnect: function (callback) { return callback(); }
                },
                connectingX509OrSymmetricKey: {
                    _onEnter: function (request, callback) {
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_002: [The `registrationRequest` method shall connect the AMQP client with the certificate and key given in the `auth` parameter of the previously called `setAuthentication` method.]*/
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_012: [The `queryOperationStatus` method shall connect the AMQP client with the certificate and key given in the `auth` parameter of the previously called `setAuthentication` method. **]**]*/
                        var config = {
                            uri: _this._getConnectionUri(request),
                            sslOptions: _this._x509Auth,
                            userAgentString: azure_iot_provisioning_device_1.ProvisioningDeviceConstants.userAgent
                        };
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_99_001: [The `registrationRequest` method shall connect the AMQP client with the agent given in the `webSocketAgent` parameter of the previously called `setTransportOptions` method.]*/
                        config.sslOptions = config.sslOptions || {};
                        config.sslOptions.agent = _this._config.webSocketAgent;
                        if (_this._sas) {
                            /*Codes_SRS_NODE_PROVISIONING_AMQP_06_002: [** The `registrationRequest` method shall connect the amqp client, if utilizing the passed in sas from setSharedAccessSignature, shall in the connect options set the username to:
                              ```
                              <scopeId>/registrations/<registrationId>
                              ```
                              and shall set the password to the passed in sas token.
                              ] */
                            config.policyOverride = {
                                username: request.idScope + '/registrations/' + request.registrationId,
                                password: _this._sas
                            };
                        }
                        _this._amqpBase.connect(config, function (err) {
                            if (err) {
                                debug('_amqpBase.connect failed');
                                debug(err);
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_008: [The `registrationRequest` method shall call its callback with an error if the transport fails to connect.]*/
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_018: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to connect.]*/
                                _this._amqpStateMachine.transition('disconnected', err, null, callback);
                            }
                            else {
                                _this._amqpStateMachine.transition('attachingLinks', request, callback);
                            }
                        });
                    },
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_005: [ `cancel` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
                    cancel: function (callback) {
                        _this._cancelAllOperations();
                        _this._amqpStateMachine.transition('disconnecting', null, null, callback);
                    },
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_009: [ `disconnect` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
                    disconnect: function (callback) {
                        _this._cancelAllOperations();
                        _this._amqpStateMachine.transition('disconnecting', null, null, callback);
                    },
                    '*': function () { return _this._amqpStateMachine.deferUntilTransition(); }
                },
                connectingTpm: {
                    _onEnter: function (request, callback) { return _this._getAuthChallenge(request, callback); },
                    respondToAuthenticationChallenge: function (request, sasToken, callback) {
                        var completionCompleteHandler = _this._amqpStateMachine.on('tpmConnectionComplete', function (err) {
                            completionCompleteHandler.off();
                            if (err) {
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_18_019: [ `respondToAuthenticationChallenge` shall call `callback` with an Error object if the connection has a failure. ]*/
                                _this._amqpStateMachine.transition('disconnected', err, null, callback);
                            }
                            else {
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_18_020: [ `respondToAuthenticationChallenge` shall attach sender and receiver links if the connection completes successfully. ]*/
                                _this._amqpStateMachine.transition('attachingLinks', request, callback);
                            }
                        });
                        _this._respondToAuthChallenge(sasToken);
                    },
                    tpmConnectionComplete: function (err) {
                        _this._amqpStateMachine.emit('tpmConnectionComplete', err);
                    },
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_005: [ `cancel` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
                    cancel: function (callback) {
                        _this._cancelAllOperations();
                        _this._amqpStateMachine.transition('disconnecting', null, null, callback);
                    },
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_009: [ `disconnect` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
                    disconnect: function (callback) {
                        _this._cancelAllOperations();
                        _this._amqpStateMachine.transition('disconnecting', null, null, callback);
                    },
                    '*': function () { return _this._amqpStateMachine.deferUntilTransition(); }
                },
                attachingLinks: {
                    _onEnter: function (request, callback) {
                        var linkEndpoint = request.idScope + '/registrations/' + request.registrationId;
                        var linkOptions = {
                            properties: {
                                'com.microsoft:api-version': azure_iot_provisioning_device_1.ProvisioningDeviceConstants.apiVersion
                            }
                        };
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_004: [The `registrationRequest` method shall attach a receiver link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
                        ```
                        com.microsoft:api-version: <API_VERSION>
                        com.microsoft:client-version: <CLIENT_VERSION>
                        ```]*/
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_014: [The `queryOperationStatus` method shall attach a receiver link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
                        ```
                        com.microsoft:api-version: <API_VERSION>
                        com.microsoft:client-version: <CLIENT_VERSION>
                        ```*/
                        _this._amqpBase.attachReceiverLink(linkEndpoint, linkOptions, function (err, receiverLink) {
                            if (err) {
                                debug('_amqpBase.attachReceiverLink failed');
                                debug(err);
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_010: [The `registrationRequest` method shall call its callback with an error if the transport fails to attach the receiver link.]*/
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_020: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to attach the receiver link.]*/
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_18_022: [ `respondToAuthenticationChallenge` shall call its callback passing an `Error` object if the transport fails to attach the receiver link. ]*/
                                _this._amqpStateMachine.transition('disconnecting', err, null, callback);
                            }
                            else {
                                _this._receiverLink = receiverLink;
                                _this._receiverLink.on('error', amqpErrorListener);
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_006: [The `registrationRequest` method shall listen for the response on the receiver link and accept it when it comes.]*/
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_016: [The `queryOperationStatus` method shall listen for the response on the receiver link and accept it when it comes.]*/
                                _this._receiverLink.on('message', responseHandler);
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_003: [The `registrationRequest` method shall attach a sender link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
                                ```
                                com.microsoft:api-version: <API_VERSION>
                                com.microsoft:client-version: <CLIENT_VERSION>
                                ```]*/
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_013: [The `queryOperationStatus` method shall attach a sender link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
                                ```
                                com.microsoft:api-version: <API_VERSION>
                                com.microsoft:client-version: <CLIENT_VERSION>
                                ```*/
                                _this._amqpBase.attachSenderLink(linkEndpoint, linkOptions, function (err, senderLink) {
                                    if (err) {
                                        debug('_amqpBase.attachSenderLink failed');
                                        debug(err);
                                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_009: [The `registrationRequest` method shall call its callback with an error if the transport fails to attach the sender link.]*/
                                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_019: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to attach the sender link.]*/
                                        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_021: [ `respondToAuthenticationChallenge` shall call its callback passing an `Error` object if the transport fails to attach the sender link. ]*/
                                        _this._amqpStateMachine.transition('disconnecting', err, null, callback);
                                    }
                                    else {
                                        _this._senderLink = senderLink;
                                        _this._senderLink.on('error', amqpErrorListener);
                                        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_023: [ `respondToAuthenticationChallenge` shall call its callback passing `null` if the AMQP connection is established and links are attached. ]*/
                                        _this._amqpStateMachine.transition('connected', callback);
                                    }
                                });
                            }
                        });
                    },
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_005: [ `cancel` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
                    cancel: function (callback) {
                        _this._cancelAllOperations();
                        _this._amqpStateMachine.transition('disconnecting', null, null, callback);
                    },
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_009: [ `disconnect` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
                    disconnect: function (callback) {
                        _this._cancelAllOperations();
                        _this._amqpStateMachine.transition('disconnecting', null, null, callback);
                    },
                    '*': function () { return _this._amqpStateMachine.deferUntilTransition(); }
                },
                connected: {
                    _onEnter: function (callback) { return callback(); },
                    registrationRequest: function (request, correlationId, callback) {
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_005: [The `registrationRequest` method shall send a message on the previously attached sender link with a `correlation_id` set to a newly generated UUID and the following application properties:
                        ```
                        iotdps-operation-type: iotdps-register;
                        iotdps-forceRegistration: <true or false>;
                        ```
                        ]*/
                        var requestMessage = new azure_iot_amqp_base_1.AmqpMessage();
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_06_003: [ The `registrationRequest` will send a body in the message which contains a stringified JSON object with a `registrationId` property.] */
                        var requestBody = { registrationId: request.registrationId };
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_06_004: [The `registrationRequest` will, if utilizing TPM attestation, send a `tpm` property with the endorsement and storage key in the JSON body.] */
                        if (_this._endorsementKey) {
                            requestBody.tpm = { endorsementKey: _this._endorsementKey.toString('base64') };
                            if (_this._storageRootKey) {
                                requestBody.tpm.storageRootKey = _this._storageRootKey.toString('base64');
                            }
                        }
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_06_005: [The `registrationRequest` will, if utilizing custom allocation data, send a `payload` property in the JSON body.] */
                        if (request.payload) {
                            requestBody.payload = request.payload;
                        }
                        requestMessage.body = rhea_1.message.data_section(Buffer.from(JSON.stringify(requestBody)));
                        requestMessage.application_properties = {};
                        requestMessage.application_properties[MessagePropertyNames.OperationType] = DeviceOperations.Register;
                        requestMessage.application_properties[MessagePropertyNames.ForceRegistration] = !!request.forceRegistration;
                        requestMessage.correlation_id = correlationId;
                        debug('initial registration request: ' + JSON.stringify(requestMessage));
                        _this._operations[requestMessage.correlation_id] = callback;
                        _this._senderLink.send(requestMessage, function (err) {
                            if (err) {
                                delete _this._operations[requestMessage.correlation_id];
                                var translatedError = azure_iot_amqp_base_1.translateError('registration failure', err);
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_06_007: [If the `registrationRequest` send request is rejected with an `InternalError` or `ThrottlingError`, the result.status value will be set with `registering` and the callback will be invoked with *no* error object.] */
                                if ((translatedError instanceof azure_iot_common_1.errors.InternalServerError) || (translatedError instanceof azure_iot_common_1.errors.ThrottlingError)) {
                                    debug('retryable error on registration: ' + err.name);
                                    var retryAfterInMilliseconds = void 0;
                                    /*Codes_SRS_NODE_PROVISIONING_AMQP_06_009: [If the `registrationRequest` rejection error contains the info property`retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.  Otherwise default.] */
                                    if (err.info && err.info[MessagePropertyNames.retryAfter]) {
                                        retryAfterInMilliseconds = Number(err.info[MessagePropertyNames.retryAfter]) * 1000;
                                    }
                                    else {
                                        retryAfterInMilliseconds = _this._config.pollingInterval;
                                    }
                                    callback(null, { status: 'registering' }, null, retryAfterInMilliseconds);
                                }
                                else {
                                    debug('non-retryable error on registration: ' + err.name);
                                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_011: [The `registrationRequest` method shall call its callback with an error if the transport fails to send the request message.]*/
                                    callback(err);
                                }
                            }
                            else {
                                debug('registration request sent with correlation_id: ' + requestMessage.correlation_id);
                            }
                        });
                    },
                    queryOperationStatus: function (request, correlationId, operationId, callback) {
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_015: [The `queryOperationStatus` method shall send a message on the pre-attached sender link with a `correlation_id` set to a newly generated UUID and the following application properties:
                        ```
                        iotdps-operation-type: iotdps-get-operationstatus;
                        iotdps-operation-id: <operationId>;
                        ```*/
                        var requestMessage = new azure_iot_amqp_base_1.AmqpMessage();
                        requestMessage.body = '';
                        requestMessage.application_properties = {};
                        requestMessage.application_properties[MessagePropertyNames.OperationType] = DeviceOperations.GetOperationStatus;
                        requestMessage.application_properties[MessagePropertyNames.OperationId] = operationId;
                        requestMessage.correlation_id = correlationId;
                        debug('registration status request: ' + JSON.stringify(requestMessage));
                        _this._operations[requestMessage.correlation_id] = callback;
                        _this._senderLink.send(requestMessage, function (err) {
                            if (err) {
                                delete _this._operations[requestMessage.correlation_id];
                                var translatedError = azure_iot_amqp_base_1.translateError('query operation status failure', err);
                                /*Codes_SRS_NODE_PROVISIONING_AMQP_06_006: [If the `queryOperationStatus` send request is rejected with an `InternalError` or `ThrottlingError`, the result.status value will be set with `assigning` and the callback will be invoked with *no* error object.] */
                                if ((translatedError instanceof azure_iot_common_1.errors.InternalServerError) || (translatedError instanceof azure_iot_common_1.errors.ThrottlingError)) {
                                    debug('retryable error on queryOperationStatus: ' + err.name);
                                    var retryAfterInMilliseconds = void 0;
                                    /*Codes_SRS_NODE_PROVISIONING_AMQP_06_008: [If the `queryOperationsStatus` rejection error contains the info property`retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.  Otherwise default.] */
                                    if (err.info && err.info[MessagePropertyNames.retryAfter]) {
                                        retryAfterInMilliseconds = Number(err.info[MessagePropertyNames.retryAfter]) * 1000;
                                    }
                                    else {
                                        retryAfterInMilliseconds = _this._config.pollingInterval;
                                    }
                                    callback(null, { status: 'assigning', operationId: operationId }, null, retryAfterInMilliseconds);
                                }
                                else {
                                    debug('non-retryable error on queryOperationStatus: ' + err.name);
                                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_021: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to send the request message.]*/
                                    callback(err);
                                }
                            }
                            else {
                                debug('registration status request sent with correlation_id: ' + requestMessage.correlation_id);
                            }
                        });
                    },
                    amqpError: function (err) {
                        _this._amqpStateMachine.transition('disconnecting', err);
                    },
                    cancel: function (callback) {
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_004: [ `cancel` shall call its callback immediately if the AMQP connection is connected but idle. ] */
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_006: [ `cancel` shall cause a `registrationRequest` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_007: [ `cancel` shall cause a `queryOperationStatus` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_008: [ `cancel` shall not disconnect the AMQP transport. ] */
                        _this._cancelAllOperations();
                        callback();
                    },
                    disconnect: function (callback) {
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_001: [ `disconnect` shall cause a `registrationRequest` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_002: [ `disconnect` shall cause a `queryOperationStatus` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
                        _this._cancelAllOperations();
                        _this._amqpStateMachine.transition('disconnecting', null, null, callback);
                    }
                },
                disconnecting: {
                    _onEnter: function (err, registrationResult, callback) {
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_023: [`disconnect` shall detach the sender and receiver links and disconnect the AMQP connection.]*/
                        var finalError = err;
                        async.series([
                            function (callback) {
                                if (_this._senderLink) {
                                    var tmpLink_1 = _this._senderLink;
                                    _this._senderLink = null;
                                    if (finalError) {
                                        tmpLink_1.removeListener('error', amqpErrorListener);
                                        tmpLink_1.forceDetach(finalError);
                                        callback();
                                    }
                                    else {
                                        tmpLink_1.detach(function (err) {
                                            finalError = finalError || err;
                                            tmpLink_1.removeListener('error', amqpErrorListener);
                                            callback();
                                        });
                                    }
                                }
                                else {
                                    callback();
                                }
                            },
                            function (callback) {
                                if (_this._receiverLink) {
                                    var tmpLink_2 = _this._receiverLink;
                                    _this._receiverLink = null;
                                    if (finalError) {
                                        tmpLink_2.removeListener('error', amqpErrorListener);
                                        tmpLink_2.removeListener('message', responseHandler);
                                        tmpLink_2.forceDetach(finalError);
                                        callback();
                                    }
                                    else {
                                        tmpLink_2.detach(function (err) {
                                            finalError = finalError || err;
                                            tmpLink_2.removeListener('error', amqpErrorListener);
                                            tmpLink_2.removeListener('message', responseHandler);
                                            callback();
                                        });
                                    }
                                }
                                else {
                                    callback();
                                }
                            },
                            function (callback) {
                                _this._amqpBase.disconnect(function (err) {
                                    finalError = finalError || err;
                                    callback();
                                });
                            }
                        ], function () {
                            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_024: [`disconnect` shall call its callback with no arguments if all detach/disconnect operations were successful.]*/
                            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_025: [`disconnect` shall call its callback with the error passed from the first unsuccessful detach/disconnect operation if one of those fail.]*/
                            _this._amqpStateMachine.transition('disconnected', finalError, registrationResult, callback);
                        });
                    },
                    '*': function () { return _this._amqpStateMachine.deferUntilTransition(); }
                }
            }
        });
        _this._amqpStateMachine.on('transition', function (data) { return debug('AMQP State Machine: ' + data.fromState + ' -> ' + data.toState + ' (' + data.action + ')'); });
        _this._amqpStateMachine.on('handling', function (data) { return debug('AMQP State Machine: handling ' + data.inputType); });
        return _this;
    }
    /**
     * @private
     */
    Amqp.prototype.setTransportOptions = function (options) {
        var _this = this;
        [
            'pollingInterval',
            'webSocketAgent'
        ].forEach(function (optionName) {
            if (options.hasOwnProperty(optionName)) {
                _this._config[optionName] = options[optionName];
            }
        });
    };
    /**
     * @private
     */
    Amqp.prototype.setAuthentication = function (auth) {
        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_001: [The certificate and key passed as properties of the `auth` argument shall be used to connect to the Device Provisioning Service endpoint, when a registration request or registration operation status request are made.]*/
        this._x509Auth = auth;
    };
    /**
     * @private
     */
    Amqp.prototype.setSharedAccessSignature = function (sas) {
        /*Codes_SRS_NODE_PROVISIONING_AMQP_06_001: [ The sas passed shall be saved into the current transport object. ] */
        this._sas = sas;
    };
    /**
     * @private
     */
    Amqp.prototype.registrationRequest = function (request, callback) {
        var correlationId = uuid.v4();
        this._amqpStateMachine.handle('registrationRequest', request, correlationId, callback);
    };
    /**
     * @private
     */
    Amqp.prototype.queryOperationStatus = function (request, operationId, callback) {
        var correlationId = uuid.v4();
        this._amqpStateMachine.handle('queryOperationStatus', request, correlationId, operationId, callback);
    };
    /**
     * @private
     */
    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_010: [ The `endorsementKey` and `storageRootKey` passed into `setTpmInformation` shall be used when getting the authentication challenge from the AMQP service. ]*/
    Amqp.prototype.setTpmInformation = function (endorsementKey, storageRootKey) {
        this._endorsementKey = endorsementKey;
        this._storageRootKey = storageRootKey;
    };
    /**
     * @private
     */
    Amqp.prototype.getAuthenticationChallenge = function (request, callback) {
        this._amqpStateMachine.handle('getAuthenticationChallenge', request, callback);
    };
    /**
     * @private
     */
    Amqp.prototype.respondToAuthenticationChallenge = function (request, sasToken, callback) {
        this._amqpStateMachine.handle('respondToAuthenticationChallenge', request, sasToken, callback);
    };
    /**
     * @private
     */
    Amqp.prototype.cancel = function (callback) {
        this._amqpStateMachine.handle('cancel', callback);
    };
    /**
     * @private
     */
    Amqp.prototype.disconnect = function (callback) {
        this._amqpStateMachine.handle('disconnect', callback);
    };
    /**
     * @private
     */
    Amqp.prototype._getConnectionUri = function (request) {
        return 'amqps://' + request.provisioningHost;
    };
    /**
     * @private
     */
    Amqp.prototype._cancelAllOperations = function () {
        debug('cancelling all operations');
        var _loop_1 = function (op) {
            debug('cancelling ' + op);
            var callback = this_1._operations[op];
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
    Amqp.prototype._getAuthChallenge = function (request, callback) {
        var _this = this;
        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_012: [ `getAuthenticationChallenge` shall send the challenge to the AMQP service using a hostname of "<idScope>/registrations/<registrationId>". ]*/
        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_013: [ `getAuthenticationChallenge` shall send the initial buffer for the authentication challenge in the form "<0><idScope><0><registrationId><0><endorsementKey>" where <0> is a zero byte. ]*/
        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_014: [ `getAuthenticationChallenge` shall send the initial response to the AMQP service in the form  "<0><storageRootKey>" where <0> is a zero byte. ]*/
        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_011: [ `getAuthenticationChallenge` shall initiate connection with the AMQP client using the TPM SASL mechanism. ]*/
        this._customSaslMechanism = new sasl_tpm_1.SaslTpm(request.idScope, request.registrationId, this._endorsementKey, this._storageRootKey, function (challenge, getSasTokenCallback) {
            _this._getSasTokenCallback = getSasTokenCallback;
            /*Codes_SRS_NODE_PROVISIONING_AMQP_18_015: [ `getAuthenticationChallenge` shall call `callback` passing `null` and the challenge buffer after the challenge has been received from the service. ]*/
            callback(null, challenge);
        });
        var config = {
            uri: this._getConnectionUri(request),
            saslMechanismName: this._customSaslMechanism.name,
            saslMechanism: this._customSaslMechanism,
            userAgentString: azure_iot_provisioning_device_1.ProvisioningDeviceConstants.userAgent
        };
        this._amqpBase.connect(config, function (err) {
            _this._amqpStateMachine.handle('tpmConnectionComplete', err);
        });
    };
    Amqp.prototype._respondToAuthChallenge = function (sasToken) {
        /*Codes_SRS_NODE_PROVISIONING_AMQP_18_018: [ `respondToAuthenticationChallenge` shall respond to the auth challenge to the service in the form "<0><sasToken>" where <0> is a zero byte. ]*/
        this._getSasTokenCallback(null, sasToken);
    };
    return Amqp;
}(events_1.EventEmitter));
exports.Amqp = Amqp;
//# sourceMappingURL=amqp.js.map