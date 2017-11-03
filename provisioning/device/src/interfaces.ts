// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { SharedAccessSignature, X509 } from 'azure-iot-common';

/**
 * @private
 * Callback for responses from the previsioning service
 */
export type ResponseCallback = (err?: Error, response?: any) => void;

/**
 * type defining the types of authentication we support
 */
export type Authentication = string | X509 | SharedAccessSignature;

export interface ClientConfiguration {
  /**
   * User-Agent string passed to the service as part of communication
   */
  userAgent: string;

  /**
   * Default interval for polling, to use in case service doesn't provide it to us.
   */
  pollingInterval: number;

  /**
   * Default host for the provisioning service
   */
  provisioningHost: string;

  /**
   * apiVersion to use while communicating with service.
   */
  apiVersion: string;

  /**
   * default timeout to use when communicating with the service
   */
  timeoutInterval: number;

  /**
   * idScope to use when communicating with the provisioning service
   */
  idScope: string;
}

/**
 * Device configuration returned when registration is complete
 */
export interface DeviceConfiguration {
  iotHubUri: string;
  deviceId: string;
}

/**
 * Interface that all provisioning transports must implement in order to support the provisioning service
 */
export interface TransportHandlers {
  setClientConfig(config: ClientConfiguration): void;
  registrationRequest(registrationId: string, authorization: SharedAccessSignature | X509 | string, requestBody: any, forceRegistration: boolean, callback: (err?: Error, body?: any, result?: any, pollingInterval?: number) => void): void;
  queryOperationStatus(registrationId: string, operationId: string, callback: (err?: Error, body?: any, result?: any, pollingInterval?: number) => void): void;
  endSession(callback: (err?: Error) => void): void;
  getErrorResult(result: any): any;
}




