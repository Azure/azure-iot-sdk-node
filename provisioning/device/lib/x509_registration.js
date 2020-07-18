// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var polling_state_machine_1 = require("./polling_state_machine");
var dbg = require("debug");
var azure_iot_common_1 = require("azure-iot-common");
var debug = dbg('azure-iot-provisioning-device:X509Registration');
/**
 * Client used to run the registration of a device using X509 authentication.
 */
var X509Registration = /** @class */ (function () {
    function X509Registration(provisioningHost, idScope, transport, securityClient) {
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
    X509Registration.prototype.setProvisioningPayload = function (payload) {
        this._provisioningPayload = payload;
    };
    X509Registration.prototype.register = function (callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_001: [ `register` shall call `getCertificate` on the security object to acquire the X509 certificate. ] */
            _this._securityClient.getCertificate(function (err, cert) {
                if (err) {
                    /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_006: [ If `getCertificate`fails, `register` shall call `_callback` with the error ] */
                    debug('security client returned error on cert acquisition');
                    _callback(err);
                }
                else {
                    var registrationId = _this._securityClient.getRegistrationId();
                    var request = {
                        registrationId: registrationId,
                        provisioningHost: _this._provisioningHost,
                        idScope: _this._idScope
                    };
                    /* Codes_SRS_NODE_DPS_X509_REGISTRATION_06_001: [ If `setProvisioningPayload` is invoked prior to invoking `register` than the `payload` property of the `RegistrationRequest` shall be set to the argument provided to the `setProvisioningPayload`.] */
                    if (_this._provisioningPayload) {
                        request.payload = _this._provisioningPayload;
                    }
                    /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_004: [ `register` shall pass the certificate into the `setAuthentication` method on the transport ] */
                    _this._transport.setAuthentication(cert);
                    /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_002: [ `register` shall call `registerX509` on the transport object and call it's callback with the result of the transport operation. ] */
                    _this._pollingStateMachine.register(request, function (err, result) {
                        _this._pollingStateMachine.disconnect(function (disconnectErr) {
                            if (disconnectErr) {
                                debug('error disconnecting.  Ignoring.  ' + disconnectErr);
                            }
                            if (err) {
                                /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_005: [ If `register` on the pollingStateMachine fails, `register` shall call `_callback` with the error ] */
                                _callback(err);
                            }
                            else {
                                _callback(null, result.registrationState);
                            }
                        });
                    });
                }
            });
        }, callback);
    };
    X509Registration.prototype.cancel = function (callback) {
        var _this = this;
        return azure_iot_common_1.errorCallbackToPromise(function (_callback) {
            _this._transport.cancel(_callback);
        }, callback);
    };
    return X509Registration;
}());
exports.X509Registration = X509Registration;
//# sourceMappingURL=x509_registration.js.map