// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { IncomingMessage } from 'http';

/**
 * @private
 */
export type Callback<T> = (err?: Error, result?: T, response?: IncomingMessage) => void;

/**
 * Describes the parameters that are available for use with direct methods (also called device methods)
 */
export interface DeviceMethodParams {
  /**
   * The name of the method to call on the device.
   */
  methodName: string;
  /**
   * The method payload that will be sent to the device.
   */
  payload?: any;
  /**
   * The maximum time a device should take to respond to the method.
   */
  responseTimeoutInSeconds?: number;
  /**
   * The maximum time the service should try to connect to the device before declaring the device is unreachable.
   */
  connectTimeoutInSeconds?: number; // default is 0
}

/**
 * Describes the initial request sent by the service to the device to initiate a cloud-to-device TCP streaming connection.
 */
export interface StreamInitiation {
  /**
   * Name of the requested stream (unique in case multiple streams are used)
   */
  streamName: string;

  /**
   * Timeout (in seconds) to wait for a connected device to respond.
   */
  responseTimeoutInSeconds: number;

  /**
   * Timeout (in seconds) to wait for a disconnected device to connect.
   */
  connectTimeoutInSeconds: number;

  /**
   * ???
   */
  contentType: string;

  /**
   * ???
   */
  contentEncoding: string;

  /**
   * ???
   */
  payload: any;
}
