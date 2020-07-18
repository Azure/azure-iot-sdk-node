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
var azure_iot_common_1 = require("azure-iot-common");
var machina = require("machina");
var constants_1 = require("./constants");
var dbg = require("debug");
var debug = dbg('azure-iot-provisioning-device:PollingStateMachine');
/**
 * @private
 */
var PollingStateMachine = /** @class */ (function (_super) {
    __extends(PollingStateMachine, _super);
    function PollingStateMachine(transport) {
        var _this = _super.call(this) || this;
        _this._transport = transport;
        _this._fsm = new machina.Fsm({
            namespace: 'provisioning-client-polling',
            initialState: 'disconnected',
            states: {
                disconnected: {
                    _onEnter: function (err, result, response, callback) {
                        if (callback) {
                            callback(err, result, response);
                        }
                    },
                    register: function (request, callback) { return _this._fsm.transition('sendingRegistrationRequest', request, callback); },
                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_025: [ If `cancel` is called while disconnected, it shall immediately call its `callback`. ] */
                    cancel: function (cancelledOpErr, callback) { return callback(); },
                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_031: [ If `disconnect` is called while disconnected, it shall immediately call its `callback`. ] */
                    disconnect: function (callback) { return callback(); }
                },
                idle: {
                    _onEnter: function (err, result, response, callback) { return callback(err, result, response); },
                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_030: [ If `cancel` is called while the transport is connected but idle, it shall immediately call its `callback`. ] */
                    cancel: function (cancelledOpErr, callback) { return callback(); },
                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_032: [ If `disconnect` is called while while the transport is connected but idle, it shall call `PollingTransport.disconnect` and call it's `callback` passing the results of the transport operation. ] */
                    disconnect: function (callback) { return _this._fsm.transition('disconnecting', callback); },
                    register: function (request, callback) { return _this._fsm.transition('sendingRegistrationRequest', request, callback); }
                },
                sendingRegistrationRequest: {
                    _onEnter: function (request, callback) {
                        _this._queryTimer = setTimeout(function () {
                            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_036: [ If `PollingTransport.registrationRequest` does not call its callback within `ProvisioningDeviceConstants.defaultTimeoutInterval` ms, register shall with with a `TimeoutError` error. ] */
                            if (_this._currentOperationCallback === callback) {
                                debug('timeout while sending request');
                                /* tslint:disable:no-empty */
                                _this._fsm.handle('cancel', new azure_iot_common_1.errors.TimeoutError(), function () { });
                            }
                        }, constants_1.ProvisioningDeviceConstants.defaultTimeoutInterval);
                        /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_012: [ `register` shall call `PollingTransport.registrationRequest`. ] */
                        _this._currentOperationCallback = callback;
                        _this._transport.registrationRequest(request, function (err, result, response, pollingInterval) {
                            clearTimeout(_this._queryTimer);
                            // Check if the operation is still pending before transitioning.  We might be in a different state now and we don't want to mess that up.
                            if (_this._currentOperationCallback === callback) {
                                _this._fsm.transition('responseReceived', err, request, result, response, pollingInterval, callback);
                            }
                            else if (_this._currentOperationCallback) {
                                debug('Unexpected: received unexpected response for cancelled operation');
                            }
                        });
                    },
                    cancel: function (cancelledOpErr, callback) { return _this._fsm.transition('cancelling', cancelledOpErr, callback); },
                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_033: [ If `disconnect` is called while in the middle of a `registrationRequest` operation, the operation shall be cancelled and the transport shall be disconnected. ] */
                    disconnect: function (callback) {
                        _this._fsm.handle('cancel', new azure_iot_common_1.errors.OperationCancelledError(''), function (err) {
                            _this._fsm.handle('disconnect', callback);
                        });
                    },
                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
                    register: function (request, callback) { return callback(new azure_iot_common_1.errors.InvalidOperationError('another operation is in progress')); }
                },
                responseReceived: {
                    _onEnter: function (err, request, result, response, pollingInterval, callback) {
                        if (err) {
                            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_013: [ If `PollingTransport.registrationRequest` fails, `register` shall fail. ] */
                            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_019: [ If `PollingTransport.queryOperationStatus` fails, `register` shall fail. ] */
                            _this._fsm.transition('responseError', err, result, response, callback);
                        }
                        else {
                            debug('received response from service:' + JSON.stringify(result));
                            switch (result.status.toLowerCase()) {
                                case 'registering': {
                                    /*Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_06_001: [If `PollingTransport.registrationRequest` succeeds with status==registering, `register` shall wait, then attempt `PollingTransport.registrationRequest` again.] */
                                    _this._fsm.transition('waitingToPoll', request, null, pollingInterval, callback);
                                    break;
                                }
                                case 'assigned': {
                                    _this._fsm.transition('responseComplete', result, response, callback);
                                    break;
                                }
                                case 'assigning': {
                                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_015: [ If `PollingTransport.registrationRequest` succeeds with status==Assigning, it shall begin polling for operation status requests. ] */
                                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [ If `PollingTransport.queryOperationStatus` succeeds with status==Assigning, `register` shall begin polling for operation status requests. ] */
                                    _this._fsm.transition('waitingToPoll', request, result.operationId, pollingInterval, callback);
                                    break;
                                }
                                case 'failed': {
                                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_028: [ If `TransportHandlers.registrationRequest` succeeds with status==Failed, it shall fail with a `DeviceRegistrationFailedError` error ] */
                                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_029: [ If `TransportHandlers.queryOperationStatus` succeeds with status==Failed, it shall fail with a `DeviceRegistrationFailedError` error ] */
                                    var err_1 = new azure_iot_common_1.errors.DeviceRegistrationFailedError('registration failed');
                                    err_1.result = result;
                                    err_1.response = response;
                                    _this._fsm.transition('responseError', err_1, result, response, callback);
                                    break;
                                }
                                default: {
                                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_016: [ If `PollingTransport.registrationRequest` succeeds returns with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
                                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_022: [ If `PollingTransport.queryOperationStatus` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
                                    var err_2 = new SyntaxError('status is ' + result.status);
                                    err_2.result = result;
                                    err_2.response = response;
                                    _this._fsm.transition('responseError', err_2, result, response, callback);
                                    break;
                                }
                            }
                        }
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                responseComplete: {
                    _onEnter: function (result, response, callback) {
                        _this._currentOperationCallback = null;
                        /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [ If `PollingTransport.registrationRequest` succeeds with status==Assigned, it shall call `callback` with null, the response body, and the protocol-specific result. ] */
                        /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_020: [ If `PollingTransport.queryOperationStatus` succeeds with status==Assigned, `register` shall complete and pass the body of the response and the protocol-specific result to the `callback`. ] */
                        _this._fsm.transition('idle', null, result, response, callback);
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                responseError: {
                    _onEnter: function (err, result, response, callback) {
                        _this._currentOperationCallback = null;
                        _this._fsm.transition('idle', err, result, response, callback);
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                waitingToPoll: {
                    _onEnter: function (request, operationId, pollingInterval, callback) {
                        debug('waiting for ' + pollingInterval + ' ms');
                        _this._pollingTimer = setTimeout(function () {
                            if (operationId) {
                                _this._fsm.transition('polling', request, operationId, pollingInterval, callback);
                            }
                            else {
                                //
                                // retrying registration must necessarily have a falsy operation id.  If they had
                                // an operation id they wouldn't need to retry!
                                //
                                _this._fsm.transition('sendingRegistrationRequest', request, callback);
                            }
                        }, pollingInterval);
                    },
                    cancel: function (cancelledOpErr, callback) {
                        /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `cancel` shall cause that registration to fail with an `OperationCancelledError`. ] */
                        clearTimeout(_this._pollingTimer);
                        _this._pollingTimer = null;
                        _this._fsm.transition('cancelling', cancelledOpErr, callback);
                    },
                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_034: [ If `disconnect` is called while the state machine is waiting to poll, the current operation shall be cancelled and the transport shall be disconnected. ] */
                    disconnect: function (callback) {
                        _this._fsm.handle('cancel', new azure_iot_common_1.errors.OperationCancelledError(''), function (err) {
                            _this._fsm.handle('disconnect', callback);
                        });
                    },
                    register: function (request, callback) { return callback(new azure_iot_common_1.errors.InvalidOperationError('another operation is in progress')); }
                },
                polling: {
                    _onEnter: function (request, operationId, pollingInterval, callback) {
                        /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_037: [ If `PollingTransport.queryOperationStatus` does not call its callback within `ProvisioningDeviceConstants.defaultTimeoutInterval` ms, register shall with with a `TimeoutError` error. ] */
                        _this._queryTimer = setTimeout(function () {
                            debug('timeout while query');
                            if (_this._currentOperationCallback === callback) {
                                /* tslint:disable:no-empty */
                                _this._fsm.handle('cancel', new azure_iot_common_1.errors.TimeoutError(), function () { });
                            }
                        }, constants_1.ProvisioningDeviceConstants.defaultTimeoutInterval);
                        /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_018: [ When the polling interval elapses, `register` shall call `PollingTransport.queryOperationStatus`. ] */
                        _this._transport.queryOperationStatus(request, operationId, function (err, result, response, pollingInterval) {
                            clearTimeout(_this._queryTimer);
                            // Check if the operation is still pending before transitioning.  We might be in a different state now and we don't want to mess that up.
                            if (_this._currentOperationCallback === callback) {
                                _this._fsm.transition('responseReceived', err, request, result, response, pollingInterval, callback);
                            }
                            else if (_this._currentOperationCallback) {
                                debug('Unexpected: received unexpected response for cancelled operation');
                            }
                        });
                    },
                    cancel: function (cancelledOpErr, callback) { return _this._fsm.transition('cancelling', cancelledOpErr, callback); },
                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_035: [ If `disconnect` is called while in the middle of a `queryOperationStatus` operation, the operation shall be cancelled and the transport shall be disconnected. ] */
                    disconnect: function (callback) {
                        _this._fsm.handle('cancel', new azure_iot_common_1.errors.OperationCancelledError(''), function (err) {
                            _this._fsm.handle('disconnect', callback);
                        });
                    },
                    /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
                    register: function (request, callback) { return callback(new azure_iot_common_1.errors.InvalidOperationError('another operation is in progress')); }
                },
                cancelling: {
                    _onEnter: function (cancelledOpErr, callback) {
                        /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `cancel` shall cause that registration to fail with an `OperationCancelledError`. ] */
                        if (_this._currentOperationCallback) {
                            var _callback_1 = _this._currentOperationCallback;
                            _this._currentOperationCallback = null;
                            process.nextTick(function () { return _callback_1(cancelledOpErr); });
                        }
                        _this._transport.cancel(function (cancelErr) {
                            if (cancelErr) {
                                debug('error received from transport during cancel:' + cancelErr.toString());
                            }
                            _this._fsm.transition('idle', cancelErr, null, null, callback);
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                disconnecting: {
                    _onEnter: function (callback) {
                        if (_this._pollingTimer) {
                            debug('cancelling polling timer');
                            clearTimeout(_this._pollingTimer);
                        }
                        if (_this._queryTimer) {
                            debug('cancelling query timer');
                            clearTimeout(_this._queryTimer);
                        }
                        _this._transport.disconnect(function (err) {
                            _this._fsm.transition('disconnected', err, null, null, callback);
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                }
            }
        });
        _this._fsm.on('transition', function (data) {
            debug('completed transition from ' + data.fromState + ' to ' + data.toState);
        });
        return _this;
    }
    PollingStateMachine.prototype.register = function (request, callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            debug('register called for registrationId "' + request.registrationId + '"');
            _this._fsm.handle('register', request, _callback);
        }, callback);
    };
    PollingStateMachine.prototype.cancel = function (callback) {
        var _this = this;
        return azure_iot_common_1.errorCallbackToPromise(function (_callback) {
            debug('cancel called');
            _this._fsm.handle('cancel', new azure_iot_common_1.errors.OperationCancelledError(''), _callback);
        }, callback);
    };
    PollingStateMachine.prototype.disconnect = function (callback) {
        var _this = this;
        return azure_iot_common_1.errorCallbackToPromise(function (_callback) {
            debug('disconnect called');
            _this._fsm.handle('disconnect', _callback);
        }, callback);
    };
    return PollingStateMachine;
}(events_1.EventEmitter));
exports.PollingStateMachine = PollingStateMachine;
//# sourceMappingURL=polling_state_machine.js.map