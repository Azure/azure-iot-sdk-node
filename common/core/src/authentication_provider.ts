// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { TransportConfig } from './authorization';

export enum AuthenticationType {
  X509,
  Token
}

export interface AuthenticationProvider {
  type: AuthenticationType;
  getDeviceCredentials(callback: (err: Error, credentials: TransportConfig) => void): void;
}
