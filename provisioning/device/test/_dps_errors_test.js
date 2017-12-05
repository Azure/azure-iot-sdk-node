// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var errors = require('azure-iot-common').errors;
var translateError = require('../lib/dps_errors.js').translateError;

describe('translateError', function() {

  /*Tests_SRS_NODE_DPS_ERRORS_18_002: [`translateError` shall return an `ArgumentError` if the status code is `400`.]*/
  /*Tests_SRS_NODE_DPS_ERRORS_18_003: [`translateError` shall return an `UnauthorizedError` if the status code is `401`.]*/
  /*Tests_SRS_NODE_DPS_ERRORS_18_004: [`translateError` shall return an `DeviceNotFoundError` if the status code is `404`.]*/
  /*Tests_SRS_NODE_DPS_ERRORS_18_005: [`translateError` shall return an `IotHubQuotaExceededError` if the status code is `429`.]*/
  /*Tests_SRS_NODE_DPS_ERRORS_18_006: [`translateError` shall return an `InternalServerError` if the status code is `500`.]*/
  /*Tests_SRS_NODE_DPS_ERRORS_18_007: [If the status code is unknown, `translateError` should return a generic Javascript `Error` object.]*/
  [
    { statusCode: 400, statusMessage: 'Bad request', errorMessage: 'Fake bad request', expectedErrorType: errors.ArgumentError },
    { statusCode: 401, statusMessage: 'Unauthorized', errorMessage: 'Fake unauthorized', expectedErrorType: errors.UnauthorizedError },
    { statusCode: 404, statusMessage: 'Not found', errorMessage: 'Fake not found', expectedErrorType: errors.DeviceNotFoundError },
    { statusCode: 429, statusMessage: 'Quota exceeeded', errorMessage: 'Fake quota exceeded', expectedErrorType: errors.IotHubQuotaExceededError },
    { statusCode: 500, statusMessage: 'Internal Server Error', errorMessage: 'Fake internal server error', expectedErrorType: errors.InternalServerError },
    { statusCode: 999, statusMessage: 'Unknown status code', errorMessage: 'fake unknown status error', expectedErrorType: Error },
  ].forEach(function(testParams) {
    it('returns an \'' + testParams.expectedErrorType.name + '\' if the response status code is \'' + testParams.statusCode + '\'', function(){
      var fake_response = {
      statusCode: testParams.statusCode,
      statusMessage: testParams.statusMessage,
    };
    var fake_response_body = testParams.statusCode + ': ' + testParams.statusMessage;

    /* Tests_SRS_NODE_DPS_ERRORS_18_001: [`translateError` shall accept 4 arguments:
    * - A custom error message to give context to the user.
    * - the status code that initiated the error
    * - the response body
    * - the response object itself]
    */
    var err = translateError(new Error(testParams.errorMessage), fake_response.statusCode, fake_response_body, fake_response);
    assert.instanceOf(err, testParams.expectedErrorType);

    /* Tests_SRS_NODE_DPS_ERRORS_18_008: [Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 3 properties:
    * - `response` shall contain the `IncomingMessage` object returned by the HTTP layer.
    * - `reponseBody` shall contain the content of the HTTP response.
    * - `message` shall contain a human-readable error message]
    */
    assert.equal(err.message, 'Error: ' + testParams.errorMessage);
    assert.equal(err.responseBody, fake_response_body);
    assert.equal(err.response, fake_response);
    });
  });
});