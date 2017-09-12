// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');

var errors = require('../lib/errors.js');
var RetryOperation = require('../lib/retry_operation.js').RetryOperation;

describe('RetryOperation', function () {
  describe('retry', function () {
    it('uses the RetryPolicy passed to the constructor', function (testCallback) {
      // This policy should be able to try twice (t = 0; t = 1).
      var testPolicy = {
        nextRetryTimeout: sinon.stub().returns(1),
        shouldRetry: sinon.stub().returns(true)
      };
      var testError = new Error('fake timeout that shall be retried');
      var actualOperation = sinon.stub().callsArgWith(0, testError);

      var testOperation = new RetryOperation(testPolicy, 1);
      testOperation.retry(function (callback) {
        actualOperation(callback);
      }, function (finalErr) {
        assert(actualOperation.calledTwice);
        assert(testPolicy.nextRetryTimeout.calledTwice);
        assert(testPolicy.shouldRetry.calledTwice);
        assert.strictEqual(finalErr, testError);
        testCallback();
      });
    });

    it('does not retry if the error is unrecoverable', function (testCallback) {
      // This policy should be able to try only once (t = 0) but not retry
      var testPolicy = {
        nextRetryTimeout: sinon.stub().returns(1),
        shouldRetry: sinon.stub().returns(false)
      };
      var testError = new Error('unrecoverable');
      var actualOperation = sinon.stub().callsArgWith(0, testError);

      var testOperation = new RetryOperation(testPolicy, 1);
      testOperation.retry(function (callback) {
        actualOperation(callback);
      }, function () {
        assert(actualOperation.calledOnce);
        assert(testPolicy.nextRetryTimeout.notCalled);
        testCallback();
      });
    });

    it('does not retry past the maximum timeout', function (testCallback) {
      // This policy should be able to try only 3 times (t = 0; t = 2; t = 4)
      var testPolicy = {
        nextRetryTimeout: sinon.stub().returns(2),
        shouldRetry: sinon.stub().returns(true)
      };
      var testError = new Error('fake timeout that shall be retried');
      var actualOperation = sinon.stub().callsArgWith(0, testError);

      var testOperation = new RetryOperation(testPolicy, 5);
      testOperation.retry(function (callback) {
        actualOperation(callback);
      }, function (finalErr) {
        assert(actualOperation.calledThrice);
        assert(testPolicy.nextRetryTimeout.calledThrice);
        assert.strictEqual(finalErr, testError);
        testCallback();
      });
    });

    it('calls the callback with a null error object and the result of the operation if it is successful', function (testCallback) {
      // This policy should be able to try twice (t = 0; t = 1).
      var testPolicy = {
        nextRetryTimeout: sinon.stub().returns(1),
        shouldRetry: sinon.stub().returns(true)
      };
      var testResult = { success: true };
      var actualOperation = sinon.stub().callsArgWith(0, null, testResult);

      var testOperation = new RetryOperation(testPolicy, 1);
      testOperation.retry(function (callback) {
        actualOperation(callback);
      }, function (finalErr, finalResult) {
        assert.isNotOk(finalErr);
        assert.strictEqual(finalResult, testResult);
        testCallback();
      });
    });
  });
});