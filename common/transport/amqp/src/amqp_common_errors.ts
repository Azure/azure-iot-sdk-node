// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.


'use strict';

import { errors } from 'azure-iot-common';
import { AmqpError } from 'rhea';

/**
 * @private
 */
export interface AmqpTransportError extends Error {
  amqpError?: Error;
}

/*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_010: [ `translateError` shall accept 2 argument:
*- A custom error message to give context to the user.
*- the AMQP error object itself]
*/

/**
 * @private
 */
export function translateError(message: string, amqpError: Error): AmqpTransportError {
  let error: AmqpTransportError;

  /*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_012: [`translateError` shall return a custom error type according to this table if the AMQP error condition is one of the following:
  | AMQP Error Condition                       | Custom Error Type                    |
  | ------------------------------------------ | ------------------------------------ |
  | "amqp:internal-error"                      | InternalServerError                  |
  | "amqp:link:message-size-exceeded"          | MessageTooLargeError                 |
  | "amqp:not-found"                           | DeviceNotFoundError                  |
  | "amqp:not-implemented"                     | NotImplementedError                  |
  | "amqp:not-allowed"                         | InvalidOperationError                |
  | "amqp:resource-limit-exceeded"             | IotHubQuotaExceededError             |
  | "amqp:unauthorized-access"                 | UnauthorizedError                    |
  | "com.microsoft:argument-error"             | ArgumentError                        |
  | "com.microsoft:argument-out-of-range"      | ArgumentOutOfRangeError              |
  | "com.microsoft:device-already-exists"      | DeviceAlreadyExistsError             |
  | "com.microsoft:device-container-throttled" | ThrottlingError                      |
  | "com.microsoft:iot-hub-suspended"          | IoTHubSuspendedError                 |
  | "com.microsoft:iot-hub-not-found-error"    | IotHubNotFoundError                  |
  | "com.microsoft:message-lock-lost"          | DeviceMessageLockLostError           |
  | "com.microsoft:precondition-failed"        | PreconditionFailedError              |
  | "com.microsoft:quota-exceeded"             | IotHubQuotaExceededError             |
  | "com.microsoft:timeout"                    | ServiceUnavailableError              |
  ]*/

  if ((amqpError as AmqpError).condition) {
    switch ((amqpError as AmqpError).condition) {
      case 'amqp:internal-error':
        error = new errors.InternalServerError(message);
        break;
      case 'amqp:link:message-size-exceeded':
        error = new errors.MessageTooLargeError(message);
        break;
      case 'amqp:not-found':
        error = new errors.DeviceNotFoundError(message);
        break;
      case 'amqp:not-implemented':
        error = new errors.NotImplementedError(message);
        break;
      case 'amqp:not-allowed':
        error = new errors.InvalidOperationError(message);
        break;
      case 'amqp:resource-limit-exceeded':
        error = new errors.IotHubQuotaExceededError(message);
        break;
      case 'amqp:unauthorized-access':
        error = new errors.UnauthorizedError(message);
        break;
      case 'com.microsoft:argument-error':
        error = new errors.ArgumentError(message);
        break;
      case 'com.microsoft:argument-out-of-range':
        error = new errors.ArgumentOutOfRangeError(message);
        break;
      case 'com.microsoft:device-already-exists':
        error = new errors.DeviceAlreadyExistsError(message);
        break;
      case 'com.microsoft:device-container-throttled':
        error = new errors.ThrottlingError(message);
        break;
      case 'com.microsoft:iot-hub-suspended':
        error = new errors.IoTHubSuspendedError(message);
        break;
      case 'com.microsoft:iot-hub-not-found-error':
        error = new errors.IotHubNotFoundError(message);
        break;
      case 'com.microsoft:message-lock-lost':
        error = new errors.DeviceMessageLockLostError(message);
        break;
      case 'com.microsoft:precondition-failed':
        error = new errors.PreconditionFailedError(message);
        break;
      case 'com.microsoft:quota-exceeded':
        error = new errors.IotHubQuotaExceededError(message);
        break;
      case 'com.microsoft:timeout':
        error = new errors.ServiceUnavailableError(message);
        break;
      default:
        /*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_002: [If the AMQP error code is unknown, `translateError` should return a generic Javascript `Error` object.]*/
        error = new Error(message);
    }
  } else if ((<any>amqpError).code) {
    error = new errors.NotConnectedError(message);
  } else {
    /*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_002: [If the AMQP error code is unknown, `translateError` should return a generic Javascript `Error` object.]*/
    error = new Error(message);
  }

  /*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_001: [Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 2 properties:
  *- `amqpError` shall contain the error object returned by the AMQP layer.
  *- `message` shall contain a human-readable error message]
  */
  error.amqpError = amqpError;

  return error;
}
