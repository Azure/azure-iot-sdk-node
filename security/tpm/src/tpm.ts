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

  private static readonly _aes128SymDef: tss.TPMT_SYM_DEF_OBJECT = new tss.TPMT_SYM_DEF_OBJECT(TPM_ALG_ID.AES, 128, TPM_ALG_ID.CFB); //DevSkim: ignore DS187371

  private static readonly _ekPersistentHandle: TPM_HANDLE = new TPM_HANDLE(0x81010001);
  private static readonly _srkPersistentHandle: TPM_HANDLE = new TPM_HANDLE(0x81000001);
  private static readonly _idKeyPersistentHandle: TPM_HANDLE = new TPM_HANDLE(0x81000100);
  private static readonly _tpmNonceSize: number = 20; // See TPM Structures v1.2

  private static readonly _ekTemplate: TPMT_PUBLIC = new TPMT_PUBLIC(TPM_ALG_ID.SHA256,
    TPMA_OBJECT.restricted | TPMA_OBJECT.decrypt | TPMA_OBJECT.fixedTPM | TPMA_OBJECT.fixedParent |
    TPMA_OBJECT.adminWithPolicy | TPMA_OBJECT.sensitiveDataOrigin,
    Buffer.from('837197674484b3f81a90cc8d46a5d724fd52d76e06520b64f2a1da1b331469aa', 'hex'), //DevSkim: ignore DS173237
    new tss.TPMS_RSA_PARMS(TpmSecurityClient._aes128SymDef, new tss.TPMS_NULL_ASYM_SCHEME(), 2048, 0),
    new tss.TPM2B_PUBLIC_KEY_RSA());

  private static readonly _srkTemplate: TPMT_PUBLIC = new TPMT_PUBLIC(TPM_ALG_ID.SHA256,
    TPMA_OBJECT.restricted | TPMA_OBJECT.decrypt | TPMA_OBJECT.fixedTPM | TPMA_OBJECT.fixedParent |
    TPMA_OBJECT.noDA | TPMA_OBJECT.userWithAuth | TPMA_OBJECT.sensitiveDataOrigin,
    null,
    new tss.TPMS_RSA_PARMS(TpmSecurityClient._aes128SymDef, new tss.TPMS_NULL_ASYM_SCHEME(), 2048, 0),
    new tss.TPM2B_PUBLIC_KEY_RSA());

  private _ek: TPMT_PUBLIC = null;
  private _srk: TPMT_PUBLIC = null;
  private _registrationId: string = '';
  private _tpm: Tpm;
  private _fsm: machina.Fsm;
  private _idKeyPub: TPMT_PUBLIC;
  private _encUriData: tss.TPM2B_DATA;



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
            this._fsm.handle('connect', (err, _result) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('getEndorsementKey', callback);
              }
            });
          },
          getStorageRootKey: (callback) => {
            this._fsm.handle('connect', (err, _result) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('getStorageRootKey', callback);
              }
            });
          },
          signWithIdentity: (dataToSign, callback) => {
            this._fsm.handle('connect', (err, _result) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('signWithIdentity', dataToSign, callback);
              }
            });
          },
          activateIdentityKey: (identityKey, callback) => {
            this._fsm.handle('connect', (err, _result) => {
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
                        this._readPersistentPrimary('IDENTITY', TpmSecurityClient._idKeyPersistentHandle, (_readIdErr: Error, idkPublicKey: TPMT_PUBLIC) => {
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

  private _createPersistentPrimary(name: string, hierarchy: TPM_HANDLE, handle: TPM_HANDLE, template: TPMT_PUBLIC, callback: (err: Error, resultPublicKey?: TPMT_PUBLIC) => void): void {
    const checkErrorAndContinue = (opName, next, errorOut) => {
      return (err, resp) => {
        const rc = err ? err.responseCode : TPM_RC.SUCCESS;
        debug(opName + '(' + name + ') returned ' + TPM_RC[rc]);
        if (rc === TPM_RC.SUCCESS) {
          next(resp);
        } else {
          errorOut(err);
        }
      };
    };

    this._tpm.allowErrors().ReadPublic(
      handle,
      checkErrorAndContinue(
        'ReadPublic',
        (resp: tss.ReadPublicResponse) => { // SUCCESS: an EK already exists.
          debug('ReadPublic(' + name + ') returned ' + TPM_RC[TPM_RC.SUCCESS] + '; PUB: ' + resp.outPublic.toString());
          callback(null, resp.outPublic);
        },
        () => { // Recoverable error: just create a new EK.
          /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_017: [If the endorsement key does NOT exist, a new key will be created.] */
          /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_018: [If the storage root key does NOT exist, a new key will be created.] */
          this._tpm.withSession(tss.NullPwSession).CreatePrimary(
            hierarchy,
            new tss.TPMS_SENSITIVE_CREATE(),
            template,
            null,
            null,
            checkErrorAndContinue('CreatePrimary', (resp: tss.CreatePrimaryResponse) => {
              this._tpm.withSession(tss.NullPwSession).EvictControl(
                tss.Owner,
                resp.handle,
                handle,
                checkErrorAndContinue('EvictControl', () => {
                  debug('EvictControl(0x' + resp.handle.handle.toString(16) + ', 0x' + handle.handle.toString(16) + ') returned ' + TPM_RC[TPM_RC.SUCCESS]);
                  this._tpm.FlushContext(
                    resp.handle,
                    checkErrorAndContinue('FlushContext', () => {
                      callback(null, resp.outPublic); // SUCCESS: an EK has been created.
                    },
                    callback)
                  );
                },
                callback)
              );
            },
            callback)
          );
        }
      )
    );
  }

  private _readPersistentPrimary(name: string, handle: TPM_HANDLE, callback: (err: Error, resultPublicKey: TPMT_PUBLIC) => void): void {
    this._tpm.allowErrors().ReadPublic(handle, (err: tss.TpmError, resp: tss.ReadPublicResponse) => {
      const rc = err ? err.responseCode : TPM_RC.SUCCESS;
      debug('ReadPublic(' + name + ') returned ' + TPM_RC[rc] +  (rc === TPM_RC.SUCCESS ? '; PUB: ' + resp.outPublic.toString() : ''));
      if (rc !== TPM_RC.SUCCESS) {
        debug('readPersistentPrimary failed for: ' + name);
        callback(new errors.SecurityDeviceError('Authorization unable to find a persistent identity key.'), null);
      } else {
        callback(null, resp.outPublic);
      }
    });
  }

  private _getPropsAndHashAlg(callback: (err: tss.TpmError, algorithm?: TPM_ALG_ID, properties?: tss.TPML_TAGGED_TPM_PROPERTY) => void): void {
    const idKeyHashAlg: TPM_ALG_ID = (<tss.TPMS_SCHEME_HMAC>(<tss.TPMS_KEYEDHASH_PARMS>this._idKeyPub.parameters).scheme).hashAlg;

    this._tpm.GetCapability(tss.TPM_CAP.TPM_PROPERTIES, TPM_PT.INPUT_BUFFER, 1, (err: tss.TpmError, caps: tss.GetCapabilityResponse) => {
      const rc = err ? err.responseCode : TPM_RC.SUCCESS;
      debug('GetCapability returned: ' + TPM_RC[rc]);
      if (rc === TPM_RC.SUCCESS) {
        const props = <tss.TPML_TAGGED_TPM_PROPERTY>caps.capabilityData;
        callback(null, idKeyHashAlg, props);
      } else {
        callback(err);
      }
    });
  }

  private _signData(dataToSign: Buffer, callback: (err: Error, signedData?: Buffer) => void): void {
    /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_013: [If `signWithIdentity` is invoked without a previous successful invocation of `activateIdentityKey`, the callback will be invoked with `err` of `InvalidOperationError`] */
    if (!this._idKeyPub) {
      return callback(new errors.InvalidOperationError('activateIdentityKey must be invoked before any signing is attempted.'));
    }

    this._getPropsAndHashAlg((err, idKeyHashAlg, props) => {
      if (err) {
        const secErr = new errors.SecurityDeviceError('Could not get TPM capabilities');
        (<any>secErr).tpmError = err;
        callback(secErr);
      } else if (props.tpmProperty.length !== 1 || props.tpmProperty[0].property !== TPM_PT.INPUT_BUFFER) {
        /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_015: [If the tpm device is not properly configured, the callback will be invoked with `err` of `SecurityDeviceError`.] */
        callback(new errors.SecurityDeviceError('Unexpected result of TPM2_GetCapability(TPM_PT.INPUT_BUFFER)'));
      } else {
        const maxInputBuffer: number = props.tpmProperty[0].value;
        if (dataToSign.length <= maxInputBuffer) {
          this._tpm.withSession(tss.NullPwSession).HMAC(TpmSecurityClient._idKeyPersistentHandle, dataToSign, idKeyHashAlg, (err: tss.TpmError, signature: Buffer) => {
            const rc = err ? err.responseCode : TPM_RC.SUCCESS;
            debug('HMAC returned: ' + TPM_RC[rc]);
            if (rc === TPM_RC.SUCCESS) {
              callback(null, signature);
            } else {
              callback(err);
            }
          });
        } else {
          let curPos: number = 0;
          let bytesLeft: number = dataToSign.length;
          let hSequence: TPM_HANDLE = null;
          const loopFn = () => {
            if (bytesLeft > maxInputBuffer) {
              const sliceCurPos = curPos;
              bytesLeft -= maxInputBuffer;
              curPos += maxInputBuffer;
              this._tpm.withSession(tss.NullPwSession).SequenceUpdate(hSequence, dataToSign.slice(sliceCurPos, sliceCurPos + maxInputBuffer), loopFn);
            } else {
              this._tpm.withSession(tss.NullPwSession).SequenceComplete(hSequence, dataToSign.slice(curPos, curPos + bytesLeft), new TPM_HANDLE(tss.TPM_RH.NULL), (err: tss.TpmError, resp: tss.SequenceCompleteResponse) => {
                const rc = err ? err.responseCode : TPM_RC.SUCCESS;
                debug('SequenceComplete returned: ' + TPM_RC[rc]);
                if (rc === TPM_RC.SUCCESS) {
                  callback(null, resp.result);
                } else {
                  callback(err);
                }
              });
            }
          };
          this._tpm.withSession(tss.NullPwSession).HMAC_Start(TpmSecurityClient._idKeyPersistentHandle, Buffer.alloc(0), idKeyHashAlg, (err: tss.TpmError, hSeq: TPM_HANDLE) => {
            const rc = err ? err.responseCode : TPM_RC.SUCCESS;
            debug('HMAC_Start returned: ' + TPM_RC[rc]);
            if (err) {
              const secErr = new errors.SecurityDeviceError('Could not hash key');
              (<any>secErr).tpmError = err;
              callback(secErr);
            } else {
              hSequence = hSeq;
              loopFn();
            }
          });
        }
      }
    });
  }

  private _activateIdentityKey(activationBlob: Buffer, activateCallback: (err: Error) => void): void {



    //
    // Un-marshal components of the activation blob received from the provisioning service.
    //
    const buf: tss.TpmBuffer = activationBlob instanceof Buffer ? new tss.TpmBuffer(activationBlob) : activationBlob;

    const credentialBlob: tss.TPMS_ID_OBJECT = buf.createSizedObj(tss.TPMS_ID_OBJECT);
    const encodedSecret: tss.TPM2B_ENCRYPTED_SECRET = buf.createObj(tss.TPM2B_ENCRYPTED_SECRET);
    const idKeyDupBlob: tss.TPM2B_PRIVATE = buf.createObj(tss.TPM2B_PRIVATE);
    const encWrapKey: tss.TPM2B_ENCRYPTED_SECRET = buf.createObj(tss.TPM2B_ENCRYPTED_SECRET);
    this._idKeyPub = buf.createSizedObj(TPMT_PUBLIC);
    this._encUriData = buf.createObj(tss.TPM2B_DATA);
    debug('The value of the encUriData: ' + this._encUriData.toString());

    if (!buf.isOk())
      return activateCallback(new errors.SecurityDeviceError('Could not unmarshal activation data'));

    if (buf.curPos !== buf.size)
      debug('WARNING: Activation Blob sent by DPS has contains extra unidentified data');

    //
    // Start a policy session to be used with ActivateCredential()
    //
    this._tpm.GetRandom(TpmSecurityClient._tpmNonceSize, (err: tss.TpmError, nonce: Buffer) => {
      if (err) {
        const secErr = new errors.SecurityDeviceError('Could not get random nonce');
        (<any>secErr).tpmError = err;
        activateCallback(secErr);
      } else {
        this._tpm.StartAuthSession(null, null, nonce, null, tss.TPM_SE.POLICY, tss.NullSymDef, TPM_ALG_ID.SHA256, (err: tss.TpmError, resp: tss.StartAuthSessionResponse) => {
          const rc = err ? err.responseCode : TPM_RC.SUCCESS;
          debug('StartAuthSession(POLICY_SESS) returned ' + TPM_RC[rc] + '; sess handle: ' + resp.handle.handle.toString(16));
          if (rc !== TPM_RC.SUCCESS) {
            /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
            activateCallback(new errors.SecurityDeviceError('Authorization session unable to be created.  RC value: ' + TPM_RC[rc].toString()));
          } else {
            const policySession = new tss.Session(resp.handle, resp.nonceTPM);

            //
            // Apply the policy necessary to authorize an EK on Windows
            //

            // this._tpm.withSession(tss.NullPwSession).PolicySecret(tss.Endorsement, policySession.SessIn.sessionHandle, null, null, null, 0, (err: tss.TpmError, _resp: tss.PolicySecretResponse) => {
            this._tpm.PolicySecret(tss.Endorsement, policySession.SessIn.sessionHandle, null, null, null, 0, (err: tss.TpmError, _resp: tss.PolicySecretResponse) => {
              const rc = err ? err.responseCode : TPM_RC.SUCCESS;
              debug('PolicySecret() returned ' + TPM_RC[rc]);
              if (rc !== TPM_RC.SUCCESS) {
                /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                activateCallback(new errors.SecurityDeviceError('Unable to apply the necessary policy to authorize the EK.  RC value: ' + TPM_RC[rc].toString()));
              } else {

                //
                // Use ActivateCredential() to decrypt symmetric key that is used as an inner protector
                // of the duplication blob of the new Device ID key generated by DRS.
                //

                this._tpm.withSessions(tss.NullPwSession, policySession).ActivateCredential(TpmSecurityClient._srkPersistentHandle, TpmSecurityClient._ekPersistentHandle, credentialBlob, encodedSecret.secret, (err: tss.TpmError, innerWrapKey: Buffer) => {
                  const rc = err ? err.responseCode : TPM_RC.SUCCESS;
                  debug('ActivateCredential() returned ' + TPM_RC[rc] + '; innerWrapKey size ' + innerWrapKey.length);
                  if (rc !== TPM_RC.SUCCESS) {
                    /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                    activateCallback(new errors.SecurityDeviceError('Unable to decrypt the symmetric key used to protect duplication blob.  RC value: ' + TPM_RC[rc].toString()));
                  } else if (innerWrapKey.length === 0) {
                    activateCallback(new errors.SecurityDeviceError('Unable to unwrap inner key - must have administrator privilege'));
                  } else {
                    //
                    // Initialize parameters of the symmetric key used by DRS
                    // Note that the client uses the key size chosen by DRS, but other parameters are fixed (an AES key in CFB mode).
                    //
                    const symDef = new tss.TPMT_SYM_DEF_OBJECT(TPM_ALG_ID.AES, innerWrapKey.length * 8, TPM_ALG_ID.CFB); //DevSkim: ignore DS187371

                    //
                    // Import the new Device ID key issued by DRS to the device's TPM
                    //

                    this._tpm.withSession(tss.NullPwSession).Import(TpmSecurityClient._srkPersistentHandle, innerWrapKey, this._idKeyPub, idKeyDupBlob, encWrapKey.secret, symDef, (err: tss.TpmError, idKeyPrivate: TPM2B_PRIVATE) => {
                      const rc = err ? err.responseCode : TPM_RC.SUCCESS;
                      debug('Import() returned ' + TPM_RC[rc] + '; idKeyPrivate size ' + idKeyPrivate.buffer.length);
                      if (rc !== TPM_RC.SUCCESS) {
                          /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                          activateCallback(new errors.SecurityDeviceError('Unable to import the device id key into the TPM.  RC value: ' + TPM_RC[rc].toString()));
                      } else {

                        //
                        // Load the imported key into the TPM
                        //

                        this._tpm.withSession(tss.NullPwSession).Load(TpmSecurityClient._srkPersistentHandle, idKeyPrivate, this._idKeyPub, (err: tss.TpmError, hIdKey: TPM_HANDLE) => {
                          const rc = err ? err.responseCode : TPM_RC.SUCCESS;
                          debug('Load() returned ' + TPM_RC[rc] + '; ID key handle: 0x' + hIdKey.handle.toString(16));
                          if (rc !== TPM_RC.SUCCESS) {
                            /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                            activateCallback(new errors.SecurityDeviceError('Unable to load the device id key into the TPM.  RC value: ' + TPM_RC[rc].toString()));
                          } else {

                            //
                            // Remove possibly existing persistent instance of the previous Device ID key
                            //

                            this._tpm.allowErrors().withSession(tss.NullPwSession).EvictControl(tss.Owner, TpmSecurityClient._idKeyPersistentHandle, TpmSecurityClient._idKeyPersistentHandle, () => {

                              //
                              // Persist the new Device ID key
                              //

                              this._tpm.withSession(tss.NullPwSession).EvictControl(tss.Owner, hIdKey, TpmSecurityClient._idKeyPersistentHandle, (err: tss.TpmError) => {
                                const rc = err ? err.responseCode : TPM_RC.SUCCESS;
                                if (rc !== TPM_RC.SUCCESS) {
                                  /*Codes_SRS_NODE_TPM_SECURITY_CLIENT_06_016: [If an error is encountered activating the identity key, the callback with be invoked with an `Error` of `SecurityDeviceError`.] */
                                  activateCallback(new errors.SecurityDeviceError('Unable to persist the device id key into the TPM.  RC value: ' + TPM_RC[rc].toString()));
                                } else {

                                  //
                                  // Free the ID Key transient handle and the session object.  Doesn't matter if it "fails".  Go on at this point./
                                  //

                                  this._tpm.FlushContext(hIdKey, (err: tss.TpmError) => {
                                    const rc = err ? err.responseCode : TPM_RC.SUCCESS;
                                    debug('FlushContext(TRANS_ID_KEY) returned ' + TPM_RC[rc]);
                                    if (err) {
                                      const secErr = new errors.SecurityDeviceError('Could not get TPM capabilities');
                                      (<any>secErr).tpmError = err;
                                      activateCallback(secErr);
                                    } else {
                                      this._tpm.FlushContext(policySession.SessIn.sessionHandle, (err: tss.TpmError) => {
                                        debug('FlushContext(POLICY_SESS) returned ' + TPM_RC[rc]);
                                        if (err) {
                                          const secErr = new errors.SecurityDeviceError('Could not get TPM capabilities');
                                          (<any>secErr).tpmError = err;
                                          activateCallback(secErr);
                                        } else {
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
  }
}

