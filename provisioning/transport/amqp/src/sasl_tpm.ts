// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as Builder from 'buffer-builder';
import * as Promise from 'bluebird';
import * as dbg from 'debug';
const debug = dbg('azure-iot-provisioning-device-amqp:SaslTpm');

export type GetSasTokenCallback = (err: Error, sasToken?: string) => void;
export type GetSasToken = (challenge: Buffer, callback: GetSasTokenCallback) => void;
export type SaslResponseFrame = {
  response: Buffer
};

export class SaslTpm {
  public name: string = 'TPM';

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

  /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_002: [ `getInitFrame` shall return a promise that resolves to an object with the following members:
    `mechanism` - Must be 'TPM'
    `initialResponse` - The inital frame contents
    `hostname` - the hostName ] */
  getInitFrame(): Promise<any> {
    let init: Buffer = new Builder()
        .appendUInt8(0)
        .appendString(this._idScope)
        .appendUInt8(0)
        .appendString(this._registrationId)
        .appendUInt8(0)
        .appendBuffer(this._endorsementKey)
        .get();

    return new Promise((resolve: any) => {
      resolve({
        mechanism: this.name,
        initialResponse: init,
        hostname: this._idScope + '/registrations/' + this._registrationId
      });
    });
  }

  getResponseFrame(challenge: any): Promise<SaslResponseFrame> {
    // depends on the stage of the flow - needs a state machine
    return new Promise((resolve, reject) => {
      if (challenge[0].value.length === 1) {
        let firstResponse: Buffer = new Builder()
          .appendUInt8(0)
          .appendBuffer(this._storageRootKey)
          .get();

        /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_003: [ If `getResponseFrame` is called with a 1 byte challenge, it shall resolve with the the initial response that was passed into the constructor. ] */
        // initial challenge, reply with the srk
        debug('initial response');
        resolve({response: firstResponse});
      } else {
        debug('length = ' + challenge[0].value.length + ' control byte = ' + challenge[0].value[0]);
        if ((challenge[0].value[0] & 0xC0) === 192) {
          /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_004: [ If `getResponseFrame` is called with a first byte that has 1 in the most significant bit, it shall append the challenge to the full challenge buffer ] */
          this._challengeKey.appendBuffer(challenge[0].value.slice(1));
          let keyBuffer: Buffer = this._challengeKey.get();
          /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_005: [ If `getResponseFrame` is called with a first byte that has 11 in the most significant bits, it shall call the challenge callback with the full challenge buffer ] */
          this._getSasToken(keyBuffer, (err, sasToken) => {
            if (err) {
              /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_007: [ If `ChallengeResponseCallback` is called with an error, the final `getResponseFrame` promise shall be rejected. ] */
              reject(err);
            } else {
              let responseBuffer: Buffer = new Builder()
                .appendUInt8(0)
                .appendString(sasToken)
                .get();

              /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_006: [ If `ChallengeResponseCallback` is called without passing an error, the final `getResponseFrame` promise shall be resolved. ] */
              resolve({response: responseBuffer});
            }
          });
        } else if ((challenge[0].value[0] & 0x80) === 128) {
          /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_004: [ If `getResponseFrame` is called with a first byte that has 1 in the most significant bit, it shall append the challenge to the full challenge buffer ] */
          this._challengeKey.appendBuffer(challenge[0].value.slice(1));
          let responseBuffer: Builder = new Builder();
          responseBuffer.appendUInt8(0); // <null>
          resolve({response: responseBuffer.get()});
        } else {
          reject(new Error('unknown control byte value'));
        }
      }
    });
  }
}
