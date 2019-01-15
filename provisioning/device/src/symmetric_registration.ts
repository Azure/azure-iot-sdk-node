// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { RegistrationClient, RegistrationRequest, RegistrationResult, DeviceRegistrationResult } from './interfaces';
import { SymmetricKeyProvisioningTransport, SymmetricKeySecurityClient } from './interfaces';
import { PollingStateMachine } from './polling_state_machine';
import * as dbg from 'debug';
import { Callback, callbackToPromise, ErrorCallback, errorCallbackToPromise } from 'azure-iot-common';

const debug = dbg('azure-iot-provisioning-device:SymmetricKeyRegistration');

/**
 * Client used to run the registration of a device using Symmetric Key authentication.
 */
export class SymmetricKeyRegistration implements RegistrationClient {

  private _transport: SymmetricKeyProvisioningTransport;
  private _securityClient: SymmetricKeySecurityClient;
  private _provisioningHost: string;
  private _idScope: string;
  private _pollingStateMachine: PollingStateMachine;

  constructor(provisioningHost: string, idScope: string, transport: SymmetricKeyProvisioningTransport, securityClient: SymmetricKeySecurityClient) {
    this._provisioningHost = provisioningHost;
    this._idScope = idScope;
    this._transport = transport;
    this._securityClient = securityClient;
    this._pollingStateMachine = new PollingStateMachine(this._transport);
  }

  /**
   * Register the device with the provisioning service.
   *
   * @param registrationId The registration Id for the device
   * @param forceRegistration Set to true to force re-registration
   * @param [callback] optional function called when registration is complete.
   * @returns {Promise<RegistrationResult> | void} Promise if no callback function was passed, void otherwise.
   */
  register(callback?: Callback<RegistrationResult>): Promise<RegistrationResult> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_006: [ `register` shall call the `getRegistrationId` method on the security object to acquire the registration id. ] */
      this._securityClient.getRegistrationId((getRegistrationIdError, regId) => {
        /* Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_007: [ If the `getRegistrationId` fails, the `register` shall call the `_callback` with the error. ] */
        if (getRegistrationIdError) {
          _callback(getRegistrationIdError);
        } else {
          let request: RegistrationRequest = {
            registrationId: regId,
            provisioningHost: this._provisioningHost,
            idScope: this._idScope
          };
          /*Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_008: [ `register` shall invoke `createSharedAccessSignature` method on the security object to acquire a sas token object. ] */
          this._securityClient.createSharedAccessSignature(this._idScope, (createSasError, sas) => {
            /*Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_009: [ If the `createSharedAccessSignature` fails, the `register` shall call the `_callback` with the error. ] */
            if (createSasError) {
              _callback(createSasError);
            } else {
              /* Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_004: [ `register` shall pass the SAS into the `setSharedAccessSignature` method on the transport. ] */
              this._transport.setSharedAccessSignature(sas.toString());
              /* Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_005: [ `register` shall call `register` on the polling state machine object. ] */
              this._pollingStateMachine.register(request, (registerError?: Error, result?: DeviceRegistrationResult) => {
                this._pollingStateMachine.disconnect((disconnectErr: Error) => {
                  if (disconnectErr) {
                    debug('error disconnecting.  Ignoring.  ' + disconnectErr);
                  }
                  /*Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_010: [ if the polling register returns an error, the `register` shall invoke the `_callback` with that error. ] */
                  if (registerError) {
                    _callback(registerError);
                  } else {
                    /*Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_011: [ Otherwise `register` shall invoke the `_callback` with the resultant `registrationState` as the second argument. ] */
                    _callback(null, result.registrationState);
                  }
                });
              });
            }
          });
        }
      });
    }, callback);
  }

  /**
   * Cancels the current registration process.
   *
   * @param [callback] optional function called when the registration has already been canceled.
   * @returns {Promise<void> | void} Promise if no callback function was passed, void otherwise.
   */
  /* Codes_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_001: [** `cancel` shall call `cancel` on the transport object. **] */
  cancel(callback?: ErrorCallback): Promise<void> | void {
    return errorCallbackToPromise((_callback) => {
      this._transport.cancel(_callback);
    }, callback);
  }
}
