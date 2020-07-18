// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_common_2 = require("azure-iot-common");
/**
 * @private
 */
var SymmetricKeySecurityClient = /** @class */ (function () {
    function SymmetricKeySecurityClient(registrationId, symmetricKey) {
        this._registrationId = registrationId;
        this._symmetricKey = symmetricKey;
    }
    /**
     * @method           module:azure-iot-security-symmetric-key.SymmetricKeySecurityClient#getRegistrationId
     * @description      Returns the registrationId originally provided to the client.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the registrationId
     *                                            parameter will be undefined.
     */
    SymmetricKeySecurityClient.prototype.getRegistrationId = function (callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            _callback(null, _this._registrationId);
        }, callback);
    };
    /**
     * @method           module:azure-iot-security-symmetric-key.SymmetricKeySecurityClient#createSharedAccessSignature
     * @description      Returns a SAS token constructed from an id scope and the symmetric key
     *
     * @param {string}            idScope         Used to provide scope into the dps instance.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the sas token
     *                                            parameter will be undefined.
     */
    SymmetricKeySecurityClient.prototype.createSharedAccessSignature = function (idScope, callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_SYMMETRIC_KEY_SECURITY_CLIENT_06_005: [Will throw `ReferenceError` if `idScope` parameter is falsy. ] */
            if (!idScope) {
                throw new ReferenceError('idScope is ' + idScope);
            }
            /*Codes_SRS_NODE_SYMMETRIC_KEY_SECURITY_CLIENT_06_006: [The `idScope` parameter must be of type string.] */
            if (typeof idScope !== 'string') {
                throw new azure_iot_common_2.errors.ArgumentError('idScope must be of type string');
            }
            _callback(null, azure_iot_common_1.SharedAccessSignature.create(idScope + '/registrations/' + _this._registrationId, 'registration', _this._symmetricKey, azure_iot_common_1.anHourFromNow()));
        }, callback);
    };
    return SymmetricKeySecurityClient;
}());
exports.SymmetricKeySecurityClient = SymmetricKeySecurityClient;
//# sourceMappingURL=symmetric_key.js.map