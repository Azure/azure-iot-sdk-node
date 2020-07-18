"use strict";
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
var dbg = require("debug");
var debug = dbg('azure-iot-device:TPMAuthenticationProvider');
var events_1 = require("events");
var machina = require("machina");
var azure_iot_common_1 = require("azure-iot-common");
/**
 * @private
 */
var TpmAuthenticationProvider = /** @class */ (function (_super) {
    __extends(TpmAuthenticationProvider, _super);
    /**
     * @private
     *
     * Initializes a new instance of the TpmAuthenticationProvider - users should only use the factory methods though.
     *
     * @param credentials       Credentials to be used by the device to connect to the IoT hub.
     * @param tpmSecurityClient That client that provides the signingFunction.
     */
    function TpmAuthenticationProvider(credentials, tpmSecurityClient) {
        var _this = _super.call(this) || this;
        _this.type = azure_iot_common_1.AuthenticationType.Token;
        _this.automaticRenewal = true;
        _this._tokenValidTimeInSeconds = 3600; // 1 hour
        _this._tokenRenewalMarginInSeconds = 900; // 15 minutes
        _this._credentials = credentials;
        _this._tpmSecurityClient = tpmSecurityClient;
        _this._fsm = new machina.Fsm({
            initialState: 'inactive',
            states: {
                inactive: {
                    _onEnter: function (err, callback) {
                        if (callback) {
                            callback(err);
                        }
                        else if (err) {
                            /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_007: [an `error` event shall be emitted if renewing the SAS token fail in the timer handler.]*/
                            _this.emit('error', err);
                        }
                        if (_this._renewalTimeout) {
                            clearTimeout(_this._renewalTimeout);
                        }
                    },
                    activate: function (activateCallback) { return _this._fsm.transition('activating', activateCallback); },
                    getDeviceCredentials: function (callback) {
                        _this._fsm.handle('activate', function (err, result) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('getDeviceCredentials', callback);
                            }
                        });
                    }
                },
                activating: {
                    _onEnter: function (callback, err) {
                        var newExpiry = Math.floor(Date.now() / 1000) + _this._tokenValidTimeInSeconds;
                        /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_001: [`getDeviceCredentials` shall use the `SharedAccessSignature.createWithSigningFunction` method with the `signWithIdentity` method of the `TpmSecurityClient` given to the construtor to generate a SAS token.]*/
                        azure_iot_common_1.SharedAccessSignature.createWithSigningFunction(_this._credentials, newExpiry, _this._tpmSecurityClient.signWithIdentity.bind(_this._tpmSecurityClient), function (err, newSas) {
                            if (err) {
                                debug('Unable to create a new SAS token! - ' + err);
                                /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_003: [`getDeviceCredentials` shall call its callback with an `Error` object if the SAS token creation fails.]*/
                                callback(err);
                                _this._fsm.transition('inactive');
                            }
                            else {
                                _this._credentials.sharedAccessSignature = newSas.toString();
                                /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_004: [`getDeviceCredentials` shall start a timer to renew the SAS token after the time the token is valid minus the renewal margin (60 - 15 = 45 minutes by default).]*/
                                _this._renewalTimeout = setTimeout(function () { return _this._renewToken(); }, (_this._tokenValidTimeInSeconds - _this._tokenRenewalMarginInSeconds) * 1000);
                                debug('Created a new sas token.');
                                _this._fsm.transition('active', callback);
                            }
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                active: {
                    _onEnter: function (callback) {
                        /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_008: [a `newTokenAvailable` event shall be emitted if renewing the SAS token succeeds in the timer handler.]*/
                        _this.emit('newTokenAvailable', _this._credentials);
                        /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_002: [`getDeviceCredentials` shall call its callback with an `null` first parameter and the generated SAS token as a second parameter if the SAS token creation is successful.]*/
                        callback(null, _this._credentials);
                    },
                    getDeviceCredentials: function (callback) {
                        callback(null, _this._credentials);
                    },
                    signingError: function (err) {
                        debug('Unable to create a new SAS token! - ' + err);
                        _this._fsm.transition('inactive', err);
                    },
                    signingSuccessful: function () {
                        debug('Created a new sas token.');
                        _this.emit('newTokenAvailable', _this._credentials);
                    },
                    stop: function () {
                        /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_006: [`stop` shall stop the renewal timer if it is running.]*/
                        _this._fsm.transition('inactive');
                    }
                }
            }
        });
        return _this;
    }
    TpmAuthenticationProvider.prototype.getDeviceCredentials = function (callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            _this._fsm.handle('getDeviceCredentials', _callback);
        }, callback);
    };
    TpmAuthenticationProvider.prototype.updateSharedAccessSignature = function (sharedAccessSignature) {
        /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_005: [`updateSharedAccessSignature` shall throw an `InvalidOperationError` since it's the role of the TPM to generate SAS tokens.]*/
        throw new azure_iot_common_1.errors.InvalidOperationError('cannot update a shared access signature when using TPM');
    };
    TpmAuthenticationProvider.prototype.stop = function () {
        debug('stopping TPM authentication provider');
        this._fsm.handle('stop');
    };
    TpmAuthenticationProvider.prototype._renewToken = function () {
        var _this = this;
        if (this._renewalTimeout) {
            clearTimeout(this._renewalTimeout);
        }
        var newExpiry = Math.floor(Date.now() / 1000) + this._tokenValidTimeInSeconds;
        azure_iot_common_1.SharedAccessSignature.createWithSigningFunction(this._credentials, newExpiry, this._tpmSecurityClient.signWithIdentity.bind(this._tpmSecurityClient), function (err, newSas) {
            if (err) {
                _this._fsm.handle('signingError', err);
            }
            else {
                _this._credentials.sharedAccessSignature = newSas.toString();
                _this._renewalTimeout = setTimeout(function () { return _this._renewToken(); }, (_this._tokenValidTimeInSeconds - _this._tokenRenewalMarginInSeconds) * 1000);
                _this._fsm.handle('signingSuccessful');
            }
        });
    };
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#fromTpmSecurityClient
     * @description      Returns an authentication provider.
     * @param {string}            deviceId          The device id for the client to be created.
     * @param {string}            iotHubHostname    The name of the IoT hub to be utilized.
     * @param {TpmSecurityClient} tpmSecurityClient The client which provides the tpm security interface. (Signing, activating, etc.)
     */
    TpmAuthenticationProvider.fromTpmSecurityClient = function (deviceId, iotHubHostname, tpmSecurityClient) {
        /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_009: [The `fromSecurityClient` method shall throw a `ReferenceError` if `deviceId` is falsy.]*/
        if (!deviceId) {
            throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
        }
        /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_010: [The `fromSecurityClient` method shall throw a `ReferenceError` if `iotHubHostname` is falsy.]*/
        if (!iotHubHostname) {
            throw new ReferenceError('iotHubHostname cannot be \'' + iotHubHostname + '\'');
        }
        /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_011: [The `fromSecurityClient` method shall throw a `ReferenceError` if `tpmSecurityClient` is falsy.]*/
        if (!tpmSecurityClient) {
            throw new ReferenceError('tpmSecurityClient cannot be \'' + tpmSecurityClient + '\'');
        }
        var credentials = {
            host: iotHubHostname,
            deviceId: deviceId
        };
        /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_012: [The `fromSecurityClient` method shall instantiate a new `TpmSecurityClient` object.]*/
        return new TpmAuthenticationProvider(credentials, tpmSecurityClient);
    };
    return TpmAuthenticationProvider;
}(events_1.EventEmitter));
exports.TpmAuthenticationProvider = TpmAuthenticationProvider;
//# sourceMappingURL=tpm_authentication_provider.js.map