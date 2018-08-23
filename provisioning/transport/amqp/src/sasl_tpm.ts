// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as Builder from 'buffer-builder';
import * as dbg from 'debug';
const debug = dbg('azure-iot-provisioning-device-amqp:SaslTpm');

/**
 * @private
 */
export type GetSasTokenCallback = (err: Error, sasToken?: string) => void;

/**
 * @private
 */

export type GetSasToken = (challenge: Buffer, callback: GetSasTokenCallback) => void;

/**
 * @private
 */
export type SaslResponseFrame = {
  response: Buffer
};

/**
 * @private
 */
export class SaslTpm {
  public name: string = 'TPM';
  public hostname: string;

  private _getSasToken: GetSasToken;
  private _challengeKey: Builder;
  private _idScope: string;
  private _registrationId: string;
  private _endorsementKey: Buffer;
  private _storageRootKey: Buffer;

  /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_001: [ The `SaslTpm` constructor shall accept the following parameters:
    `idScope` - the idScope for the provisioning service instance
    `registrationId` - the registrationId for the device being registered
    `endorsementKey` - the endorsement key which was acquired from the TPM
    `storageRootKey` - the storage root key which was acquired from the TPM
    `getSasToken` - The callback to call when the challenge has been completed and the caller needs to formulate the response. ] */
  constructor(idScope: string, registrationId: string, endorsementKey: Buffer, storageRootKey: Buffer, getSasToken: GetSasToken) {
    this._idScope = idScope;
    this._registrationId = registrationId;
    this._endorsementKey = endorsementKey;
    this._storageRootKey = storageRootKey;
    this._getSasToken = getSasToken;
    this._challengeKey = new Builder();
  }

  /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_002: [`start` shall call its callback with the init frame content.*/
  start(callback: (err?: Error, response?: any) => void): void {
    let init: Buffer = new Builder()
        .appendUInt8(0)
        .appendString(this._idScope)
        .appendUInt8(0)
        .appendString(this._registrationId)
        .appendUInt8(0)
        .appendBuffer(this._endorsementKey)
        .get();

    this.hostname = this._idScope + '/registrations/' + this._registrationId;

    callback(undefined, init);
  }

  step(challenge: any, callback: (err?: Error, response?: any) => void): void {
    // depends on the stage of the flow - needs a state machine
    if (challenge.length === 1) {
      let firstResponse: Buffer = new Builder()
        .appendUInt8(0)
        .appendBuffer(this._storageRootKey)
        .get();

      /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_003: [ If `step` is called with a 1 byte challenge, it shall resolve with the the initial response that was passed into the constructor. ] */
      // initial challenge, reply with the srk
      debug('initial response');
      callback(undefined, firstResponse);
    } else {
      debug('length = ' + challenge.length + ' control byte = ' + challenge[0]);
      if ((challenge[0] & 0xC0) === 192) {
        /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_004: [ If `step` is called with a first byte that has 1 in the most significant bit, it shall append the challenge to the full challenge buffer and call its callback with `\u0000` ] */
        this._challengeKey.appendBuffer(challenge.slice(1));
        let keyBuffer: Buffer = this._challengeKey.get();
        /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_005: [ If `step` is called with a first byte that has 11 in the most significant bits, it shall call the challenge callback with the full challenge buffer. ] */
        this._getSasToken(keyBuffer, (err, sasToken) => {
          if (err) {
            /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_007: [ If `ChallengeResponseCallback` is called with an error, `step` shall call its callback with an error. ] */
            callback(err);
          } else {
            let responseBuffer: Buffer = new Builder()
              .appendUInt8(0)
              .appendString(sasToken)
              .get();

            /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_006: [ If `ChallengeResponseCallback` is called without passing an error, the final `step` promise shall call its callback with the SAS Token. ] */
            callback(undefined, responseBuffer);
          }
        });
      } else if ((challenge[0] & 0x80) === 128) {
        /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_004: [ If `step` is called with a first byte that has 1 in the most significant bit, it shall append the challenge to the full challenge buffer and call its callback with `\u0000` ] */
        this._challengeKey.appendBuffer(challenge.slice(1));
        let responseBuffer: Builder = new Builder();
        responseBuffer.appendUInt8(0); // <null>
        callback(undefined, responseBuffer.get());
      } else {
        callback(new Error('unknown control byte value'));
      }
    }
  }
}
