// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { errors, X509 } from 'azure-iot-common';

/**
 * X509 security client using user-generated cert for Azure IoT
 */
export class X509Security {
  private _cert: X509;

  /**
   * Construct a new X509 security object
   *
   * @param cert certificate to use
   */
  constructor(cert: X509) {
    this._cert = cert;
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
   * return the X509 certificate chain
   *
   * @param callback called when the operation is copmlete
   */
  getCertificateChain(callback: (err?: Error, cert?: string) => void): void {
    throw new errors.NotImplementedError();
  }
}

