// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const errors = require('azure-iot-common').errors;
const translateError = require('../dist/amqp_common_errors.js').translateError;


/*Tests_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_012: [`translateError` shall return a custom error type according to this table if the AMQP error condition is one of the following:
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
| "com.microsoft:message-lock-lost"          | DeviceMessageLockLostError           |
| "com.microsoft:precondition-failed"        | PreconditionFailedError              |
| "com.microsoft:quota-exceeded"             | IotHubQuotaExceededError             |
| "com.microsoft:timeout"                    | ServiceUnavailableError              |
| "amqp:link:detach-forced"                  | ServiceUnavailableError              |
]*/
describe('translateError', function () {
  [
    { errorDescription: 'amqp:internal-error', errorMessage: 'Fake internal error', expectedErrorType: errors.InternalServerError },
    { errorDescription: 'amqp:link:message-size-exceeded', errorMessage: 'Message too large', expectedErrorType: errors.MessageTooLargeError },
    { errorDescription: 'amqp:not-found', errorMessage: 'Device not found', expectedErrorType: errors.DeviceNotFoundError },
    { errorDescription: 'amqp:not-implemented', errorMessage: 'Not implemented', expectedErrorType: errors.NotImplementedError },
    { errorDescription: 'amqp:not-allowed', errorMessage: 'Not allowed', expectedErrorType: errors.InvalidOperationError },
    { errorDescription: 'amqp:resource-limit-exceeded', errorMessage: 'Quota exceeded', expectedErrorType: errors.IotHubQuotaExceededError },
    { errorDescription: 'amqp:unauthorized-access', errorMessage: 'Unauthorized', expectedErrorType: errors.UnauthorizedError },
    { errorDescription: 'com.microsoft:argument-error', errorMessage: 'Argument error', expectedErrorType: errors.ArgumentError },
    { errorDescription: 'com.microsoft:argument-out-of-range', errorMessage: 'Argument out of range', expectedErrorType: errors.ArgumentOutOfRangeError },
    { errorDescription: 'com.microsoft:device-already-exists', errorMessage: 'Device already exists', expectedErrorType: errors.DeviceAlreadyExistsError },
    { errorDescription: 'com.microsoft:device-container-throttled', errorMessage: 'Throttled', expectedErrorType: errors.ThrottlingError },
    { errorDescription: 'com.microsoft:iot-hub-suspended', errorMessage: 'IoT hub suspended', expectedErrorType: errors.IoTHubSuspendedError },
    { errorDescription: 'com.microsoft:iot-hub-not-found-error', errorMessage: 'IoT hub not found', expectedErrorType: errors.IotHubNotFoundError },
    { errorDescription: 'com.microsoft:message-lock-lost', errorMessage: 'Message lock lost', expectedErrorType: errors.DeviceMessageLockLostError },
    { errorDescription: 'com.microsoft:precondition-failed', errorMessage: 'Precondition failed', expectedErrorType: errors.PreconditionFailedError },
    { errorDescription: 'com.microsoft:quota-exceeded', errorMessage: 'Quota exceeded', expectedErrorType: errors.IotHubQuotaExceededError },
    { errorDescription: 'com.microsoft:timeout', errorMessage: 'Timeout', expectedErrorType: errors.ServiceUnavailableError },
    { errorDescription: 'amqp:link:detach-forced', errorMessage: 'Error: ', expectedErrorType: errors.ServiceUnavailableError },
    { errorDescription: 'unknown', errorMessage: 'Unknown error', expectedErrorType: Error }
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

    [
      { error: { code: 'ENOENT' } },
      { error: { code: 'ENOTFOUND' } },
      { error: { code: '?' } },
    ].forEach(function (testConfig) {
      it('returns a NotConnectedError if a connection error with code ' + testConfig.error.code + ' is encountered', function () {
        const err = translateError('', testConfig.error);
        assert.instanceOf(err, errors.NotConnectedError);
      });
    });

    it('returns a generic error object if the error type is unknown', function (){
      const error = new Error('unknown reason');
      const message = 'unknown error type';
      const err = translateError(message, error);

      /*Tests_SRS_NODE_DEVICE_AMQP_ERRORS_16_001: [Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 2 properties:
      *- `amqpError` shall contain the error object returned by the AMQP layer.
      *- `message` shall contain a human-readable error message]
      */
      assert.equal(err.message, message);
      assert.equal(err.amqpError, error);
    });

    it('returns a generic error object appended with a message if the error type is unknown and an embedded message is present', function () {
      const message = 'generic error message';
      const specific_message = 'specific error message';
      let testErr = { error: { message: { message: specific_message } } };
      const err = translateError(message, testErr.error);
      assert.equal(err.message, message + '. ' + specific_message);
    });
  });
});
