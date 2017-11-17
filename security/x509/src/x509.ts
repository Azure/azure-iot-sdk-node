// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { errors, X509 } from 'azure-iot-common';

export class X509Security {
  private _cert: X509;

  constructor(cert: X509) {
    this._cert = cert;
  }

  getCertificate(callback: (err?: Error, cert?: X509) => void): void {
    callback(null, this._cert);
  }

  getCertificateChain(callback: (err?: Error, cert?: string) => void): void {
    throw new errors.NotImplementedError();
  }
}

