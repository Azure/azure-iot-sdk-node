// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { errors } from 'azure-iot-common';
import * as machina from 'machina';
import * as tss from 'tss.js';
import { Tpm, TPM_HANDLE, TPM_ALG_ID, TPM_RC, TPM_PT, TPMA_OBJECT, TPMT_PUBLIC, TPM2B_PRIVATE } from 'tss.js';
import * as crypto from 'crypto';
import base32Encode = require('base32-encode');

import * as dbg from 'debug';

const debug = dbg('azure-iot-security-tpm:TpmSecurityClient');

/**
 * @private
 */
export class TpmSecurityClient  {

  private static readonly _aes128SymDef: tss.TPMT_SYM_DEF_OBJECT = new tss.TPMT_SYM_DEF_OBJECT(TPM_ALG_ID.AES, 128, TPM_ALG_ID.CFB);

  private static readonly _ekPersistentHandle: TPM_HANDLE = new TPM_HANDLE(0x81010001);
  private static readonly _srkPersistentHandle: TPM_HANDLE = new TPM_HANDLE(0x81000001);
  private static readonly _idKeyPersistentHandle: TPM_HANDLE = new TPM_HANDLE(0x81000100);
  private static readonly _tpmNonceSize: number = 20; // See TPM Structures v1.2

  private static readonly _ekTemplate: TPMT_PUBLIC = new TPMT_PUBLIC(TPM_ALG_ID.SHA256,
    TPMA_OBJECT.restricted | TPMA_OBJECT.decrypt | TPMA_OBJECT.fixedTPM | TPMA_OBJECT.fixedParent | TPMA_OBJECT.adminWithPolicy | TPMA_OBJECT.sensitiveDataOrigin,
    new Buffer('837197674484b3f81a90cc8d46a5d724fd52d76e06520b64f2a1da1b331469aa', 'hex'),
    new tss.TPMS_RSA_PARMS(TpmSecurityClient._aes128SymDef, new tss.TPMS_NULL_ASYM_SCHEME(), 2048, 0),
    new tss.TPM2B_PUBLIC_KEY_RSA());

  private static readonly _srkTemplate: TPMT_PUBLIC = new TPMT_PUBLIC(TPM_ALG_ID.SHA256,
    TPMA_OBJECT.restricted | TPMA_OBJECT.decrypt | TPMA_OBJECT.fixedTPM | TPMA_OBJECT.fixedParent | TPMA_OBJECT.noDA | TPMA_OBJECT.userWithAuth | TPMA_OBJECT.sensitiveDataOrigin,
    null,
    new tss.TPMS_RSA_PARMS(TpmSecurityClient._aes128SymDef, new tss.TPMS_NULL_ASYM_SCHEME(), 2048, 0),
    new tss.TPM2B_PUBLIC_KEY_RSA());

  private _ek: TPMT_PUBLIC = null;
  private _srk: TPMT_PUBLIC = null;
  private _registrationId: string = '';
  private _tpm: Tpm;
  private _fsm: machina.Fsm;
  private _idKeyPub: TPMT_PUBLIC = null;


  constructor(registrationId?: string, customTpm?: any) {
    /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_002: [The `customTpm` argument, if present` will be used at the underlying TPM provider.  Otherwise the TPM provider will the tss TPM client with a parameter of `false` for simulator use.] */
    this._tpm = customTpm ? customTpm : new Tpm(false);
    if (registrationId) {
      /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_001: [The `registrationId` argument if present will be returned as the `registrationId` for subsequent calls to `getRegistrationId`.] */
      this._registrationId = registrationId;
    }
    this._fsm = new machina.Fsm({
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (callback, err) => {
            this._ek = null;
            this._srk = null;
            this._idKeyPub = null;
            if (callback) {
              if (err) {
                callback(err);
              } else {
                callback(null, null);
              }
            }
          },
          connect: (connectCallback) => this._fsm.transition('connecting', connectCallback),
          getEndorsementKey: (callback) => {
            this._fsm.handle('connect', (err, result) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('getEndorsementKey', callback);
              }
            });
          },
          getStorageRootKey: (callback) => {
            this._fsm.handle('connect', (err, result) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('getStorageRootKey', callback);
              }
            });
          },
          signWithIdentity: (dataToSign, callback) => {
            this._fsm.handle('connect', (err, result) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('signWithIdentity', dataToSign, callback);
              }
            });
          },
          activateIdentityKey: (identityKey, callback) => {
            this._fsm.handle('connect', (err, result) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('activateIdentityKey', identityKey, callback);
              }
            });
          }
        },
        connecting: {
          _onEnter: (callback) => {
            try {
              this._tpm.connect(() => {
                this._createPersistentPrimary('EK', tss.Endorsement, TpmSecurityClient._ekPersistentHandle, TpmSecurityClient._ekTemplate, (ekCreateErr: Error, ekPublicKey: TPMT_PUBLIC) => {
                  if (ekCreateErr) {
                    /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_007: [Any errors from interacting with the TPM hardware will cause in SecurityDeviceError to be returned in the err parameter of the callback.] */
                    this._fsm.transition('disconnected', callback, ekCreateErr);
                  } else {
                    /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_006: [The `getEndorsementKey` function shall query the TPM hardware and return the `endorsementKey` in the callback.] */
                    this._ek = ekPublicKey;
                    this._createPersistentPrimary('SRK', tss.Owner, TpmSecurityClient._srkPersistentHandle, TpmSecurityClient._srkTemplate, (srkCreateErr: Error, srkPublicKey: TPMT_PUBLIC) => {
                      if (srkCreateErr) {
                        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_009: [Any errors from interacting with the TPM hardware will cause in SecurityDeviceError to be returned in the err parameter of the callback.] */
                        this._fsm.transition('disconnected', callback, srkCreateErr);
                      } else {
                        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_008: [The `getStorageRootKey` function shall query the TPM hardware and return the `storageRootKey` in the callback.] */
                        this._srk = srkPublicKey;
                        this._readPersistentPrimary('IDENTITY', TpmSecurityClient._idKeyPersistentHandle, (readIdErr: Error, idkPublicKey: TPMT_PUBLIC) => {
                          //
                          // Not any kind of fatal error if we can't retrieve the identity public portion.  This device might not have ever been provisioned.
                          // If there is a signing operation attempted before an activate is attempted, an error will occur.
                          //
                          this._idKeyPub = idkPublicKey;
                          this._fsm.transition('connected', callback);
                        });
                      }
                    });
                  }
                });
              });
            } catch (err) {
              this._fsm.transition('disconnected', callback, err);
            }
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        connected: {
          _onEnter: (callback) => {
            callback(null);
          },
          getEndorsementKey: (callback) => {
            callback(null, this._ek.asTpm2B());
          },
          getStorageRootKey: (callback) => {
            callback(null, this._srk.asTpm2B());
          },
          signWithIdentity: (dataToSign, callback) => {
            this._signData(dataToSign, (err: Error, signedData: Buffer) => {
              if (err) {
                debug('Error from signing data: ' + err);
                this._fsm.transition('disconnected', callback, err);
              } else {
                callback(null, signedData);
              }
            });
          },
          activateIdentityKey: (identityKey, callback) => {
            this._activateIdentityKey(identityKey, (err: Error) => {
              if (err) {
                debug('Error from activate: ' + err);
                this._fsm.transition('disconnected', callback, err);
              } else {
                callback(null, null);
              }
            });
          },
        }
      }
    });
    this._fsm.on('transition', (data) => debug('TPM security State Machine: ' + data.fromState + ' -> ' + data.toState + ' (' + data.action + ')'));
    this._fsm.on('handling', (data) => debug('TPM security State Machine: handling ' + data.inputType));
  }

  /**
   * @method           module:azure-iot-security-tpm.TpmSecurityClient#getEndorsementKey
   * @description      Query the endorsement key on the TPM.
   * @param {function}          callback        Invoked upon completion of the operation.
   *                                            If the err argument is non-null then the endorsementKey
   *                                            parameter will be undefined.
   */
  getEndorsementKey(callback: (err: Error, endorsementKey?: Buffer) => void): void {
      this._fsm.handle('getEndorsementKey', callback);
  }

  /**
   * @method           module:azure-iot-security-tpm.TpmSecurityClient#getStorageRootKey
   * @description      Query the storage root key on the TPM.
   * @param {function}          callback        Invoked upon completion of the operation.
   *                                            If the err argument is non-null then the storageRootKey
   *                                            parameter will be undefined.
   */
  getStorageRootKey(callback: (err: Error, storageKey?: Buffer) => void): void {
    this._fsm.handle('getStorageRootKey', callback);
  }

  /**
   * @method           module:azure-iot-security-tpm.TpmSecurityClient#signWithIdentity
   * @description      Perform a cryptographic signing operation utilizing the TPM hardware.
   * @param {Buffer}            dataToSign      A buffer of data to sign.  The signing key will have been previously
   *                                            imported into the TPM via an activateIdentityKey.
   * @param {function}          callback        Invoked upon completion of the operation.
   *                                            If the err argument is non-null then the signedData
   *                                            parameter will be undefined.
   */
  signWithIdentity(dataToSign: Buffer, callback: (err: Error, signedData?: Buffer) => void): void {

    /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_011: [If `dataToSign` is falsy, an ReferenceError will be thrown.] */
    if (!dataToSign || dataToSign.length === 0) {
        throw new ReferenceError('\'dataToSign\' cannot be \'' + dataToSign + '\'');
    }
    this._fsm.handle('signWithIdentity', dataToSign, callback);
}

  /**
   * @method           module:azure-iot-security-tpm.TpmSecurityClient#activateIdentityKey
   * @description      Activate the provided key into the TPM for use in signing operations later.
   * @param {function}          callback        Invoked upon completion of the operation.
   */
  activateIdentityKey(identityKey: Buffer, callback: (err: Error) => void): void {
    if (!identityKey || identityKey.length === 0) {
      throw new ReferenceError('\'identityKey\' cannot be \'' + identityKey + '\'');
    }
    this._fsm.handle('activateIdentityKey', identityKey, callback);
  }

  /**
   * @method           module:azure-iot-security-tpm.TpmSecurityClient#getRegistrationId
   * @description      Returns the registrationId originally provided to the client, or, if not provided
   *                   it constructs one around the endorsement key.
   * @param {function}          callback        Invoked upon completion of the operation.
   *                                            If the err argument is non-null then the registrationId
   *                                            parameter will be undefined.
   */
  getRegistrationId(callback: (err: Error, registrationId?: string) => void): void {
    if (this._registrationId) {
      /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_003: [If the TpmSecurityClient was given a `registrationId` at creation, that `registrationId` will be returned.] */
      callback(null, this._registrationId);
    } else {
      this.getEndorsementKey( (endorsementError: Error, endorsementKey: Buffer) => {
        if (endorsementError) {
          /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_005: [Any errors from interacting with the TPM hardware will cause an SecurityDeviceError to be returned in the err parameter of the callback.] */
          callback(endorsementError);
        } else {
        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_004: [If not provided, the `registrationId` will be constructed and returned as follows:
          The endorsementKey will be queried.
          The endorsementKey will be hashed utilizing SHA256.
          The resultant digest will be base 32 encoded in conformance with the `RFC4648` specification.
          The resultant string will have terminating `=` characters removed.] */
          const hash = crypto.createHash('sha256');
          hash.update(endorsementKey);
          this._registrationId = (base32Encode(hash.digest(), 'RFC4648').toLowerCase()).replace(/=/g, '');
          callback(null, this._registrationId);
        }
      });
    }
  }

  private _createPersistentPrimary(name: string, hierarchy: TPM_HANDLE, handle: TPM_HANDLE, template: TPMT_PUBLIC, callback: (err: Error, resultPublicKey: TPMT_PUBLIC) => void): void {
    this._tpm.allowErrors().ReadPublic(handle, (resp: tss.ReadPublicResponse) => {
      let rc = this._tpm.getLastResponseCode();
      debug('ReadPublic(' + name + ') returned ' + TPM_RC[rc] +  (rc === TPM_RC.SUCCESS ? '; PUB: ' + resp.outPublic.toString() : ''));
      if (rc !== TPM_RC.SUCCESS) {
        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_017: [If the endorsement key does NOT exist, a new key will be created.] */
        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_018: [If the storage root key does NOT exist, a new key will be created.] */
        this._tpm.withSession(tss.NullPwSession).CreatePrimary(hierarchy, new tss.TPMS_SENSITIVE_CREATE(), template, null, null, (resp: tss.CreatePrimaryResponse) => {
          debug('CreatePrimary(' + name + ') returned ' + TPM_RC[this._tpm.getLastResponseCode()]);
          this._tpm.withSession(tss.NullPwSession).EvictControl(tss.Owner, resp.handle, handle, () => {
            debug('EvictControl(0x' + resp.handle.handle.toString(16) + ', 0x' + handle.handle.toString(16) + ') returned ' + TPM_RC[this._tpm.getLastResponseCode()]);
            this._tpm.FlushContext(resp.handle, () => {
              debug('FlushContext(TRANSIENT_' + name + ') returned ' + TPM_RC[this._tpm.getLastResponseCode()]);
              callback(null, resp.outPublic);
            });
          });
        });
      } else {
        callback(null, resp.outPublic);
      }
    });
  }

  private _readPersistentPrimary(name: string, handle: TPM_HANDLE, callback: (err: Error, resultPublicKey: TPMT_PUBLIC) => void): void {
    this._tpm.allowErrors().ReadPublic(handle, (resp: tss.ReadPublicResponse) => {
      let rc = this._tpm.getLastResponseCode();
      debug('ReadPublic(' + name + ') returned ' + TPM_RC[rc] +  (rc === TPM_RC.SUCCESS ? '; PUB: ' + resp.outPublic.toString() : ''));
      if (rc !== TPM_RC.SUCCESS) {
        debug('readPersistentPrimary failed for: ' + name);
        callback(new errors.SecurityDeviceError('Authorization unable to find a persistent identity key.'), null);
      } else {
        callback(null, resp.outPublic);
      }
    });
  }

  private _getPropsAndHashAlg( callback: (algorithm: TPM_ALG_ID, properties: tss.TPML_TAGGED_TPM_PROPERTY) => void): void {
    const idKeyHashAlg: TPM_ALG_ID = (<tss.TPMS_SCHEME_HMAC>(<tss.TPMS_KEYEDHASH_PARMS>this._idKeyPub.parameters).scheme).hashAlg;

    this._tpm.GetCapability(tss.TPM_CAP.TPM_PROPERTIES, TPM_PT.INPUT_BUFFER, 1, (caps: tss.GetCapabilityResponse) => {
      const props = <tss.TPML_TAGGED_TPM_PROPERTY>caps.capabilityData;
      callback(idKeyHashAlg, props);
    });
  }

  private _signData(dataToSign: Buffer, callback: (err: Error, signedData?: Buffer) => void): void {

    /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_013: [If `signWithIdentity` is invoked without a previous successful invocation of `activateIdentityKey`, the callback will be invoked with `err` of `InvalidOperationError`] */
    if (!this._idKeyPub) {
      return callback(new errors.InvalidOperationError('activateIdentityKey must be invoked before any signing is attempted.'));
    }

    this._getPropsAndHashAlg((idKeyHashAlg, props) => {
      if (props.tpmProperty.length !== 1 || props.tpmProperty[0].property !== TPM_PT.INPUT_BUFFER) {
        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_015: [If the tpm device is not properly configured, the callback will be invoked with `err` of `SecurityDeviceError`.] */
        callback(new errors.SecurityDeviceError('Unexpected result of TPM2_GetCapability(TPM_PT.INPUT_BUFFER)'));
      } else {
        const maxInputBuffer: number = props.tpmProperty[0].value;
        if (dataToSign.length <= maxInputBuffer) {
          this._tpm.withSession(tss.NullPwSession).HMAC(TpmSecurityClient._idKeyPersistentHandle, dataToSign, idKeyHashAlg, (signature: Buffer) => {
            callback(null, signature);
          });
        } else {
          let curPos: number = 0;
          let bytesLeft: number = dataToSign.length;
          let hSequence: TPM_HANDLE = null;
          let loopFn = () => {
            if (bytesLeft > maxInputBuffer) {
              let sliceCurPos = curPos;
              bytesLeft -= maxInputBuffer;
              curPos += maxInputBuffer;
              this._tpm.withSession(tss.NullPwSession).SequenceUpdate(hSequence, dataToSign.slice(sliceCurPos, sliceCurPos + maxInputBuffer), loopFn);
            } else {
              this._tpm.withSession(tss.NullPwSession).SequenceComplete(hSequence, dataToSign.slice(curPos, curPos + bytesLeft), new TPM_HANDLE(tss.TPM_RH.NULL), (resp: tss.SequenceCompleteResponse) => {
                callback(null, resp.result);
              });
            }
          };
          this._tpm.withSession(tss.NullPwSession).HMAC_Start(TpmSecurityClient._idKeyPersistentHandle, new Buffer(0), idKeyHashAlg, (hSeq: TPM_HANDLE) => {
            hSequence = hSeq;
            loopFn();
          });
        }
      }
    });
  }

  private _activateIdentityKey(activationBlob: Buffer, activateCallback: (err: Error) => void): void {

    let currentPosition = 0;
    let credentialBlob: tss.TPMS_ID_OBJECT;
    let encodedSecret = new tss.TPM2B_ENCRYPTED_SECRET();
    let idKeyDupBlob = new TPM2B_PRIVATE();
    let encWrapKey = new tss.TPM2B_ENCRYPTED_SECRET();

    //
    // Un-marshal components of the activation blob received from the provisioning service.
    //
    [credentialBlob, currentPosition] = tss.marshal.sizedFromTpm(tss.TPMS_ID_OBJECT, activationBlob, 2, currentPosition);
    debug('credentialBlob end: ' + currentPosition);
    currentPosition = encodedSecret.fromTpm(activationBlob, currentPosition);
    debug('encodedSecret end: ' + currentPosition);
    currentPosition = idKeyDupBlob.fromTpm(activationBlob, currentPosition);
    debug('idKeyDupBlob end: ' + currentPosition);
    currentPosition = encWrapKey.fromTpm(activationBlob, currentPosition);
    debug('encWrapKey end: ' + currentPosition);
    [this._idKeyPub, currentPosition] = tss.marshal.sizedFromTpm(TPMT_PUBLIC, activationBlob, 2, currentPosition);
    debug('idKeyPub end: ' + currentPosition);

    //
    // Start a policy session to be used with ActivateCredential()
    //

    this._tpm.GetRandom(TpmSecurityClient._tpmNonceSize, (nonce: Buffer) => {
      this._tpm.StartAuthSession(null, null, nonce, null, tss.TPM_SE.POLICY, tss.NullSymDef, TPM_ALG_ID.SHA256, (resp: tss.StartAuthSessionResponse) => {
        debug('StartAuthSession(POLICY_SESS) returned ' + TPM_RC[this._tpm.getLastResponseCode()] + '; sess handle: ' + resp.handle.handle.toString(16));
        if (this._tpm.getLastResponseCode() !== TPM_RC.SUCCESS) {
          /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
          activateCallback(new errors.SecurityDeviceError('Authorization session unable to be created.  RC value: ' + TPM_RC[this._tpm.getLastResponseCode()].toString()));
        } else {
          let policySession = new tss.Session(resp.handle, resp.nonceTPM);

          //
          // Apply the policy necessary to authorize an EK on Windows
          //

          this._tpm.withSession(tss.NullPwSession).PolicySecret(tss.Endorsement, policySession.SessIn.sessionHandle, null, null, null, 0, (resp: tss.PolicySecretResponse) => {
            debug('PolicySecret() returned ' + TPM_RC[this._tpm.getLastResponseCode()]);
            if (this._tpm.getLastResponseCode() !== TPM_RC.SUCCESS) {
              /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
              activateCallback(new errors.SecurityDeviceError('Unable to apply the necessary policy to authorize the EK.  RC value: ' + TPM_RC[this._tpm.getLastResponseCode()].toString()));
            } else {

              //
              // Use ActivateCredential() to decrypt symmetric key that is used as an inner protector
              // of the duplication blob of the new Device ID key generated by DRS.
              //

              this._tpm.withSessions(tss.NullPwSession, policySession).ActivateCredential(TpmSecurityClient._srkPersistentHandle, TpmSecurityClient._ekPersistentHandle, credentialBlob, encodedSecret.secret, (innerWrapKey: Buffer) => {
                debug('ActivateCredential() returned ' + TPM_RC[this._tpm.getLastResponseCode()] + '; innerWrapKey size ' + innerWrapKey.length);
                if (this._tpm.getLastResponseCode() !== TPM_RC.SUCCESS) {
                  /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                  activateCallback(new errors.SecurityDeviceError('Unable to decrypt the symmetric key used to protect duplication blob.  RC value: ' + TPM_RC[this._tpm.getLastResponseCode()].toString()));
                } else {

                  //
                  // Initialize parameters of the symmetric key used by DRS
                  // Note that the client uses the key size chosen by DRS, but other parameters are fixed (an AES key in CFB mode).
                  //
                  let symDef = new tss.TPMT_SYM_DEF_OBJECT(TPM_ALG_ID.AES, innerWrapKey.length * 8, TPM_ALG_ID.CFB);

                  //
                  // Import the new Device ID key issued by DRS to the device's TPM
                  //

                  this._tpm.withSession(tss.NullPwSession).Import(TpmSecurityClient._srkPersistentHandle, innerWrapKey, this._idKeyPub, idKeyDupBlob, encWrapKey.secret, symDef, (idKeyPrivate: TPM2B_PRIVATE) => {
                    debug('Import() returned ' + TPM_RC[this._tpm.getLastResponseCode()] + '; idKeyPrivate size ' + idKeyPrivate.buffer.length);
                    if (this._tpm.getLastResponseCode() !== TPM_RC.SUCCESS) {
                        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                        activateCallback(new errors.SecurityDeviceError('Unable to import the device id key into the TPM.  RC value: ' + TPM_RC[this._tpm.getLastResponseCode()].toString()));
                    } else {

                      //
                      // Load the imported key into the TPM
                      //

                      this._tpm.withSession(tss.NullPwSession).Load(TpmSecurityClient._srkPersistentHandle, idKeyPrivate, this._idKeyPub, (hIdKey: TPM_HANDLE) => {
                        debug('Load() returned ' + TPM_RC[this._tpm.getLastResponseCode()] + '; ID key handle: 0x' + hIdKey.handle.toString(16));
                        if (this._tpm.getLastResponseCode() !== TPM_RC.SUCCESS) {
                          /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                          activateCallback(new errors.SecurityDeviceError('Unable to load the device id key into the TPM.  RC value: ' + TPM_RC[this._tpm.getLastResponseCode()].toString()));
                        } else {

                          //
                          // Remove possibly existing persistent instance of the previous Device ID key
                          //

                          this._tpm.allowErrors().withSession(tss.NullPwSession).EvictControl(tss.Owner, TpmSecurityClient._idKeyPersistentHandle, TpmSecurityClient._idKeyPersistentHandle, () => {

                            //
                            // Persist the new Device ID key
                            //

                            this._tpm.withSession(tss.NullPwSession).EvictControl(tss.Owner, hIdKey, TpmSecurityClient._idKeyPersistentHandle, () => {
                              if (this._tpm.getLastResponseCode() !== TPM_RC.SUCCESS) {
                                /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                                activateCallback(new errors.SecurityDeviceError('Unable to persist the device id key into the TPM.  RC value: ' + TPM_RC[this._tpm.getLastResponseCode()].toString()));
                              } else {

                                //
                                // Free the ID Key transient handle and the session object.  Doesn't matter if it "fails".  Go on at this point./
                                //

                                this._tpm.FlushContext(hIdKey, () => {
                                  debug('FlushContext(TRANS_ID_KEY) returned ' + TPM_RC[this._tpm.getLastResponseCode()]);
                                  this._tpm.FlushContext(policySession.SessIn.sessionHandle, () => {
                                    debug('FlushContext(POLICY_SESS) returned ' + TPM_RC[this._tpm.getLastResponseCode()]);
                                    activateCallback(null);
                                  });
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
    });
  }
}

