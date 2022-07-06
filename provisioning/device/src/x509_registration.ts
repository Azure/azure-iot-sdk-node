// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { Callback, callbackToPromise, ErrorCallback, errorCallbackToPromise } from 'azure-iot-common';
import * as dbg from 'debug';
import { DeviceRegistrationResult, ProvisioningPayload, RegistrationClient, RegistrationRequest, RegistrationResult, X509ProvisioningTransport, X509SecurityClient } from './interfaces';
import { PollingStateMachine } from './polling_state_machine';

const debugErrors = dbg('azure-iot-provisioning-device:X509Registration:Errors');

/**
 * Client used to run the registration of a device using X509 authentication.
 */
export class X509Registration implements RegistrationClient {

  private _transport: X509ProvisioningTransport;
  private _securityClient: X509SecurityClient;
  private _provisioningHost: string;
  private _idScope: string;
  private _pollingStateMachine: PollingStateMachine;
  private _provisioningPayload: ProvisioningPayload;
  private _clientCsr: string;

  constructor(provisioningHost: string, idScope: string, transport: X509ProvisioningTransport, securityClient: X509SecurityClient) {
    this._provisioningHost = provisioningHost;
    this._idScope = idScope;
    this._transport = transport;
    this._securityClient = securityClient;
    this._pollingStateMachine = new PollingStateMachine(this._transport);
  }

  /**
   * Sets the custom payload for registration that will be sent to the custom allocation policy implemented in an Azure Function.
   *
   * @param payload The payload sent to the provisioning service at registration.
   */
  setProvisioningPayload( payload: ProvisioningPayload): void {
    this._provisioningPayload = payload;
  }

  /**
   * Sets the certificate signing request to be sent to the Provisioning Service to request for a device client certificate.
   *
   * @param payload The certificate signing request.
   */
  setClientCertificateSigningRequest(csr: string): void {
    this._clientCsr = csr;
  }
  /**
   * Register the device with the provisioning service.
   *
   * @param registrationId The registration Id for the device
   * @param forceRegistration Set to true to force re-registration
   * @param [callback] optional function called when registration is complete.
   * @returns {Promise<RegistrationResult> | void} Promise if no callback function was passed, void otherwise.
   */
  register(callback: Callback<RegistrationResult>): void;
  register(): Promise<RegistrationResult>;
  register(callback?: Callback<RegistrationResult>): Promise<RegistrationResult> | void {
    return callbackToPromise((_callback) => {

      /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_001: [ `register` shall call `getCertificate` on the security object to acquire the X509 certificate. ] */
      this._securityClient.getCertificate((err, cert)  => {
        if (err) {
          /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_006: [ If `getCertificate`fails, `register` shall call `_callback` with the error ] */
          debugErrors('security client returned error on cert acquisition: ' + err);
          _callback(err);
        } else {
          let registrationId: string = this._securityClient.getRegistrationId();
          let request: RegistrationRequest = {
            registrationId: registrationId,
            provisioningHost: this._provisioningHost,
            idScope: this._idScope
          };
          /* Codes_SRS_NODE_DPS_X509_REGISTRATION_06_001: [ If `setProvisioningPayload` is invoked prior to invoking `register` than the `payload` property of the `RegistrationRequest` shall be set to the argument provided to the `setProvisioningPayload`.] */
          if (this._provisioningPayload) {
            request.payload = this._provisioningPayload;
          }
          if (this._clientCsr) {
            request.clientCertificateSigningRequest = this._clientCsr;
          }
          /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_004: [ `register` shall pass the certificate into the `setAuthentication` method on the transport ] */
          this._transport.setAuthentication(cert);
          /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_002: [ `register` shall call `registerX509` on the transport object and call it's callback with the result of the transport operation. ] */
          this._pollingStateMachine.register(request, (err?: Error, result?: DeviceRegistrationResult) => {
            this._pollingStateMachine.disconnect((disconnectErr?: Error) => {
              if (disconnectErr) {
                debugErrors('error disconnecting.  Ignoring.  ' + disconnectErr);
              }
              if (err) {
                /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_005: [ If `register` on the pollingStateMachine fails, `register` shall call `_callback` with the error ] */
                _callback(err);
              } else {
                _callback(null, result.registrationState);
              }
            });
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
  /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_003: [ `cancel` shall call `endSession` on the transport object. ] */
  cancel(callback: ErrorCallback): void;
  cancel(): Promise<void>;
  cancel(callback?: ErrorCallback): Promise<void> | void {
    return errorCallbackToPromise((_callback) => {
      this._transport.cancel(_callback);
    }, callback);
  }
}
