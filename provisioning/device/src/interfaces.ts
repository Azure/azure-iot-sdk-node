// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { SharedAccessSignature, X509 } from 'azure-iot-common';

/**
 * type defining the types of authentication we support
 */
export type ProvisioningAuthentication = X509 | SharedAccessSignature;

/**
 * Configuration options for provisioning transports.  Passed into the transport's setTransportOptions function.
 */
export interface ProvisioningTransportOptions {
  /**
   * Default interval for polling, to use in case service doesn't provide it to us.
   */
  pollingInterval?: number;

  /**
   * default timeout to use when communicating with the service
   */
  timeoutInterval?: number;
}

/**
 * Information necessary to start a registration
 */
export interface RegistrationRequest {
  /**
   * registration Id for this device.  May be undefined when using Tpm registration
   */
  registrationId?: string;

  /**
   * global device endpoint for the provisioning service
   */
  provisioningHost: string;

  /**
   * ID scope for the provisioning instance
   */
  idScope: string;

  /**
   * true to foce re-registration
   */
  forceRegistration?: boolean;
}

/**
 * Device configuration returned when registration is complete
 */
export interface RegistrationResult {
  /**
   * deviceId for the provisioned device
   */
  deviceId: string;
  /**
   * IoT Hub where the provisioned device is located
   */
  assignedHub: string;
}

/**
 * @private
 */
export interface X509ProvisioningTransport {
  setTransportOptions(options: ProvisioningTransportOptions): void;
  cancel(callback: (err?: Error) => void): void;
  registerX509(request: RegistrationRequest, auth: X509, callback: (err?: Error, registrationResult?: RegistrationResult, body?: any, result?: any) => void): void;
}

/**
 * Public API exposed by the X509 security client object.  This is only useful if you're writing your own security client.
 */
export interface X509SecurityClient {
  /**
   * retrieve the X509 certificate
   *
   * @param callback called when the operation is complete
   */
  getCertificate(callback: (err?: Error, cert?: X509) => void): void;

  /**
   * retrieve the X509 certificate chain
   *
   * @param callback called when the operation is copmlete
   */
  getCertificateChain(callback: (err?: Error, cert?: string) => void): void;
}

/**
 * @private
 */
export interface PollingTransportHandlers {
  setTransportOptions(options: ProvisioningTransportOptions): void;
  registrationRequest(request: RegistrationRequest, auth: SharedAccessSignature | X509 | string, requestBody: any, callback: (err?: Error, body?: any, result?: any, pollingInterval?: number) => void): void;
  queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, body?: any, result?: any, pollingInterval?: number) => void): void;
  endSession(callback: (err?: Error) => void): void;
}

/**
 * Public API used to access the ProvisioningDeviceClient object
 */
export interface RegistrationClient {
  /**
   * Register the device with the provisioning service
   */
  register(request: RegistrationRequest, callback: (err?: Error, result?: any) => void): void;
  /**
   * Cancel the registration process if it is in progress.
   */
  cancel(callback: (err?: Error) => void): void;
}

/**
 * Information passed between client and transport during Tpm registration
 */
export interface TpmRegistrationInfo {
  endorsementKey: string;
  storageRootKey: string;
  request: RegistrationRequest;
}

/**
 * Device configuration returned when registration using TPM is complete
 */
export interface TpmRegistrationResult extends RegistrationResult {
  symmetricKey: string;
}

/**
 * @private
 */
export interface TpmProvisioningTransport {
  getAuthenticationChallenge(registrationInfo: TpmRegistrationInfo, callback: (err: Error, tpmChallenge?: TpmChallenge) => void): void;
  register(registrationInfo: TpmRegistrationInfo, sasToken: string, callback: (err: Error, result?: TpmRegistrationResult) => void): void;
  cancel(callback: (err: Error) => void): void;
}

/**
 * Public API exposed by the TPM security client object.  This is only useful if you're writing your own security client.
 */
export interface TpmSecurityClient {
  getEndorsementKey(callback: (err: Error, endorsementKey?: string) => void): void;
  getStorageRootKey(callback: (err: Error, storageRootKey?: string) => void): void;
  signWithIdentity(toSign: string, callback: (err: Error, signedData?: string) => void): void;
  activateIdentityKey(key: string, callback: (err: Error) => void): void;
  cancel(callback: (err: Error) => void): void;
}

/**
 * @private
 */
export interface TpmChallenge {
  message: string;
  authenticationKey: string;
  keyName: string;
}
