// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @private
 * X509 security client using user-generated cert for Azure IoT
 */
var X509Security = /** @class */ (function () {
    /**
     * Construct a new X509 security object
     *
     * @param cert certificate to use
     */
    function X509Security(registrationId, cert) {
        this._cert = cert;
        this._registrationId = registrationId;
    }
    /**
     * return the X509 certificate
     *
     * @param callback called when the operation is complete
     */
    X509Security.prototype.getCertificate = function (callback) {
        callback(null, this._cert);
    };
    /**
     * return the registration Id for the device
     */
    X509Security.prototype.getRegistrationId = function () {
        return this._registrationId;
    };
    return X509Security;
}());
exports.X509Security = X509Security;
//# sourceMappingURL=x509.js.map