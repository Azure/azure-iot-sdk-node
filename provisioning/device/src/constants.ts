// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

/**
 * @private
 */
export class ProvisioningDeviceConstants {
  /**
   * User-Agent string passed to the service as part of communication
   */
  static userAgent: string = packageJson.name + '/' + packageJson.version;

  /**
   * Default interval for polling, to use in case service doesn't provide it to us.
   */
  static defaultPollingInterval: number = 2000;

  /**
   * apiVersion to use while communicating with service.
   */
  // TODO : To be used for DPS Cert Management and should be changed after release.
  static apiVersion: string = '2021-11-01-preview';

  /**
   * default timeout to use when communicating with the service
   */
  static defaultTimeoutInterval: number = 30000;
}
