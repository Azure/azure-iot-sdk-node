// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var polling_state_machine_1 = require("./polling_state_machine");
var dbg = require("debug");
var azure_iot_common_1 = require("azure-iot-common");
var debug = dbg('azure-iot-provisioning-device:SymmetricKeyRegistration');
/**
 * Client used to run the registration of a device using Symmetric Key authentication.
 */
var SymmetricKeyRegistration = /** @class */ (function () {
    function SymmetricKeyRegistration(provisioningHost, idScope, transport, securityClient) {
        this._provisioningHost = provisioningHost;
        this._idScope = idScope;
        this._transport = transport;
        this._securityClient = securityClient;
        this._pollingStateMachine = new polling_state_machine_1.PollingStateMachine(this._transport);
    }
    /**
     * Sets the custom payload for registration that will be sent to the custom allocation policy implemented in an Azure Function.
     *
     * @param payload The payload sent to the provisioning service at registration.
     */
    SymmetricKeyRegistration.prototype.setProvisioningPayload = function (payload) {
        this._provisioningPayload = payload;
    };
    /**
     * Register the device with the provisioning service.
     *
     * @param registrationId The registration Id for the device
     * @param forceRegistration Set to true to force re-registration
     * @param [callback] optional function called when registration is complete.
     * @returns {Promise<RegistrationResult> | void} Promise if no callback function was passed, void otherwise.
     */
    SymmetricKeyRegistration.prototype.register = function (callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_006: [ `register` shall call the `getRegistrationId` method on the security object to acquire the registration id. ] */
            _this._securityClient.getRegistrationId(function (getRegistrationIdError, regId) {
                /* Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_007: [ If the `getRegistrationId` fails, the `register` shall call the `_callback` with the error. ] */
                if (getRegistrationIdError) {
                    _callback(getRegistrationIdError);
                }
                else {
                    var request_1 = {
                        registrationId: regId,
                        provisioningHost: _this._provisioningHost,
                        idScope: _this._idScope
                    };
                    /* Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_012: [ If `setProvisioningPayload` is invoked prior to invoking `register` than the `payload` property of the `RegistrationRequest` shall be set to the argument provided to the `setProvisioningPayload`.] */
                    if (_this._provisioningPayload) {
                        request_1.payload = _this._provisioningPayload;
                    }
                    /*Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_008: [ `register` shall invoke `createSharedAccessSignature` method on the security object to acquire a sas token object. ] */
                    _this._securityClient.createSharedAccessSignature(_this._idScope, function (createSasError, sas) {
                        /*Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_009: [ If the `createSharedAccessSignature` fails, the `register` shall call the `_callback` with the error. ] */
                        if (createSasError) {
                            _callback(createSasError);
                        }
                        else {
                            /* Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_004: [ `register` shall pass the SAS into the `setSharedAccessSignature` method on the transport. ] */
                            _this._transport.setSharedAccessSignature(sas.toString());
                            /* Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_005: [ `register` shall call `register` on the polling state machine object. ] */
                            _this._pollingStateMachine.register(request_1, function (registerError, result) {
                                _this._pollingStateMachine.disconnect(function (disconnectErr) {
                                    if (disconnectErr) {
                                        debug('error disconnecting.  Ignoring.  ' + disconnectErr);
                                    }
                                    /*Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_010: [ if the polling register returns an error, the `register` shall invoke the `_callback` with that error. ] */
                                    if (registerError) {
                                        _callback(registerError);
                                    }
                                    else {
                                        /*Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_011: [ Otherwise `register` shall invoke the `_callback` with the resultant `registrationState` as the second argument. ] */
                                        _callback(null, result.registrationState);
                                    }
                                });
                            });
                        }
                    });
                }
            });
        }, callback);
    };
    /**
     * Cancels the current registration process.
     *
     * @param [callback] optional function called when the registration has already been canceled.
     * @returns {Promise<void> | void} Promise if no callback function was passed, void otherwise.
     */
    /* Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_001: [** `cancel` shall call `cancel` on the transport object. **] */
    SymmetricKeyRegistration.prototype.cancel = function (callback) {
        var _this = this;
        return azure_iot_common_1.errorCallbackToPromise(function (_callback) {
            _this._transport.cancel(_callback);
        }, callback);
    };
    return SymmetricKeyRegistration;
}());
exports.SymmetricKeyRegistration = SymmetricKeyRegistration;
//# sourceMappingURL=symmetric_registration.js.map