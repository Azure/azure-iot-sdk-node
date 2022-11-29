// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const errors = require('azure-iot-common').errors;
const translateError = require('azure-iot-amqp-base').translateError;

describe('translateError', function () {
  /*Tests_SRS_NODE_DEVICE_AMQP_DEVICE_ERRORS_16_001: [`translateError` shall return an `IotHubQuotaExceededError` if the AMQP error condition is `amqp:resource-limit-exceeded`.]*/
  [
    { errorDescription: 'amqp:resource-limit-exceeded', errorMessage: 'Fake forbidden', expectedErrorType: errors.IotHubQuotaExceededError },
  ].forEach(function (testParams) {
    it('returns an \'' + testParams.expectedErrorType.name + '\' if the amqp error description is \'' + testParams.errorDescription + '\'', function (){
      const AMQPError = function AMQPError() {
        Error.call(this);
      };

      const fake_error = new AMQPError();
      fake_error.condition = testParams.errorDescription;

      /*Tests_SRS_NODE_DEVICE_AMQP_ERRORS_16_010: [ `translateError` shall accept 2 argument:
      *- A custom error message to give context to the user.
      *- the AMQP error object itself]
      */
      const err = translateError(new Error(testParams.errorMessage), fake_error);
      assert.instanceOf(err, testParams.expectedErrorType);

      /*Tests_SRS_NODE_DEVICE_AMQP_ERRORS_16_001: [Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 2 properties:
      *- `amqpError` shall contain the error object returned by the AMQP layer.
      *- `message` shall contain a human-readable error message]
      */
      assert.equal(err.message, 'Error: ' + testParams.errorMessage);
      assert.equal(err.amqpError, fake_error);
    });
  });
});
