// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');

var errors = require('../dist/errors.js');
var RetryOperation = require('../dist/retry_operation.js').RetryOperation;
var NoRetry = require('../dist/retry_policy.js').NoRetry;

describe('RetryOperation', function () {
  describe('retry', function () {
    it('uses the RetryPolicy passed to the constructor', function (testCallback) {
      // This policy should be able to try two or 3 times (initial, t = 0 (immediate); t = 1).
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
        assert.isBelow(actualOperation.callCount, 3);
        assert.isBelow(testPolicy.nextRetryTimeout.callCount, 3);
        assert.isBelow(testPolicy.shouldRetry.callCount, 3);
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
      // This policy should be able to try only 3 or 4 times (initial, t = 0 (immediate retry); t = 2; t = 4) depending on execution speed. never 5.
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
        assert.isBelow(actualOperation.callCount, 5);
        assert.isBelow(testPolicy.nextRetryTimeout.callCount, 5);
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

    it('does not retry if NoRetry policy is used', function (testCallback) {
      var testError = new Error('fake timeout that shall not be retried');
      var actualOperation = sinon.stub().callsArgWith(0, testError);

      var testOperation = new RetryOperation(new NoRetry(), 1);
      testOperation.retry(function (callback) {
        actualOperation(callback);
      }, function (finalErr) {
        assert.strictEqual(actualOperation.callCount, 1);
        testCallback();
      });
    });
  });
});