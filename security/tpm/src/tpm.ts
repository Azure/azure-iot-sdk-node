// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { errors } from 'azure-iot-common';

export class TMPSecurityObject {
  getEndoresementKey(callback: (err?: Error) => void): void {
    throw new errors.NotImplementedError();
  }

  getStorageKey(callback: (err?: Error) => void): void {
    throw new errors.NotImplementedError();
  }

  signData(callback: (err?: Error) => void): void {
    throw new errors.NotImplementedError();
  }

  activateSymetricIdentity(callback: (err?: Error) => void): void {
    throw new errors.NotImplementedError();
  }
}

