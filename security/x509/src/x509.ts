// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { X509 } from 'azure-iot-common';

/**
 * @private
 * X509 security client using user-generated cert for Azure IoT
 */
export class X509Security {
  private _cert: X509;
  private _registrationId: string;

  /**
   * Construct a new X509 security object
   *
   * @param cert certificate to use
   */
  constructor(registrationId: string, cert: X509) {
    this._cert = cert;
    this._registrationId = registrationId;
  }

  /**
   * return the X509 certificate
   *
   * @param callback called when the operation is complete
   */
  getCertificate(callback: (err?: Error, cert?: X509) => void): void {
    callback(null, this._cert);
  }

  /**
   * return the registration Id for the device
   */
  getRegistrationId(): string {
    return this._registrationId;
  }

}

