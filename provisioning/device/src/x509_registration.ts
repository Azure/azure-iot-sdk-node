// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { RegistrationClient, RegistrationRequest, X509ProvisioningTransport, X509SecurityClient } from './interfaces';
import * as dbg from 'debug';
const debug = dbg('azure-device-provisioning:x509');

/**
 * @private
 */
export class X509Registration implements RegistrationClient {

  private _transport: X509ProvisioningTransport;
  private _securityClient: X509SecurityClient;
  private _provisioningHost: string;
  private _idScope: string;

  constructor(provisioningHost: string, idScope: string, transport: X509ProvisioningTransport, securityClient: X509SecurityClient) {
    this._provisioningHost = provisioningHost;
    this._idScope = idScope;
    this._transport = transport;
    this._securityClient = securityClient;
  }

  /**
   * Register the device with the provisioning service
   * @param registrationId The registration Id for the device
   * @param forceRegistration Set to true to force re-registration
   * @param callback function called when registration is complete.
   */
  register(callback: (err?: Error, result?: any) => void): void {

      /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_001: [ `register` shall call `getCertificate` on the security object to acquire the X509 certificate. ] */
      this._securityClient.getCertificate((err, cert)  => {
      if (err) {
        debug('security client returned error on cert acquisition');
        callback(err);
      } else {
        let registrationId: string = this._securityClient.getRegistrationId();
        let request: RegistrationRequest = {
          registrationId: registrationId,
          provisioningHost: this._provisioningHost,
          idScope: this._idScope
        };
        /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_002: [ `register` shall call `registerX509` on the transport object and call it's callback with the result of the transport operation. ] */
        this._transport.registerX509(request, cert, (err, result, body) => {
          if (err) {
            debug('_stateMachine.register returned error');
            debug(err.toString);
            debug(body);
            callback(err, result);
          } else {
            callback(null, result);
          }
        });
      }
    });
  }

  /* Codes_SRS_NODE_DPS_X509_REGISTRATION_18_003: [ `cancel` shall call `endSession` on the transport object. ] */
  cancel(callback: (err?: Error) => void): void {
    this._transport.cancel(callback);
  }

}


