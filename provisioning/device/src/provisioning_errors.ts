// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { errors } from 'azure-iot-common';

/**
 * @private
 */
export class ProvisioningError extends Error {
  transportObject?: any;
  result?: any;
}

/* Codes_SRS_NODE_DPS_ERRORS_18_001: [`translateError` shall accept 4 arguments:
 * - A custom error message to give context to the user.
 * - the status code that initiated the error
 * - the response body
 * - the transport object that is associated with this error]
 */
/**
 * @private
 */
export function translateError(message: string, status: number, result?: any, response?: any): ProvisioningError {
  let error: ProvisioningError;
  switch (status) {
    case 400:
      /*Codes_SRS_NODE_DPS_ERRORS_18_002: [`translateError` shall return an `ArgumentError` if the status code is `400`.]*/
      error = new errors.ArgumentError(message);
      break;
    case 401:
      /*Codes_SRS_NODE_DPS_ERRORS_18_003: [`translateError` shall return an `UnauthorizedError` if the status code is `401`.]*/
      error = new errors.UnauthorizedError(message);
      break;
    case 404:
      /*Codes_SRS_NODE_DPS_ERRORS_18_004: [`translateError` shall return an `DeviceNotFoundError` if the status code is `404`.]*/
      error = new errors.DeviceNotFoundError(message);
      break;
    case 429:
      /*Codes_SRS_NODE_DPS_ERRORS_18_005: [`translateError` shall return an `IotHubQuotaExceededError` if the status code is `429`.]*/
      error = new errors.IotHubQuotaExceededError(message);
      break;
    case 500:
      /*Codes_SRS_NODE_DPS_ERRORS_18_006: [`translateError` shall return an `InternalServerError` if the status code is `500`.]*/
      error = new errors.InternalServerError(message);
      break;
    default:
      /*Codes_SRS_NODE_DPS_ERRORS_18_007: [If the status code is unknown, `translateError` should return a generic Javascript `Error` object.]*/
      error = new Error(message);
      break;
  }

  /* Codes_SRS_NODE_DPS_ERRORS_18_008: [Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 3 properties:
  * - `result` shall contain the body of the response
  * - `transportObject` shall contain the transport object that is associated with this error
  * - `message` shall contain a human-readable error message]
  */
  error.transportObject = response;
  error.result = result;
  return error;
}
