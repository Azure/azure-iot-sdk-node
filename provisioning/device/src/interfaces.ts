// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { SharedAccessSignature, X509 } from 'azure-iot-common';

/**
 * type defining the types of authentication we support
 */
export type ProvisioningAuthentication = string | X509 | SharedAccessSignature;

export interface ProvisioningTransportOptions {
  /**
   * Default interval for polling, to use in case service doesn't provide it to us.
   */
  pollingInterval?: number;

  /**
   * Default host for the provisioning service
   */
  provisioningHost?: string;

  /**
   * default timeout to use when communicating with the service
   */
  timeoutInterval?: number;
}

/**
 * Device configuration returned when registration is complete
 */
export interface ProvisioningDeviceConfiguration {
  iotHubUri: string;
  deviceId: string;
}

/**
 * Interface that all provisioning transports must implement in order to support the provisioning service
 */

export interface ProvisioningTransportHandlersBase {
  setTransportOptions(options: ProvisioningTransportOptions): void;
  endSession(callback: (err?: Error) => void): void;
}

export interface ProvisioningTransportHandlersX509 extends ProvisioningTransportHandlersBase {
  registerX509(registrationId: string, authorization: X509, forceRegistration: boolean, callback: (err?: Error, assignedHub?: string, deviceId?: string, body?: any, result?: any) => void): void;
}

export interface PollingTransportHandlers {
  setTransportOptions(options: ProvisioningTransportOptions): void;
  registrationRequest(registrationId: string, authorization: SharedAccessSignature | X509 | string, requestBody: any, forceRegistration: boolean, callback: (err?: Error, body?: any, result?: any, pollingInterval?: number) => void): void;
  queryOperationStatus(registrationId: string, operationId: string, callback: (err?: Error, body?: any, result?: any, pollingInterval?: number) => void): void;
  endSession(callback: (err?: Error) => void): void;
  getErrorResult(result: any): any;
}

export interface RegistrationClient {
  register(callback: (err?: Error) => void): void;
  cancel(callback: (err?: Error) => void): void;
}

export interface TpmRegistrationInfo {
  registrationId: string;
  endorsementKey: string;
  storageRootKey: string;
}

export interface TpmRegistrationResult {
  deviceId: string;
  iotHubUri: string;
  symmetricKey: string;
}

export interface TpmProvisioningTransport {
  getAuthenticationChallenge(registrationInfo: TpmRegistrationInfo, callback: (err: Error, tpmChallenge?: TpmChallenge) => void): void;
  register(registrationInfo: TpmRegistrationInfo, sasToken: string, callback: (err: Error, result?: TpmRegistrationResult) => void): void;
  cancel(callback: (err: Error) => void): void;
}

export interface TpmSecurityClient {
  getEndorsementKey(callback: (err: Error, endorsementKey?: string) => void): void;
  getStorageRootKey(callback: (err: Error, storageRootKey?: string) => void): void;
  signWithIdentity(toSign: string, callback: (err: Error, signedData?: string) => void): void;
  activateIdentityKey(key: string, callback: (err: Error) => void): void;
  cancel(callback: (err: Error) => void): void;
}

export interface TpmChallenge {
  message: string;
  authenticationKey: string;
  keyName: string;
}
