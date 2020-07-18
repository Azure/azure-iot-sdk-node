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
 * Provides an `AuthenticationProvider` object that can be created simply with a connection string and is then used by the device client and transports to authenticate
 * with the Azure IoT hub instance.
 *
 * The `SharedAccessKeyAuthenticationProvider` object takes care of creating shared access signature tokens on a regular cadence and emits the `newTokenAvailable` event for the transports
 * to renew their credentials with the Azure IoT hub instance and stay connected.
 */
var SharedAccessKeyAuthenticationProvider = /** @class */ (function (_super) {
    __extends(SharedAccessKeyAuthenticationProvider, _super);
    /**
     * @private
     *
     * Initializes a new instance of the SharedAccessKeyAuthenticationProvider - users should only use the factory methods though.
     *
     * @param credentials                    Credentials to be used by the device to connect to the IoT hub.
     * @param tokenValidTimeInSeconds        [optional] The number of seconds for which a token is supposed to be valid.
     * @param tokenRenewalMarginInSeconds    [optional] The number of seconds before the end of the validity period during which the `SharedAccessKeyAuthenticationProvider` should renew the token.
     */
    function SharedAccessKeyAuthenticationProvider(credentials, tokenValidTimeInSeconds, tokenRenewalMarginInSeconds) {
        var _this = _super.call(this) || this;
        _this.type = azure_iot_common_1.AuthenticationType.Token;
        _this._tokenValidTimeInSeconds = 3600; // 1 hour
        _this._tokenRenewalMarginInSeconds = 900; // 15 minutes
        /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_001: [The `constructor` shall create the initial token value using the `credentials` parameter.]*/
        _this._credentials = credentials;
        if (tokenValidTimeInSeconds)
            _this._tokenValidTimeInSeconds = tokenValidTimeInSeconds;
        if (tokenRenewalMarginInSeconds)
            _this._tokenRenewalMarginInSeconds = tokenRenewalMarginInSeconds;
        /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_011: [The `constructor` shall throw an `ArgumentError` if the `tokenValidTimeInSeconds` is less than or equal `tokenRenewalMarginInSeconds`.]*/
        if (_this._tokenValidTimeInSeconds <= _this._tokenRenewalMarginInSeconds) {
            throw new azure_iot_common_1.errors.ArgumentError('tokenRenewalMarginInSeconds must be less than tokenValidTimeInSeconds');
        }
        return _this;
    }
    /**
     * This method allows the caller to set new values for the authentication renewal.
     *
     * This function completes synchronously, BUT, will cause actions to occur asynchronously.
     * If the provider is already doing token renewals, for instance - if a network connection has
     * been make, invoking this function will cause a new renewal to take place on the almost immediately.
     * Depending on the protocol, this could cause a disconnect and reconnect to occur.  However, if renewals
     * are NOT currently occurring, we simply save off the new values for use later.
     *
     * @param tokenValidTimeInSeconds        The number of seconds for which a token is supposed to be valid.
     * @param tokenRenewalMarginInSeconds    The number of seconds before the end of the validity period during which the `SharedAccessKeyAuthenticationProvider` should renew the token.
     */
    SharedAccessKeyAuthenticationProvider.prototype.setTokenRenewalValues = function (tokenValidTimeInSeconds, tokenRenewalMarginInSeconds) {
        /* Codes_SRS_NODE_SAK_AUTH_PROVIDER_06_001: [The `setTokenRenewalValues` shall throw an `ArgumentError` if the `tokenRenewalMarginInSeconds` is less than or equal `tokenValidTimeInSeconds`.] */
        if (tokenValidTimeInSeconds <= tokenRenewalMarginInSeconds) {
            throw new azure_iot_common_1.errors.ArgumentError('tokenRenewalMarginInSeconds must be less than tokenValidTimeInSeconds');
        }
        this._tokenValidTimeInSeconds = tokenValidTimeInSeconds;
        this._tokenRenewalMarginInSeconds = tokenRenewalMarginInSeconds;
        /* Codes_SRS_NODE_SAK_AUTH_PROVIDER_06_002: [If there is no timer running when `setTokenRenewalValues` is invoked, there will NOT be a timer running when it returns.] */
        if (this._renewalTimeout) {
            /* Codes_SRS_NODE_SAK_AUTH_PROVIDER_06_003: [If there is a timer running when `setTokenRenewalValues` is invoked it will cause a token renewal to happen almost immediately and cause the subsequent renewals to happen with as specified with the new values.] */
            this._expiryTimerHandler();
        }
    };
    SharedAccessKeyAuthenticationProvider.prototype.getDeviceCredentials = function (callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            if (_this._shouldRenewToken()) {
                _this._renewToken(function (err, credentials) {
                    if (err) {
                        _callback(err);
                    }
                    else {
                        /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_002: [The `getDeviceCredentials` method shall start a timer that will automatically renew the token every (`tokenValidTimeInSeconds` - `tokenRenewalMarginInSeconds`) seconds if specified, or 45 minutes by default.]*/
                        _this._scheduleNextExpiryTimeout();
                        _callback(null, credentials);
                    }
                });
            }
            else {
                /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_003: [The `getDeviceCredentials` should call its callback with a `null` first parameter and a `TransportConfig` object as a second parameter, containing the latest valid token it generated.]*/
                _callback(null, _this._credentials);
            }
        }, callback);
    };
    /**
     * Stops the timer used to renew to SAS token.
     */
    SharedAccessKeyAuthenticationProvider.prototype.stop = function () {
        /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_012: [The `stop` method shall clear the token renewal timer if it is running.]*/
        /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_013: [The `stop` method shall simply return if the token renewal timer is not running.]*/
        if (this._renewalTimeout) {
            clearTimeout(this._renewalTimeout);
            this._renewalTimeout = null;
        }
    };
    SharedAccessKeyAuthenticationProvider.prototype._sign = function (resourceUri, expiry, callback) {
        callback(null, azure_iot_common_1.SharedAccessSignature.create(resourceUri, this._credentials.sharedAccessKeyName, this._credentials.sharedAccessKey, expiry).toString());
    };
    SharedAccessKeyAuthenticationProvider.prototype._shouldRenewToken = function () {
        if (isNaN(this._currentTokenExpiryTimeInSeconds)) {
            return true;
        }
        var currentTimeInSeconds = Math.floor(Date.now() / 1000);
        return (this._currentTokenExpiryTimeInSeconds - currentTimeInSeconds) < this._tokenRenewalMarginInSeconds;
    };
    SharedAccessKeyAuthenticationProvider.prototype._renewToken = function (callback) {
        var _this = this;
        /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_009: [Every token shall be created with a validity period of `tokenValidTimeInSeconds` if specified when the constructor was called, or 1 hour by default.]*/
        var newExpiry = Math.floor(Date.now() / 1000) + this._tokenValidTimeInSeconds;
        /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_010: [Every token shall be created using the `azure-iot-common.SharedAccessSignature.create` method and then serialized as a string, with the arguments to the create methods being:
        ```
        resourceUri: <IoT hub host>/devices/<deviceId>
        keyName: the `SharedAccessKeyName` parameter of the connection string or `null`
        key: the `SharedAccessKey` parameter of the connection string
        expiry: the expiration time of the token, which is now + the token validity time, formatted as the number of seconds since Epoch (Jan 1st, 1970, 00:00 UTC).
        ```]*/
        var resourceString = this._credentials.host + '/devices/' + this._credentials.deviceId;
        if (this._credentials.moduleId) {
            resourceString += '/modules/' + this._credentials.moduleId;
        }
        var resourceUri = azure_iot_common_1.encodeUriComponentStrict(resourceString);
        this._sign(resourceUri, newExpiry, function (err, signature) {
            if (err) {
                callback(err);
            }
            else {
                _this._currentTokenExpiryTimeInSeconds = newExpiry;
                _this._credentials.sharedAccessSignature = signature;
                callback(null, _this._credentials);
            }
        });
    };
    SharedAccessKeyAuthenticationProvider.prototype._expiryTimerHandler = function () {
        var _this = this;
        if (this._renewalTimeout) {
            clearTimeout(this._renewalTimeout);
            this._renewalTimeout = null;
        }
        this._renewToken(function (err) {
            if (!err) {
                _this._scheduleNextExpiryTimeout();
                /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_005: [Every time a new token is created, the `newTokenAvailable` event shall be fired with the updated credentials.]*/
                _this.emit('newTokenAvailable', _this._credentials);
            }
            else {
                _this.emit('error', err);
            }
        });
    };
    SharedAccessKeyAuthenticationProvider.prototype._scheduleNextExpiryTimeout = function () {
        var _this = this;
        if (this._renewalTimeout) {
            clearTimeout(this._renewalTimeout);
            this._renewalTimeout = null;
        }
        var nextRenewalTimeout = (this._tokenValidTimeInSeconds - this._tokenRenewalMarginInSeconds) * 1000;
        this._renewalTimeout = setTimeout(function () { return _this._expiryTimerHandler(); }, nextRenewalTimeout);
    };
    /**
     * Creates a new `SharedAccessKeyAuthenticationProvider` from a connection string
     *
     * @param connectionString              A device connection string containing the required parameters for authentication with the IoT hub.
     * @param tokenValidTimeInSeconds       [optional] The number of seconds for which a token is supposed to be valid.
     * @param tokenRenewalMarginInSeconds   [optional] The number of seconds before the end of the validity period during which the `SharedAccessKeyAuthenticationProvider` should renew the token.
     */
    SharedAccessKeyAuthenticationProvider.fromConnectionString = function (connectionString, tokenValidTimeInSeconds, tokenRenewalMarginInSeconds) {
        if (!connectionString) {
            /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_006: [The `fromConnectionString` method shall throw a `ReferenceError` if the `connectionString` parameter is falsy.]*/
            throw new ReferenceError('connectionString cannot be \'' + connectionString + '\'');
        }
        /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_007: [The `fromConnectionString` method shall throw an `errors.ArgumentError` if the `connectionString` does not have a SharedAccessKey parameter.]*/
        var cs = azure_iot_common_1.ConnectionString.parse(connectionString, ['DeviceId', 'HostName', 'SharedAccessKey']);
        /*Codes_SRS_NODE_SAK_AUTH_PROVIDER_16_008: [The `fromConnectionString` method shall extract the credentials from the `connectionString` argument and create a new `SharedAccessKeyAuthenticationProvider` that uses these credentials to generate security tokens.]*/
        var credentials = {
            host: cs.HostName,
            gatewayHostName: cs.GatewayHostName,
            deviceId: cs.DeviceId,
            moduleId: cs.ModuleId,
            sharedAccessKeyName: cs.SharedAccessKeyName,
            sharedAccessKey: cs.SharedAccessKey
        };
        return new SharedAccessKeyAuthenticationProvider(credentials, tokenValidTimeInSeconds, tokenRenewalMarginInSeconds);
    };
    return SharedAccessKeyAuthenticationProvider;
}(events_1.EventEmitter));
exports.SharedAccessKeyAuthenticationProvider = SharedAccessKeyAuthenticationProvider;
//# sourceMappingURL=sak_authentication_provider.js.map