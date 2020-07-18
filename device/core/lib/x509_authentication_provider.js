"use strict";
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
/**
 * Provides an `AuthenticationProvider` object that can be created simply with an X509 certificate and key and is then used by the device client and transports to authenticate
 * with the Azure IoT hub instance.
 *
 * Unlike the `SharedAccessSignatureAuthenticationProvider` and `SharedAccessKeyAuthenticationProvider` objects, the `X509AuthenticationProvider` does not emit a `newTokenAvailable` event
 * since there are no token involved in X509 authentication. The transports will get the credentials using the `getDeviceCredentials` method.
 */
var X509AuthenticationProvider = /** @class */ (function () {
    /**
     * @private
     */
    function X509AuthenticationProvider(credentials) {
        this.type = azure_iot_common_1.AuthenticationType.X509;
        /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_001: [The `constructor` shall store the credentials passed as argument.]*/
        this._credentials = credentials;
    }
    X509AuthenticationProvider.prototype.getDeviceCredentials = function (callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_002: [The `getDeviceCredentials` method shall call its callback with a `null` error object and the stored device credentials as a second argument.]*/
            _callback(null, _this._credentials);
        }, callback);
    };
    /**
     * Updates the certificate and key used by the device to connect and authenticate with an Azure IoT hub instance.
     * @param x509 The `X509` object containing the certificate and key.
     */
    X509AuthenticationProvider.prototype.setX509Options = function (x509) {
        /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_003: [The `setX509Options` method shall store the `X509` object passed as an argument with the existing credentials.]*/
        this._credentials.x509 = x509;
    };
    /**
     * Creates a new `X509AuthenticationProvider` from an `X509` object containing a certificate and key.
     *
     * @param deviceId         The device identifier.
     * @param iotHubHostname   The host name of the Azure IoT hub instance the device should connect to.
     * @param x509info         An `X509` object containing a certificate and key that the device can use to authenticate with the Azure IoT hub instance.
     */
    X509AuthenticationProvider.fromX509Options = function (deviceId, iotHubHostname, x509info) {
        /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_004: [The `fromX509Options` method shall throw a `ReferenceError` if `deviceId` is falsy.]*/
        if (!deviceId) {
            throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
        }
        /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_005: [The `fromX509Options` method shall throw a `ReferenceError` if `iotHubHostname` is falsy.]*/
        if (!iotHubHostname) {
            throw new ReferenceError('iotHubHostname cannot be \'' + iotHubHostname + '\'');
        }
        /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_006: [The `fromX509Options` method shall throw a `ReferenceError` if `x509info` is falsy.]*/
        if (!x509info) {
            throw new ReferenceError('x509info cannot be \'' + x509info + '\'');
        }
        /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_007: [The `fromX509Options` method shall throw an `errors.ArgumentError` if `x509info.cert` is falsy.]*/
        if (!x509info.cert) {
            throw new azure_iot_common_1.errors.ArgumentError('x509info.cert cannot be \'' + x509info.cert + '\'');
        }
        /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_008: [The `fromX509Options` method shall throw an `errors.ArgumentError` if `x509info.key` is falsy.]*/
        if (!x509info.key) {
            throw new azure_iot_common_1.errors.ArgumentError('x509info.key cannot be \'' + x509info.key + '\'');
        }
        /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_009: [The `fromX509Options` method shall create a new instance of `X509AuthenticationProvider` with a credentials object created from the arguments.]*/
        return new X509AuthenticationProvider({
            deviceId: deviceId,
            host: iotHubHostname,
            x509: x509info
        });
    };
    return X509AuthenticationProvider;
}());
exports.X509AuthenticationProvider = X509AuthenticationProvider;
//# sourceMappingURL=x509_authentication_provider.js.map