// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { X509, Callback, SharedAccessSignature } from 'azure-iot-common';

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
   * true to force re-registration
   */
  forceRegistration?: boolean;
}

/**
 * Possible registration status codes returned from the provisioning service
 */
export type RegistrationStatus = 'unassigned' | 'assigning' | 'assigned' | 'failed' | 'disabled';

/**
 * structure returned from the provisioning service
 */
export interface DeviceRegistrationState {
  /**
   * deviceId for the provisioned device
   */
  deviceId: string;
  /**
   * IoT Hub where the provisioned device is located
   */
  assignedHub: string;
  /**
   * registration status
   */
  status: RegistrationStatus;
  /**
   * other values returned by the provisioning service
   */
  [key: string]: any;
}

/**
 * structure returned from the provisioning service is response to a registrationRequest or queryRegistrationStatus operation
 */
export interface DeviceRegistrationResult {
  /**
   * ID of the current operation
   */
  operationId: string;

  /**
   * registration status
   */
  status: RegistrationStatus;

  /**
   * details on the completed registration operation
   */
  registrationState?: DeviceRegistrationState;
}


/**
 * Device configuration returned when registration is complete
 */
export interface RegistrationResult extends DeviceRegistrationState {

}

/**
 * @private
 */
export interface PollingTransport {
  registrationRequest(request: RegistrationRequest, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void;
  queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void;
  cancel(callback: (err?: Error) => void): void;
  disconnect(callback: (err?: Error) => void): void;
}

/**
 * @private
 */
export interface X509ProvisioningTransport extends PollingTransport {
  setAuthentication(auth: X509): void;
  setTransportOptions(options: ProvisioningTransportOptions): void;
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
   * return the registration Id for the device
   */
  getRegistrationId(): string;

}

/**
 * Public API used to access the ProvisioningDeviceClient object
 */
export interface RegistrationClient {
  /**
   * Register the device with the provisioning service
   */
  register(callback: (err?: Error, result?: RegistrationResult) => void): void;
  /**
   * Cancel the registration process if it is in progress.
   */
  cancel(callback: (err?: Error) => void): void;
}

/**
 * @private
 * Information passed between client and transport during Tpm registration
 */
export interface TpmRegistrationInfo {
  endorsementKey: Buffer;
  storageRootKey: Buffer;
  request: RegistrationRequest;
}

/**
 * @private
 * Device configuration returned when registration using TPM is complete
 */
export interface TpmRegistrationResult extends RegistrationResult {
  symmetricKey: string;
}

/**
 * @private
 */
export interface TpmProvisioningTransport extends PollingTransport {
  setTpmInformation(endorsementKey: Buffer, storageRootKey: Buffer): void;
  getAuthenticationChallenge(request: RegistrationRequest, callback: (err: Error, tpmChallenge?: Buffer) => void): void;
  respondToAuthenticationChallenge(request: RegistrationRequest, sasToken: string, callback: (err?: Error) => void): void;
}

/**
 * @private
 * Public API exposed by the TPM security client object.  This is only useful if you're writing your own security client.
 */
export interface TpmSecurityClient {
  getEndorsementKey(callback: (err: Error, endorsementKey?: Buffer) => void): void;
  getStorageRootKey(callback: (err: Error, storageRootKey?: Buffer) => void): void;
  signWithIdentity(toSign: Buffer, callback: (err: Error, signedData?: Buffer) => void): void;
  activateIdentityKey(key: Buffer, callback: (err: Error) => void): void;
  getRegistrationId(callback: (err: Error, registrationId?: string) => void): void;
}

/**
 * @private
 */
export interface SymmetricKeyProvisioningTransport extends PollingTransport {
  setSharedAccessSignature(sas: string): void;
}

/**
 * @private
 * Public API exposed by the Symmetric Key security client object.  This is only useful if you're writing your own security client.
 */
export interface SymmetricKeySecurityClient {
  getRegistrationId(callback?: Callback<string>): Promise<string> | void;
  createSharedAccessSignature(idScope: string, callback?: Callback<SharedAccessSignature>): Promise<SharedAccessSignature> | void;
}
