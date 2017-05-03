// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { errors } from 'azure-iot-common';
import { translateError as translateCommonError } from 'azure-iot-amqp-base';
import { Errors as Amqp10Errors } from 'amqp10';

export interface AmqpTransportError extends Error {
  amqpError?: Error;
}

/*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_010: [ `translateError` shall accept 2 argument:
*- A custom error message to give context to the user.
*- the AMQP error object itself]
*/
export function translateError(message: string, amqpError: Error): AmqpTransportError {
  let error: AmqpTransportError;
  /*Codes_SRS_NODE_DEVICE_AMQP_SERVICE_ERRORS_16_001: [ `translateError` shall return an `DeviceMaximumQueueDepthExceededError` if the AMQP error condition is `amqp:resource-limit-exceeded`.] */
  if ((amqpError as Amqp10Errors.ProtocolError).condition === 'amqp:resource-limit-exceeded') {
    error = new errors.DeviceMaximumQueueDepthExceededError(message);
  } else {
    error = translateCommonError(message, amqpError);
  }

  error.amqpError = amqpError;

  return error;
}
