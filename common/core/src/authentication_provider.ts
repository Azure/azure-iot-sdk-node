// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { TransportConfig } from './authorization';
import { Callback } from './promise_utils';

/**
 * Designate the type of authentication used by an `AuthenticationProvider`.
 */
export enum AuthenticationType {
  /**
   * X509 Certificate based authentication.
   */
  X509,
  /**
   * Token-based authentication uses shared access signature security tokens, generated and signed with a secret key.
   */
  Token
}

/**
 * Interface that must be implemented by objects that are used to provide credentials to the transports used by the device client
 * to authenticate with an Azure IoT hub instance.
 */
export interface AuthenticationProvider {
  type: AuthenticationType;
  getDeviceCredentials(callback: Callback<TransportConfig>): void;
  getDeviceCredentials(): Promise<TransportConfig>;
  setTokenRenewalValues?(tokenValidTimeInSeconds: number, tokenRenewalMarginInSeconds: number): void;
  }
