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
var events_1 = require("events");
var machina = require("machina");
var dbg = require("debug");
var debug = dbg('azure-iot-provisioning-device:TpmRegistration');
var azure_iot_common_1 = require("azure-iot-common");
var polling_state_machine_1 = require("./polling_state_machine");
/**
 * @private
 */
var TpmRegistration = /** @class */ (function (_super) {
    __extends(TpmRegistration, _super);
    function TpmRegistration(provisioningHost, idScope, transport, securityClient) {
        var _this = _super.call(this) || this;
        _this._transport = transport;
        _this._securityClient = securityClient;
        _this._provisioningHost = provisioningHost;
        _this._idScope = idScope;
        _this._pollingStateMachine = new polling_state_machine_1.PollingStateMachine(transport);
        _this._fsm = new machina.Fsm({
            namespace: 'tpm-registration',
            initialState: 'notStarted',
            states: {
                notStarted: {
                    _onEnter: function (err, callback) {
                        if (callback) {
                            callback(err);
                        }
                        else if (err) {
                            _this.emit('error', err);
                        }
                    },
                    register: function (request, callback) { return _this._fsm.transition('authenticating', request, callback); },
                    cancel: function (callback) { return callback(); }
                },
                authenticating: {
                    _onEnter: function (registrationInfo, registerCallback) {
                        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_001: [The `register` method shall get the endorsement key by calling `getEndorsementKey` on the `TpmSecurityClient` object passed to the constructor.]*/
                        _this._securityClient.getEndorsementKey(function (err, ek) {
                            if (err) {
                                debug('failed to get endorsement key from TPM security client: ' + err.toString());
                                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                                _this._fsm.transition('notStarted', err, registerCallback);
                            }
                            else {
                                registrationInfo.endorsementKey = ek;
                                _this._securityClient.getRegistrationId(function (err, registrationId) {
                                    if (err) {
                                        debug('failed to get registrationId from TPM security client: ' + err.toString());
                                        _this._fsm.transition('notStarted', err, registerCallback);
                                    }
                                    else {
                                        registrationInfo.request.registrationId = registrationId;
                                        _this._fsm.handle('getStorageRootKey', registrationInfo, registerCallback);
                                    }
                                });
                            }
                        });
                    },
                    getStorageRootKey: function (registrationInfo, registerCallback) {
                        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_002: [The `register` method shall get the storage root key by calling `getStorageRootKey` on the `TpmSecurityClient` object passed to the constructor.]*/
                        _this._securityClient.getStorageRootKey(function (err, srk) {
                            if (err) {
                                debug('failed to get storage root key from TPM security client: ' + err.toString());
                                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                                _this._fsm.transition('notStarted', err, registerCallback);
                            }
                            else {
                                registrationInfo.storageRootKey = srk;
                                _this._fsm.handle('getTpmChallenge', registrationInfo, registerCallback);
                            }
                        });
                    },
                    getTpmChallenge: function (registrationInfo, registerCallback) {
                        _this._transport.setTpmInformation(registrationInfo.endorsementKey, registrationInfo.storageRootKey);
                        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_003: [The `register` method shall initiate the authentication flow with the device provisioning service by calling the `getAuthenticationChallenge` method of the `TpmProvisioningTransport` object passed to the constructor with an object with the following properties:
                        - `registrationId`: a unique identifier computed from the endorsement key
                        - `provisioningHost`: the host address of the dps instance
                        - `idScope`: the `idscope` value obtained from the azure portal for this instance.
                        - a callback that will handle either an error or a `Buffer` object containing a session key to be used later in the authentication process.]*/
                        _this._transport.getAuthenticationChallenge(registrationInfo.request, function (err, tpmChallenge) {
                            if (err) {
                                debug('failed to get sessionKey from provisioning service: ' + err.toString());
                                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                                _this._fsm.transition('notStarted', err, registerCallback);
                            }
                            else {
                                _this._fsm.handle('activateSessionKey', tpmChallenge, registrationInfo, registerCallback);
                            }
                        });
                    },
                    activateSessionKey: function (tpmChallenge, registrationInfo, registerCallback) {
                        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_004: [The `register` method shall store the session key in the TPM by calling the `activateIdentityKey` method of the `TpmSecurityClient` object passed to the constructor with the following arguments:
                        - `sessionKey`: the session key returned by the previous call to `TpmProvisioningTransport.getAuthenticationChallenge`
                        - a callback that will handle an optional error if the operation fails.]*/
                        _this._securityClient.activateIdentityKey(tpmChallenge, function (err) {
                            if (err) {
                                debug('failed to activate the sessionKey: ' + err.toString());
                                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                                _this._fsm.transition('notStarted', err, registerCallback);
                            }
                            else {
                                _this._fsm.handle('createRegistrationSas', registrationInfo, registerCallback);
                            }
                        });
                    },
                    createRegistrationSas: function (registrationInfo, registerCallback) {
                        _this._createRegistrationSas(registrationInfo, function (err, sasToken) {
                            if (err) {
                                debug('failed to get sign the initial authentication payload with the sessionKey: ' + err.toString());
                                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                                _this._fsm.transition('notStarted', err, registerCallback);
                            }
                            else {
                                _this._fsm.transition('respondToAuthenticationChallenge', registrationInfo, sasToken, registerCallback);
                            }
                        });
                    },
                    cancel: function (callback) {
                        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_011: [The `cancel` method shall interrupt the ongoing registration process.]*/
                        _this._transport.cancel(function (err) {
                            if (err) {
                                debug('failed to stop provisioning transport: ' + err.toString());
                            }
                            _this._fsm.transition('notStarted', err, callback);
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                respondToAuthenticationChallenge: {
                    _onEnter: function (registrationInfo, sasToken, registerCallback) {
                        _this._transport.respondToAuthenticationChallenge(registrationInfo.request, sasToken, function (err) {
                            if (err) {
                                // TODO: verify that the transport is disconnected here.  Maybe add SRS in transport
                                _this._fsm.transition('notStarted', err, registerCallback);
                            }
                            else {
                                _this._fsm.transition('registrationInProgress', registrationInfo, registerCallback);
                            }
                        });
                    },
                    cancel: function (callback) {
                        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_011: [The `cancel` method shall interrupt the ongoing registration process.]*/
                        _this._transport.cancel(function (err) {
                            if (err) {
                                debug('failed to stop provisioning transport: ' + err.toString());
                            }
                            _this._fsm.transition('notStarted', err, callback);
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                registrationInProgress: {
                    _onEnter: function (registrationInfo, registerCallback) {
                        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_007: [The `register` method shall start the actual registration process by calling the `register` method on the `TpmProvisioningTransport` object passed to the constructor with the following parameters:
                        - `sasToken`: the SAS token generated according to `SRS_NODE_DPS_TPM_REGISTRATION_16_006`
                        - `registrationInfo`: an object with the following properties `endorsementKey`, `storageRootKey`, `registrationId` and their previously set values.
                        - a callback that will handle an optional error and a `result` object containing the IoT hub name, device id and symmetric key for this device.]*/
                        _this._pollingStateMachine.register(registrationInfo.request, function (err, result) {
                            if (err) {
                                debug('failed to register with provisioning transport: ' + err.toString());
                                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                                _this._fsm.transition('notStarted', err, registerCallback);
                            }
                            else {
                                _this._fsm.transition('storingSecret', result, registerCallback);
                            }
                        });
                    },
                    cancel: function (callback) {
                        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_011: [The `cancel` method shall interrupt the ongoing registration process.]*/
                        _this._transport.cancel(function (err) {
                            if (err) {
                                debug('failed to stop provisioning transport: ' + err.toString());
                            }
                            _this._fsm.transition('notStarted', err, callback);
                        });
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                storingSecret: {
                    _onEnter: function (registrationResult, registerCallback) {
                        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_008: [When the callback for the registration process is called, the `register` method shall store the symmetric key within the TPM by calling the `activateIdentityKey` method of the `TpmSecurityClient` object passed to the constructor with the following arguments:
                        - `symmetricKey`: the symmetric key returned by the previous call to `TpmProvisioningTransport.getAuthenticationChallenge`
                        - a callback that will handle an optional error if the operation fails.
                        ]*/
                        _this._securityClient.activateIdentityKey(Buffer.from(registrationResult.registrationState.tpm.authenticationKey, 'base64'), function (err) {
                            if (err) {
                                debug('failed to stop provisioning transport: ' + err.toString());
                                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                                _this._fsm.transition('notStarted', err, registerCallback);
                            }
                            else {
                                _this._fsm.transition('completed', registrationResult, registerCallback);
                            }
                        });
                    },
                    cancel: function (callback) {
                        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_011: [The `cancel` method shall interrupt the ongoing registration process.]*/
                        _this._fsm.transition('notStarted', null, callback);
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                completed: {
                    _onEnter: function (registrationResult, registerCallback) {
                        _this._transport.disconnect(function (err) {
                            if (err) {
                                debug('disconnect err.  ignoring. ' + err);
                            }
                            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_009: [Once the symmetric key has been stored, the `register` method shall call its own callback with a `null` error object and a `TpmRegistrationResult` object containing the information that the `TpmProvisioningTransport` returned once the registration was successful.]*/
                            registerCallback(null, registrationResult);
                        });
                    },
                    cancel: function (callback) {
                        // TODO: is this weird? also what type of error?
                        callback(new Error('cannot cancel - registration was successfully completed'));
                    }
                }
            }
        });
        _this._fsm.on('transition', function (data) { return debug('TPM State Machine: ' + data.fromState + ' -> ' + data.toState + ' (' + data.action + ')'); });
        _this._fsm.on('handling', function (data) { return debug('TPM State Machine: handling ' + data.inputType); });
        return _this;
    }
    /**
     * Sets the custom payload for registration that will be sent to the custom allocation policy implemented in an Azure Function.
     *
     * @param payload The payload sent to the provisioning service at registration.
     */
    TpmRegistration.prototype.setProvisioningPayload = function (payload) {
        this._provisioningPayload = payload;
    };
    TpmRegistration.prototype.register = function (callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            var registrationInfo = {
                endorsementKey: undefined,
                storageRootKey: undefined,
                request: {
                    registrationId: null,
                    idScope: _this._idScope,
                    provisioningHost: _this._provisioningHost
                }
            };
            /* Codes_SRS_NODE_DPS_TPM_REGISTRATION_06_001: [ If `setProvisioningPayload` is invoked prior to invoking `register` than the `payload` property of the `RegistrationRequest` shall be set to the argument provided to the `setProvisioningPayload`.] */
            if (_this._provisioningPayload) {
                registrationInfo.request.payload = _this._provisioningPayload;
            }
            _this._fsm.handle('register', registrationInfo, _callback);
        }, callback);
    };
    TpmRegistration.prototype.cancel = function (callback) {
        var _this = this;
        return azure_iot_common_1.errorCallbackToPromise(function (_callback) {
            _this._fsm.handle('cancel', _callback);
        }, callback);
    };
    TpmRegistration.prototype._createRegistrationSas = function (registrationInfo, callback) {
        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_005: [The `register` method shall create a signature for the initial SAS token by signing the following payload with the session key and the `TpmSecurityClient`:
        ```
        <idScope>/registrations/<registrationId>\n<expiryTimeUtc>
        ```
        with:
        - `idScope` being the value of the `idScope` argument passed to the `TpmRegistration` constructor.
        - `registrationId` being the previously computed registration id.
        - `expiryTimeUtc` being the number of seconds since Epoch + a delay during which the initial sas token should be valid (1 hour by default).
        ]*/
        var expiryTimeUtc = azure_iot_common_1.anHourFromNow();
        var audience = encodeURIComponent(registrationInfo.request.idScope + '/registrations/' + registrationInfo.request.registrationId);
        var payload = Buffer.from(audience + '\n' + expiryTimeUtc.toString());
        this._securityClient.signWithIdentity(payload, function (err, signedBytes) {
            if (err) {
                debug('failed to sign the initial authentication payload with sessionKey: ' + err.toString());
                callback(err);
            }
            else {
                var signature = encodeURIComponent(signedBytes.toString('base64'));
                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_006: [The `register` method shall create a SAS token to be used to get the actual registration result as follows:
                ```
                SharedAccessSignature sr=<audience>&sig=<signature>&se=<expiryTimeUtc>&skn=registration
                ```
                With the following fields:
                - `audience`: <idScope>/registrations/<registrationId>
                - `signature`: the base64 encoded version of the signature generated per `SRS_NODE_DPS_TPM_REGISTRATION_16_005`
                - `expiryTimeUtc`: the same value that was used to generate the signature.
                ]*/
                callback(null, 'SharedAccessSignature sr=' + audience + '&sig=' + signature + '&se=' + expiryTimeUtc.toString() + '&skn=registration');
            }
        });
    };
    return TpmRegistration;
}(events_1.EventEmitter));
exports.TpmRegistration = TpmRegistration;
//# sourceMappingURL=tpm_registration.js.map