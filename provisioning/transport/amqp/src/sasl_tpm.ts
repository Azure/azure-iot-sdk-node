// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as Builder from 'buffer-builder';
import * as Promise from 'bluebird';
import * as dbg from 'debug';
const debug = dbg('azure-iot-provisioning-device-amqp:SaslTpm');

export type ChallengeResponseCallback = (err: Error, response?: Buffer) => void;
export type GetResponseFromChallenge = (challenge: Buffer, callback: ChallengeResponseCallback) => void;

export class SaslTpm {
  public name: string = 'TPM';

  private _init: Buffer;
  private _firstResponse: Buffer;
  private _getResponseFromChallenge: GetResponseFromChallenge;
  private _challengeKey: Builder;
  private _hostname: string;

  /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_001: [ The `SaslTpm` constructor shall accept the following parameters:
    `hostName` - The hostName value to be returned when getInitFrameContent is called
    `init` - The initial frame contents to be returned when getInitFrameContent is called
    `firstResponse` - The response to return on the first call to getChallengeResponse
    `getResponseFromChallenge` - The callback to call when the challange has been completed and the caller needs to formulate the response. ] */
  constructor(hostName: string, init: Buffer, firstResponse: Buffer, getResponseFromChallenge: GetResponseFromChallenge) {
    this._hostname = hostName;
    this._init = init;
    this._firstResponse = firstResponse;
    this._getResponseFromChallenge = getResponseFromChallenge;
    this._challengeKey = new Builder();
    this._hostname = hostName;
  }

  /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_002: [ `getInitFrameContent` shall return a promise that resolves to an object with the following members:
    `mechanism` - Must be 'TPM'
    `initialResponse` - The inital frame contents
    `hostname` - the hostName ] */
  getInitFrameContent(): Promise<any> {
    return new Promise((resolve: any) => {
      resolve({
        mechanism: this.name,
        initialResponse: this._init,
        hostname: this._hostname
      });
    });
  }

  // TODO: state machine here
  getChallengeResponseContent(challenge: any): Promise<Buffer> {
    // depends on the stage of the flow - needs a state machine
    return new Promise((resolve, reject) => {
      if (challenge[0].value.length === 1) {
        /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_003: [ If `getChallengeResponse` is called with a 1 byte challenge, it shall resolve with the the intial response that was passed into the constructor. ] */
        // initial challenge, reply with the srk
        debug('initial response');
        resolve(this._firstResponse);
      } else {
        debug('length = ' + challenge[0].value.length + ' control byte = ' + challenge[0].value[0]);
        if ((challenge[0].value[0] & 0xC0) === 192) {
          /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_004: [ If `getChallengeResponse` is called with a first byte that has 1 in the most significant bit, it shall append the challenge to the full challenge buffer ] */
          this._challengeKey.appendBuffer(challenge[0].value.slice(1));
          let keyBuffer: Buffer = this._challengeKey.get();
          /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_005: [ If `getChallengeResponse` is called with a first byte that has 11 in the most significant bits, it shall call the challenge callback with the full challenge buffer ] */
          this._getResponseFromChallenge(keyBuffer, (err, buffer) => {
            if (err) {
              /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_007: [ If `ChallengeResponseCallback` is called with an error, the final `getChallangeResponse` promise shall be rejected. ] */
              reject(err);
            } else {
              /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_006: [ If `ChallengeResponseCallback` is called without passing an error, the final `getChallangeResponse` promise shall be resolved. ] */
              resolve(buffer);
            }
          });
        } else if ((challenge[0].value[0] & 0x80) === 128) {
          /*Codes_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_004: [ If `getChallengeResponse` is called with a first byte that has 1 in the most significant bit, it shall append the challenge to the full challenge buffer ] */
          this._challengeKey.appendBuffer(challenge[0].value.slice(1));
          let responseBuffer: Builder = new Builder();
          responseBuffer.appendUInt8(0); // <null>
          resolve(responseBuffer.get());
        } else {
          reject(new Error('unknown control byte value'));
        }
      }
    });
  }
}
