// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { errors } from 'azure-iot-common';

export class X509SecurityObject {
  getCertificate(callback: (err?: Error, cert?: string) => void): void {
    throw new errors.NotImplementedError();
  }

  getCertificateChain(callback: (err?: Error, cert?: string) => void): void {
    throw new errors.NotImplementedError();
  }
}

