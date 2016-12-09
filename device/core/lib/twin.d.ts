// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { EventEmitter } from 'events';
import Client = require('./client');

declare class Twin extends EventEmitter {
  properties: {
    reported: {
      update(patch: any, callback: (error?: Error) => void): void;
    }
  };

  constructor(client: Client);

  static fromDeviceClient(client: Client, done: (error?: Error, twin?: Twin) => void): void;
}

export = Twin;
