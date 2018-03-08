// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * @private
 * Associates error types with a boolean value indicating whether it can be retried (true) or if it is fatal (false)
 */
export interface ErrorFilter {
  ArgumentError: boolean;
  ArgumentOutOfRangeError: boolean;
  DeviceMaximumQueueDepthExceededError: boolean; // ??
  DeviceNotFoundError: boolean;
  FormatError: boolean;
  UnauthorizedError: boolean;
  NotImplementedError: boolean;
  NotConnectedError: boolean;
  IotHubQuotaExceededError: boolean;
  MessageTooLargeError: boolean;
  InternalServerError: boolean;
  ServiceUnavailableError: boolean;
  IotHubNotFoundError: boolean;
  IoTHubSuspendedError: boolean; // ??
  JobNotFoundError: boolean;
  TooManyDevicesError: boolean;
  ThrottlingError: boolean;
  DeviceAlreadyExistsError: boolean;
  DeviceMessageLockLostError: boolean;
  InvalidEtagError: boolean;
  InvalidOperationError: boolean;
  PreconditionFailedError: boolean; // ??
  TimeoutError: boolean;
  BadDeviceResponseError: boolean;
  GatewayTimeoutError: boolean; // ??
  DeviceTimeoutError: boolean;// ??
  TwinRequestError?: boolean;
}

/* tslint:disable:variable-name */
/**
 * @private
 */
export class DefaultErrorFilter implements ErrorFilter {
  ArgumentError: boolean = false;
  ArgumentOutOfRangeError: boolean = false;
  DeviceMaximumQueueDepthExceededError: boolean = false; // ??
  DeviceNotFoundError: boolean = false;
  FormatError: boolean = false;
  UnauthorizedError: boolean = false;
  NotImplementedError: boolean = false;
  NotConnectedError: boolean = true;
  IotHubQuotaExceededError: boolean = false;
  MessageTooLargeError: boolean = false;
  InternalServerError: boolean = true;
  ServiceUnavailableError: boolean = true;
  IotHubNotFoundError: boolean = false;
  IoTHubSuspendedError: boolean = false; // ??
  JobNotFoundError: boolean = false;
  TooManyDevicesError: boolean = false;
  ThrottlingError: boolean = true;
  DeviceAlreadyExistsError: boolean = false;
  DeviceMessageLockLostError: boolean = false;
  InvalidEtagError: boolean = false;
  InvalidOperationError: boolean = false;
  PreconditionFailedError: boolean = false; // ??
  TimeoutError: boolean = true;
  BadDeviceResponseError: boolean = false;
  GatewayTimeoutError: boolean = false; // ??
  DeviceTimeoutError: boolean = false;// ??
  TwinRequestError?: boolean = false;
}
/* tslint:enable:variable-name */
