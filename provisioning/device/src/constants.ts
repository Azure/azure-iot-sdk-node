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
  static apiVersion: string = '2017-11-15';

  /**
   * default timeout to use when communicating with the service
   */
  static defaultTimeoutInterval: number = 30000;
}
