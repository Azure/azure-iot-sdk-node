"use strict";
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
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
/**
 * Provides an `AuthenticationProvider` object that can be created simply with a shared access signature and is then used by the device client and transports to authenticate
 * with the Azure IoT hub instance.
 *
 * The `SharedAccessSignatureAuthenticationProvider` object does not renew the shared access signature token automatically, so the user needs to feed non-expired shared access signature
 * tokens to it using the `updateSharedAccessSignature` method. For each call to this method, the `SharedAccessSignatureAuthenticationProvider` will emit a `newTokenAvailable` event that
 * transports will use to authenticate with the Azure IoT hub instance.
 */
var SharedAccessSignatureAuthenticationProvider = /** @class */ (function (_super) {
    __extends(SharedAccessSignatureAuthenticationProvider, _super);
    /**
     * @private
     *
     * Initializes a new instance of the SharedAccessSignatureAuthenticationProvider - users should only use the factory methods though.
     *
     * @param credentials       Credentials to be used by the device to connect to the IoT hub.
     * @param securityProvider  Object used to sign the tokens that are going to be used during authentication.
     */
    function SharedAccessSignatureAuthenticationProvider(credentials) {
        var _this = _super.call(this) || this;
        _this.type = azure_iot_common_1.AuthenticationType.Token;
        /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_001: [The `constructor` shall store the credentials passed in the `credentials` argument.]*/
        _this._credentials = credentials;
        return _this;
    }
    SharedAccessSignatureAuthenticationProvider.prototype.getDeviceCredentials = function (callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_002: [The `getDeviceCredentials` method shall call its callback with a `null` error parameter and the stored `credentials` object containing the current device credentials.]*/
            _callback(null, _this._credentials);
        }, callback);
    };
    /**
     * does nothing and returns - this is part of the token-based authentication provider API but there are no resources to stop/free here.
     */
    SharedAccessSignatureAuthenticationProvider.prototype.stop = function () {
        /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_007: [The `stop` method shall simply return since there is no timeout or resources to clear.]*/
        return;
    };
    /**
     * Updates the shared access signature token that transports should use to authenticate. When called, the `SharedAccessSignatureAuthenticationProvider` will emit
     * a `newTokenAvailable` event that the transports can then use to authenticate with the Azure IoT hub instance.
     *
     * @param sharedAccessSignature         A shared access signature string containing the required parameters for authentication with the IoT hub.
     */
    SharedAccessSignatureAuthenticationProvider.prototype.updateSharedAccessSignature = function (sharedAccessSignature) {
        /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_003: [The `updateSharedAccessSignature` method shall update the stored credentials with the new `sharedAccessSignature` value passed as an argument.]*/
        this._credentials.sharedAccessSignature = sharedAccessSignature;
        /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_004: [The `updateSharedAccessSignature` method shall emit a `newTokenAvailable` event with the updated credentials.]*/
        this.emit('newTokenAvailable', this._credentials);
    };
    /**
     * Creates a new `SharedAccessSignatureAuthenticationProvider` from a connection string
     *
     * @param sharedAccessSignature         A shared access signature string containing the required parameters for authentication with the IoT hub.
     */
    SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature = function (sharedAccessSignature) {
        if (!sharedAccessSignature) {
            /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_005: [The `fromSharedAccessSignature` method shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
            throw new ReferenceError('sharedAccessSignature cannot be \'' + sharedAccessSignature + '\'');
        }
        var sas = azure_iot_common_1.SharedAccessSignature.parse(sharedAccessSignature);
        var decodedUri = decodeURIComponent(sas.sr);
        var uriSegments = decodedUri.split('/');
        var uriDeviceId = (uriSegments.length >= 3 && uriSegments[1] === 'devices') ? (uriSegments[2]) : null;
        var uriModuleId = (uriSegments.length >= 5 && uriSegments[3] === 'modules') ? (uriSegments[4]) : null;
        var credentials = {
            host: uriSegments[0],
            deviceId: uriDeviceId,
            moduleId: uriModuleId,
            sharedAccessSignature: sharedAccessSignature
        };
        /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_006: [The `fromSharedAccessSignature` shall return a new `SharedAccessSignatureAuthenticationProvider` object initialized with the credentials parsed from the `sharedAccessSignature` argument.]*/
        return new SharedAccessSignatureAuthenticationProvider(credentials);
    };
    return SharedAccessSignatureAuthenticationProvider;
}(events_1.EventEmitter));
exports.SharedAccessSignatureAuthenticationProvider = SharedAccessSignatureAuthenticationProvider;
//# sourceMappingURL=sas_authentication_provider.js.map