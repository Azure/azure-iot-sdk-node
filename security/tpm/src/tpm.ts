// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { errors } from 'azure-iot-common';

export class TpmSecurityClient  {
  getEndorsementKey(callback: (err?: Error) => void): void {
    throw new errors.NotImplementedError();
  }

  getStorageRootKey(callback: (err?: Error) => void): void {
    throw new errors.NotImplementedError();
  }

  signWithIdentity(callback: (err?: Error) => void): void {
    throw new errors.NotImplementedError();
  }

  activateSymmetricIdentity(callback: (err?: Error) => void): void {
    throw new errors.NotImplementedError();
  }
}

