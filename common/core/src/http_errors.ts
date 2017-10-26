// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as errors from './errors';

/**
 * @private
 */
export class HttpStatusError extends Error {
  statusCode?: number;
  response?: any;
  responseBody?: any;
}

/* Codes_SRS_NODE_DEVICE_HTTP_ERRORS_16_010: [`translateError` shall accept 4 arguments:
 * - A custom error message to give context to the user.
 * - The status code
 * - the body of the response, containing the explanation of why the request failed
 * - the protocol-specific response object itself]
 */
/**
 * @private
 */
export function httpTranslateError(message: string, statusCode: number, body?: any, response?: any): HttpStatusError {
  let error: HttpStatusError;
  switch (statusCode) {
    case 400:
      /*Codes_SRS_NODE_DEVICE_HTTP_ERRORS_16_003: [`translateError` shall return an `ArgumentError` if the HTTP response status code is `400`.]*/
      error = new errors.ArgumentError(message);
      break;
    case 401:
      /*Codes_SRS_NODE_DEVICE_HTTP_ERRORS_16_004: [`translateError` shall return an `UnauthorizedError` if the HTTP response status code is `401`.]*/
      error = new errors.UnauthorizedError(message);
      break;
    case 403:
      /*Codes_SRS_NODE_DEVICE_HTTP_ERRORS_16_005: [`translateError` shall return an `IotHubQuotaExceededError` if the HTTP response status code is `403`.]*/
      error = new errors.IotHubQuotaExceededError(message);
      break;
    case 404:
      /*Codes_SRS_NODE_DEVICE_HTTP_ERRORS_16_006: [`translateError` shall return an `DeviceNotFoundError` if the HTTP response status code is `404`.]*/
      error = new errors.DeviceNotFoundError(message);
      break;
    case 413:
      /*Codes_SRS_NODE_DEVICE_HTTP_ERRORS_16_007: [`translateError` shall return an `MessageTooLargeError` if the HTTP response status code is `413`.]*/
      error = new errors.MessageTooLargeError(message);
      break;
    case 500:
      /*Codes_SRS_NODE_DEVICE_HTTP_ERRORS_16_008: [`translateError` shall return an `InternalServerError` if the HTTP response status code is `500`.]*/
      error = new errors.InternalServerError(message);
      break;
    case 503:
      /*Codes_SRS_NODE_DEVICE_HTTP_ERRORS_16_009: [`translateError` shall return an `ServiceUnavailableError` if the HTTP response status code is `503`.]*/
      error = new errors.ServiceUnavailableError(message);
      break;
    default:
      /*Codes_SRS_NODE_DEVICE_HTTP_ERRORS_16_002: [If the HTTP error code is unknown, `translateError` should return a generic Javascript `Error` object.]*/
      error = new Error(message);
  }

/* Codes_SRS_NODE_DEVICE_HTTP_ERRORS_16_001: [Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 4 properties:
 * - `statusCode` shall contain the http status code
 * - `response` shall contain the protocol-specific response object itself
 * - `responseBody` shall contain the body of the response, containing the explanation of why the request failed
 * - `message` shall contain a human-readable error message]
 */
  error.statusCode = statusCode;
  error.response = response;
  error.responseBody = body;
  return error;
}
