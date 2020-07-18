// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var machina = require("machina");
var tss = require("tss.js");
var tss_js_1 = require("tss.js");
var crypto = require("crypto");
var base32Encode = require("base32-encode");
var dbg = require("debug");
var debug = dbg('azure-iot-security-tpm:TpmSecurityClient');
/**
 * @private
 */
var TpmSecurityClient = /** @class */ (function () {
    function TpmSecurityClient(registrationId, customTpm) {
        var _this = this;
        this._ek = null;
        this._srk = null;
        this._registrationId = '';
        this._idKeyPub = null;
        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_002: [The `customTpm` argument, if present` will be used at the underlying TPM provider.  Otherwise the TPM provider will the tss TPM client with a parameter of `false` for simulator use.] */
        this._tpm = customTpm ? customTpm : new tss_js_1.Tpm(false);
        if (registrationId) {
            /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_001: [The `registrationId` argument if present will be returned as the `registrationId` for subsequent calls to `getRegistrationId`.] */
            this._registrationId = registrationId;
        }
        this._fsm = new machina.Fsm({
            initialState: 'disconnected',
            states: {
                disconnected: {
                    _onEnter: function (callback, err) {
                        _this._ek = null;
                        _this._srk = null;
                        _this._idKeyPub = null;
                        if (callback) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                callback(null, null);
                            }
                        }
                    },
                    connect: function (connectCallback) { return _this._fsm.transition('connecting', connectCallback); },
                    getEndorsementKey: function (callback) {
                        _this._fsm.handle('connect', function (err, result) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('getEndorsementKey', callback);
                            }
                        });
                    },
                    getStorageRootKey: function (callback) {
                        _this._fsm.handle('connect', function (err, result) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('getStorageRootKey', callback);
                            }
                        });
                    },
                    signWithIdentity: function (dataToSign, callback) {
                        _this._fsm.handle('connect', function (err, result) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('signWithIdentity', dataToSign, callback);
                            }
                        });
                    },
                    activateIdentityKey: function (identityKey, callback) {
                        _this._fsm.handle('connect', function (err, result) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                _this._fsm.handle('activateIdentityKey', identityKey, callback);
                            }
                        });
                    }
                },
                connecting: {
                    _onEnter: function (callback) {
                        try {
                            _this._tpm.connect(function () {
                                _this._createPersistentPrimary('EK', tss.Endorsement, TpmSecurityClient._ekPersistentHandle, TpmSecurityClient._ekTemplate, function (ekCreateErr, ekPublicKey) {
                                    if (ekCreateErr) {
                                        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_007: [Any errors from interacting with the TPM hardware will cause in SecurityDeviceError to be returned in the err parameter of the callback.] */
                                        _this._fsm.transition('disconnected', callback, ekCreateErr);
                                    }
                                    else {
                                        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_006: [The `getEndorsementKey` function shall query the TPM hardware and return the `endorsementKey` in the callback.] */
                                        _this._ek = ekPublicKey;
                                        _this._createPersistentPrimary('SRK', tss.Owner, TpmSecurityClient._srkPersistentHandle, TpmSecurityClient._srkTemplate, function (srkCreateErr, srkPublicKey) {
                                            if (srkCreateErr) {
                                                /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_009: [Any errors from interacting with the TPM hardware will cause in SecurityDeviceError to be returned in the err parameter of the callback.] */
                                                _this._fsm.transition('disconnected', callback, srkCreateErr);
                                            }
                                            else {
                                                /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_008: [The `getStorageRootKey` function shall query the TPM hardware and return the `storageRootKey` in the callback.] */
                                                _this._srk = srkPublicKey;
                                                _this._readPersistentPrimary('IDENTITY', TpmSecurityClient._idKeyPersistentHandle, function (readIdErr, idkPublicKey) {
                                                    //
                                                    // Not any kind of fatal error if we can't retrieve the identity public portion.  This device might not have ever been provisioned.
                                                    // If there is a signing operation attempted before an activate is attempted, an error will occur.
                                                    //
                                                    _this._idKeyPub = idkPublicKey;
                                                    _this._fsm.transition('connected', callback);
                                                });
                                            }
                                        });
                                    }
                                });
                            });
                        }
                        catch (err) {
                            _this._fsm.transition('disconnected', callback, err);
                        }
                    },
                    '*': function () { return _this._fsm.deferUntilTransition(); }
                },
                connected: {
                    _onEnter: function (callback) {
                        callback(null);
                    },
                    getEndorsementKey: function (callback) {
                        callback(null, _this._ek.asTpm2B());
                    },
                    getStorageRootKey: function (callback) {
                        callback(null, _this._srk.asTpm2B());
                    },
                    signWithIdentity: function (dataToSign, callback) {
                        _this._signData(dataToSign, function (err, signedData) {
                            if (err) {
                                debug('Error from signing data: ' + err);
                                _this._fsm.transition('disconnected', callback, err);
                            }
                            else {
                                callback(null, signedData);
                            }
                        });
                    },
                    activateIdentityKey: function (identityKey, callback) {
                        _this._activateIdentityKey(identityKey, function (err) {
                            if (err) {
                                debug('Error from activate: ' + err);
                                _this._fsm.transition('disconnected', callback, err);
                            }
                            else {
                                callback(null, null);
                            }
                        });
                    },
                }
            }
        });
        this._fsm.on('transition', function (data) { return debug('TPM security State Machine: ' + data.fromState + ' -> ' + data.toState + ' (' + data.action + ')'); });
        this._fsm.on('handling', function (data) { return debug('TPM security State Machine: handling ' + data.inputType); });
    }
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#getEndorsementKey
     * @description      Query the endorsement key on the TPM.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the endorsementKey
     *                                            parameter will be undefined.
     */
    TpmSecurityClient.prototype.getEndorsementKey = function (callback) {
        this._fsm.handle('getEndorsementKey', callback);
    };
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#getStorageRootKey
     * @description      Query the storage root key on the TPM.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the storageRootKey
     *                                            parameter will be undefined.
     */
    TpmSecurityClient.prototype.getStorageRootKey = function (callback) {
        this._fsm.handle('getStorageRootKey', callback);
    };
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#signWithIdentity
     * @description      Perform a cryptographic signing operation utilizing the TPM hardware.
     * @param {Buffer}            dataToSign      A buffer of data to sign.  The signing key will have been previously
     *                                            imported into the TPM via an activateIdentityKey.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the signedData
     *                                            parameter will be undefined.
     */
    TpmSecurityClient.prototype.signWithIdentity = function (dataToSign, callback) {
        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_011: [If `dataToSign` is falsy, an ReferenceError will be thrown.] */
        if (!dataToSign || dataToSign.length === 0) {
            throw new ReferenceError('\'dataToSign\' cannot be \'' + dataToSign + '\'');
        }
        this._fsm.handle('signWithIdentity', dataToSign, callback);
    };
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#activateIdentityKey
     * @description      Activate the provided key into the TPM for use in signing operations later.
     * @param {function}          callback        Invoked upon completion of the operation.
     */
    TpmSecurityClient.prototype.activateIdentityKey = function (identityKey, callback) {
        if (!identityKey || identityKey.length === 0) {
            throw new ReferenceError('\'identityKey\' cannot be \'' + identityKey + '\'');
        }
        this._fsm.handle('activateIdentityKey', identityKey, callback);
    };
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#getRegistrationId
     * @description      Returns the registrationId originally provided to the client, or, if not provided
     *                   it constructs one around the endorsement key.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the registrationId
     *                                            parameter will be undefined.
     */
    TpmSecurityClient.prototype.getRegistrationId = function (callback) {
        var _this = this;
        if (this._registrationId) {
            /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_003: [If the TpmSecurityClient was given a `registrationId` at creation, that `registrationId` will be returned.] */
            callback(null, this._registrationId);
        }
        else {
            this.getEndorsementKey(function (endorsementError, endorsementKey) {
                if (endorsementError) {
                    /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_005: [Any errors from interacting with the TPM hardware will cause an SecurityDeviceError to be returned in the err parameter of the callback.] */
                    callback(endorsementError);
                }
                else {
                    /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_004: [If not provided, the `registrationId` will be constructed and returned as follows:
                      The endorsementKey will be queried.
                      The endorsementKey will be hashed utilizing SHA256.
                      The resultant digest will be base 32 encoded in conformance with the `RFC4648` specification.
                      The resultant string will have terminating `=` characters removed.] */
                    var hash = crypto.createHash('sha256');
                    hash.update(endorsementKey);
                    _this._registrationId = (base32Encode(hash.digest(), 'RFC4648').toLowerCase()).replace(/=/g, '');
                    callback(null, _this._registrationId);
                }
            });
        }
    };
    TpmSecurityClient.prototype._createPersistentPrimary = function (name, hierarchy, handle, template, callback) {
        var _this = this;
        var checkErrorAndContinue = function (opName, next, errorOut) {
            return function (err, resp) {
                var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                debug(opName + '(' + name + ') returned ' + tss_js_1.TPM_RC[rc]);
                if (rc === tss_js_1.TPM_RC.SUCCESS) {
                    next(resp);
                }
                else {
                    errorOut(err);
                }
            };
        };
        this._tpm.allowErrors().ReadPublic(handle, checkErrorAndContinue('ReadPublic', function (resp) {
            debug('ReadPublic(' + name + ') returned ' + tss_js_1.TPM_RC[tss_js_1.TPM_RC.SUCCESS] + '; PUB: ' + resp.outPublic.toString());
            callback(null, resp.outPublic);
        }, function () {
            /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_017: [If the endorsement key does NOT exist, a new key will be created.] */
            /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_018: [If the storage root key does NOT exist, a new key will be created.] */
            _this._tpm.withSession(tss.NullPwSession).CreatePrimary(hierarchy, new tss.TPMS_SENSITIVE_CREATE(), template, null, null, checkErrorAndContinue('CreatePrimary', function (resp) {
                _this._tpm.withSession(tss.NullPwSession).EvictControl(tss.Owner, resp.handle, handle, checkErrorAndContinue('EvictControl', function () {
                    debug('EvictControl(0x' + resp.handle.handle.toString(16) + ', 0x' + handle.handle.toString(16) + ') returned ' + tss_js_1.TPM_RC[tss_js_1.TPM_RC.SUCCESS]);
                    _this._tpm.FlushContext(resp.handle, checkErrorAndContinue('FlushContext', function () {
                        callback(null, resp.outPublic); // SUCCESS: an EK has been created.
                    }, callback));
                }, callback));
            }, callback));
        }));
    };
    TpmSecurityClient.prototype._readPersistentPrimary = function (name, handle, callback) {
        this._tpm.allowErrors().ReadPublic(handle, function (err, resp) {
            var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
            debug('ReadPublic(' + name + ') returned ' + tss_js_1.TPM_RC[rc] + (rc === tss_js_1.TPM_RC.SUCCESS ? '; PUB: ' + resp.outPublic.toString() : ''));
            if (rc !== tss_js_1.TPM_RC.SUCCESS) {
                debug('readPersistentPrimary failed for: ' + name);
                callback(new azure_iot_common_1.errors.SecurityDeviceError('Authorization unable to find a persistent identity key.'), null);
            }
            else {
                callback(null, resp.outPublic);
            }
        });
    };
    TpmSecurityClient.prototype._getPropsAndHashAlg = function (callback) {
        var idKeyHashAlg = this._idKeyPub.parameters.scheme.hashAlg;
        this._tpm.GetCapability(tss.TPM_CAP.TPM_PROPERTIES, tss_js_1.TPM_PT.INPUT_BUFFER, 1, function (err, caps) {
            var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
            debug('GetCapability returned: ' + tss_js_1.TPM_RC[rc]);
            if (rc === tss_js_1.TPM_RC.SUCCESS) {
                var props = caps.capabilityData;
                callback(null, idKeyHashAlg, props);
            }
            else {
                callback(err);
            }
        });
    };
    TpmSecurityClient.prototype._signData = function (dataToSign, callback) {
        var _this = this;
        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_013: [If `signWithIdentity` is invoked without a previous successful invocation of `activateIdentityKey`, the callback will be invoked with `err` of `InvalidOperationError`] */
        if (!this._idKeyPub) {
            return callback(new azure_iot_common_1.errors.InvalidOperationError('activateIdentityKey must be invoked before any signing is attempted.'));
        }
        this._getPropsAndHashAlg(function (err, idKeyHashAlg, props) {
            if (err) {
                var secErr = new azure_iot_common_1.errors.SecurityDeviceError('Could not get TPM capabilities');
                secErr.tpmError = err;
                callback(secErr);
            }
            else if (props.tpmProperty.length !== 1 || props.tpmProperty[0].property !== tss_js_1.TPM_PT.INPUT_BUFFER) {
                /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_015: [If the tpm device is not properly configured, the callback will be invoked with `err` of `SecurityDeviceError`.] */
                callback(new azure_iot_common_1.errors.SecurityDeviceError('Unexpected result of TPM2_GetCapability(TPM_PT.INPUT_BUFFER)'));
            }
            else {
                var maxInputBuffer_1 = props.tpmProperty[0].value;
                if (dataToSign.length <= maxInputBuffer_1) {
                    _this._tpm.withSession(tss.NullPwSession).HMAC(TpmSecurityClient._idKeyPersistentHandle, dataToSign, idKeyHashAlg, function (err, signature) {
                        var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                        debug('HMAC returned: ' + tss_js_1.TPM_RC[rc]);
                        if (rc === tss_js_1.TPM_RC.SUCCESS) {
                            callback(null, signature);
                        }
                        else {
                            callback(err);
                        }
                    });
                }
                else {
                    var curPos_1 = 0;
                    var bytesLeft_1 = dataToSign.length;
                    var hSequence_1 = null;
                    var loopFn_1 = function () {
                        if (bytesLeft_1 > maxInputBuffer_1) {
                            var sliceCurPos = curPos_1;
                            bytesLeft_1 -= maxInputBuffer_1;
                            curPos_1 += maxInputBuffer_1;
                            _this._tpm.withSession(tss.NullPwSession).SequenceUpdate(hSequence_1, dataToSign.slice(sliceCurPos, sliceCurPos + maxInputBuffer_1), loopFn_1);
                        }
                        else {
                            _this._tpm.withSession(tss.NullPwSession).SequenceComplete(hSequence_1, dataToSign.slice(curPos_1, curPos_1 + bytesLeft_1), new tss_js_1.TPM_HANDLE(tss.TPM_RH.NULL), function (err, resp) {
                                var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                                debug('SequenceComplete returned: ' + tss_js_1.TPM_RC[rc]);
                                if (rc === tss_js_1.TPM_RC.SUCCESS) {
                                    callback(null, resp.result);
                                }
                                else {
                                    callback(err);
                                }
                            });
                        }
                    };
                    _this._tpm.withSession(tss.NullPwSession).HMAC_Start(TpmSecurityClient._idKeyPersistentHandle, Buffer.alloc(0), idKeyHashAlg, function (err, hSeq) {
                        var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                        debug('HMAC_Start returned: ' + tss_js_1.TPM_RC[rc]);
                        if (err) {
                            var secErr = new azure_iot_common_1.errors.SecurityDeviceError('Could not hash key');
                            secErr.tpmError = err;
                            callback(secErr);
                        }
                        else {
                            hSequence_1 = hSeq;
                            loopFn_1();
                        }
                    });
                }
            }
        });
    };
    TpmSecurityClient.prototype._activateIdentityKey = function (activationBlob, activateCallback) {
        var _this = this;
        var credentialBlob;
        var encodedSecret = new tss.TPM2B_ENCRYPTED_SECRET();
        var idKeyDupBlob = new tss_js_1.TPM2B_PRIVATE();
        var encWrapKey = new tss.TPM2B_ENCRYPTED_SECRET();
        //
        // Un-marshal components of the activation blob received from the provisioning service.
        //
        var buf = activationBlob instanceof Buffer ? new tss.TpmBuffer(activationBlob) : activationBlob;
        credentialBlob = buf.sizedFromTpm(tss.TPMS_ID_OBJECT, 2);
        encodedSecret = buf.createFromTpm(tss.TPM2B_ENCRYPTED_SECRET);
        idKeyDupBlob = buf.createFromTpm(tss.TPM2B_PRIVATE);
        encWrapKey = buf.createFromTpm(tss.TPM2B_ENCRYPTED_SECRET);
        this._idKeyPub = buf.sizedFromTpm(tss_js_1.TPMT_PUBLIC, 2);
        // This exists in the sample code but does not seem to have an equivalent here. (sample: https://github.com/Microsoft/TSS.MSR/blob/master/TSS.JS/test/Test_Azure_IoT_Provisioning.ts)
        // this.encUriData = buf.createFromTpm(tss.TPM2B_DATA);
        if (!buf.isOk())
            return activateCallback(new azure_iot_common_1.errors.SecurityDeviceError('Could not unmarshal activation data'));
        if (buf.curPos !== buf.length)
            debug('WARNING: Activation Blob sent by DPS has contains extra unidentified data');
        //
        // Start a policy session to be used with ActivateCredential()
        //
        this._tpm.GetRandom(TpmSecurityClient._tpmNonceSize, function (err, nonce) {
            if (err) {
                var secErr = new azure_iot_common_1.errors.SecurityDeviceError('Could not get random nonce');
                secErr.tpmError = err;
                activateCallback(secErr);
            }
            else {
                _this._tpm.StartAuthSession(null, null, nonce, null, tss.TPM_SE.POLICY, tss.NullSymDef, tss_js_1.TPM_ALG_ID.SHA256, function (err, resp) {
                    var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                    debug('StartAuthSession(POLICY_SESS) returned ' + tss_js_1.TPM_RC[rc] + '; sess handle: ' + resp.handle.handle.toString(16));
                    if (rc !== tss_js_1.TPM_RC.SUCCESS) {
                        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                        activateCallback(new azure_iot_common_1.errors.SecurityDeviceError('Authorization session unable to be created.  RC value: ' + tss_js_1.TPM_RC[rc].toString()));
                    }
                    else {
                        var policySession_1 = new tss.Session(resp.handle, resp.nonceTPM);
                        //
                        // Apply the policy necessary to authorize an EK on Windows
                        //
                        _this._tpm.withSession(tss.NullPwSession).PolicySecret(tss.Endorsement, policySession_1.SessIn.sessionHandle, null, null, null, 0, function (err, resp) {
                            var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                            debug('PolicySecret() returned ' + tss_js_1.TPM_RC[rc]);
                            if (rc !== tss_js_1.TPM_RC.SUCCESS) {
                                /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                                activateCallback(new azure_iot_common_1.errors.SecurityDeviceError('Unable to apply the necessary policy to authorize the EK.  RC value: ' + tss_js_1.TPM_RC[rc].toString()));
                            }
                            else {
                                //
                                // Use ActivateCredential() to decrypt symmetric key that is used as an inner protector
                                // of the duplication blob of the new Device ID key generated by DRS.
                                //
                                _this._tpm.withSessions(tss.NullPwSession, policySession_1).ActivateCredential(TpmSecurityClient._srkPersistentHandle, TpmSecurityClient._ekPersistentHandle, credentialBlob, encodedSecret.secret, function (err, innerWrapKey) {
                                    var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                                    debug('ActivateCredential() returned ' + tss_js_1.TPM_RC[rc] + '; innerWrapKey size ' + innerWrapKey.length);
                                    if (rc !== tss_js_1.TPM_RC.SUCCESS) {
                                        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                                        activateCallback(new azure_iot_common_1.errors.SecurityDeviceError('Unable to decrypt the symmetric key used to protect duplication blob.  RC value: ' + tss_js_1.TPM_RC[rc].toString()));
                                    }
                                    else {
                                        //
                                        // Initialize parameters of the symmetric key used by DRS
                                        // Note that the client uses the key size chosen by DRS, but other parameters are fixed (an AES key in CFB mode).
                                        //
                                        var symDef = new tss.TPMT_SYM_DEF_OBJECT(tss_js_1.TPM_ALG_ID.AES, innerWrapKey.length * 8, tss_js_1.TPM_ALG_ID.CFB);
                                        //
                                        // Import the new Device ID key issued by DRS to the device's TPM
                                        //
                                        _this._tpm.withSession(tss.NullPwSession).Import(TpmSecurityClient._srkPersistentHandle, innerWrapKey, _this._idKeyPub, idKeyDupBlob, encWrapKey.secret, symDef, function (err, idKeyPrivate) {
                                            var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                                            debug('Import() returned ' + tss_js_1.TPM_RC[rc] + '; idKeyPrivate size ' + idKeyPrivate.buffer.length);
                                            if (rc !== tss_js_1.TPM_RC.SUCCESS) {
                                                /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                                                activateCallback(new azure_iot_common_1.errors.SecurityDeviceError('Unable to import the device id key into the TPM.  RC value: ' + tss_js_1.TPM_RC[rc].toString()));
                                            }
                                            else {
                                                //
                                                // Load the imported key into the TPM
                                                //
                                                _this._tpm.withSession(tss.NullPwSession).Load(TpmSecurityClient._srkPersistentHandle, idKeyPrivate, _this._idKeyPub, function (err, hIdKey) {
                                                    var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                                                    debug('Load() returned ' + tss_js_1.TPM_RC[rc] + '; ID key handle: 0x' + hIdKey.handle.toString(16));
                                                    if (rc !== tss_js_1.TPM_RC.SUCCESS) {
                                                        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                                                        activateCallback(new azure_iot_common_1.errors.SecurityDeviceError('Unable to load the device id key into the TPM.  RC value: ' + tss_js_1.TPM_RC[rc].toString()));
                                                    }
                                                    else {
                                                        //
                                                        // Remove possibly existing persistent instance of the previous Device ID key
                                                        //
                                                        _this._tpm.allowErrors().withSession(tss.NullPwSession).EvictControl(tss.Owner, TpmSecurityClient._idKeyPersistentHandle, TpmSecurityClient._idKeyPersistentHandle, function () {
                                                            //
                                                            // Persist the new Device ID key
                                                            //
                                                            _this._tpm.withSession(tss.NullPwSession).EvictControl(tss.Owner, hIdKey, TpmSecurityClient._idKeyPersistentHandle, function (err) {
                                                                var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                                                                if (rc !== tss_js_1.TPM_RC.SUCCESS) {
                                                                    /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                                                                    activateCallback(new azure_iot_common_1.errors.SecurityDeviceError('Unable to persist the device id key into the TPM.  RC value: ' + tss_js_1.TPM_RC[rc].toString()));
                                                                }
                                                                else {
                                                                    //
                                                                    // Free the ID Key transient handle and the session object.  Doesn't matter if it "fails".  Go on at this point./
                                                                    //
                                                                    _this._tpm.FlushContext(hIdKey, function (err) {
                                                                        var rc = err ? err.responseCode : tss_js_1.TPM_RC.SUCCESS;
                                                                        debug('FlushContext(TRANS_ID_KEY) returned ' + tss_js_1.TPM_RC[rc]);
                                                                        if (err) {
                                                                            var secErr = new azure_iot_common_1.errors.SecurityDeviceError('Could not get TPM capabilities');
                                                                            secErr.tpmError = err;
                                                                            activateCallback(secErr);
                                                                        }
                                                                        else {
                                                                            _this._tpm.FlushContext(policySession_1.SessIn.sessionHandle, function (err) {
                                                                                debug('FlushContext(POLICY_SESS) returned ' + tss_js_1.TPM_RC[rc]);
                                                                                if (err) {
                                                                                    var secErr = new azure_iot_common_1.errors.SecurityDeviceError('Could not get TPM capabilities');
                                                                                    secErr.tpmError = err;
                                                                                    activateCallback(secErr);
                                                                                }
                                                                                else {
                                                                                    activateCallback(null);
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    };
    TpmSecurityClient._aes128SymDef = new tss.TPMT_SYM_DEF_OBJECT(tss_js_1.TPM_ALG_ID.AES, 128, tss_js_1.TPM_ALG_ID.CFB);
    TpmSecurityClient._ekPersistentHandle = new tss_js_1.TPM_HANDLE(0x81010001);
    TpmSecurityClient._srkPersistentHandle = new tss_js_1.TPM_HANDLE(0x81000001);
    TpmSecurityClient._idKeyPersistentHandle = new tss_js_1.TPM_HANDLE(0x81000100);
    TpmSecurityClient._tpmNonceSize = 20; // See TPM Structures v1.2
    TpmSecurityClient._ekTemplate = new tss_js_1.TPMT_PUBLIC(tss_js_1.TPM_ALG_ID.SHA256, tss_js_1.TPMA_OBJECT.restricted | tss_js_1.TPMA_OBJECT.decrypt | tss_js_1.TPMA_OBJECT.fixedTPM | tss_js_1.TPMA_OBJECT.fixedParent | tss_js_1.TPMA_OBJECT.adminWithPolicy | tss_js_1.TPMA_OBJECT.sensitiveDataOrigin, Buffer.from('837197674484b3f81a90cc8d46a5d724fd52d76e06520b64f2a1da1b331469aa', 'hex'), new tss.TPMS_RSA_PARMS(TpmSecurityClient._aes128SymDef, new tss.TPMS_NULL_ASYM_SCHEME(), 2048, 0), new tss.TPM2B_PUBLIC_KEY_RSA());
    TpmSecurityClient._srkTemplate = new tss_js_1.TPMT_PUBLIC(tss_js_1.TPM_ALG_ID.SHA256, tss_js_1.TPMA_OBJECT.restricted | tss_js_1.TPMA_OBJECT.decrypt | tss_js_1.TPMA_OBJECT.fixedTPM | tss_js_1.TPMA_OBJECT.fixedParent | tss_js_1.TPMA_OBJECT.noDA | tss_js_1.TPMA_OBJECT.userWithAuth | tss_js_1.TPMA_OBJECT.sensitiveDataOrigin, null, new tss.TPMS_RSA_PARMS(TpmSecurityClient._aes128SymDef, new tss.TPMS_NULL_ASYM_SCHEME(), 2048, 0), new tss.TPM2B_PUBLIC_KEY_RSA());
    return TpmSecurityClient;
}());
exports.TpmSecurityClient = TpmSecurityClient;
//# sourceMappingURL=tpm.js.map