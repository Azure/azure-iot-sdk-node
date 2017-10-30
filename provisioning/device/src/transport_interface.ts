// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { X509 } from 'azure-iot-common';

/**
 * @private
 * Callback for responses from the previsioning service
 */
export type ResponseCallback = (err?: Error, result?: any) => void;

/**
 * @private
 * Describes the configuration properties passed into a provisioning transport object
 */
export interface Config {
  /**
   * ID Scope for your Device Provisioning Service instance.  Automatically assigned as part of service deployment.  Available from Azure Portal.
   */
  idScope: string;
  /**
   * User-Agent string passed to the service as part of communication
   */
  userAgent: string;
  /**
   * Default interval for polling, to use in case service doesn't provide it to us.
   */
  defaultPollingInterval: number;
  /**
   * Override for the host name of the provisioning service.  Defaults to 'global.azure-devices-provisioning.net'
   */
  serviceHostName?: string;
}

/**
 * @private
 * Describes the specific methods that a transport should implement to support the Azure Device Provisionig Service
 */
export interface Transport {
  /**
   * Register with the provisioning service.  This represents a single back-and-forth with the service.
   * Registration may involve several calls to this function, depending on the attestation mechanism.
   */
  register(registrationId: string, authorization: string | X509, body: any, forceRegistration: boolean, callback: ResponseCallback): void;
  /**
   * Disconnect from the provisioning service
   */
  disconnect(callback: (err?: Error) => void): void;
}




