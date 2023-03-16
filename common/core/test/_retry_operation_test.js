// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');

const RetryOperation = require('../dist/retry_operation.js').RetryOperation;
const NoRetry = require('../dist/retry_policy.js').NoRetry;

const fakeOperationName = "__fake_op__";

describe('RetryOperation', function () {
  describe('retry', function () {
    it('uses the RetryPolicy passed to the constructor', function (testCallback) {
      // This policy should be able to try two or 3 times (initial, t = 0 (immediate); t = 1).
      const testPolicy = {
        nextRetryTimeout: sinon.stub().returns(1),
        shouldRetry: sinon.stub().returns(true)
      };
      const testError = new Error('fake timeout that shall be retried');
      const actualOperation = sinon.stub().callsArgWith(0, testError);

      const testOperation = new RetryOperation(fakeOperationName, testPolicy, 1);
      testOperation.retry(function (callback) {
        actualOperation(callback);
      }, function (finalErr) {
        assert.isBelow(actualOperation.callCount, 4);
        assert.isBelow(testPolicy.nextRetryTimeout.callCount, 4);
        assert.isBelow(testPolicy.shouldRetry.callCount, 4);
        assert.strictEqual(finalErr, testError);
        testCallback();
      });
    });

    it('does not retry if the error is unrecoverable', function (testCallback) {
      // This policy should be able to try only once (t = 0) but not retry
      const testPolicy = {
        nextRetryTimeout: sinon.stub().returns(1),
        shouldRetry: sinon.stub().returns(false)
      };
      const testError = new Error('unrecoverable');
      const actualOperation = sinon.stub().callsArgWith(0, testError);

      const testOperation = new RetryOperation(fakeOperationName, testPolicy, 1);
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
      const testPolicy = {
        nextRetryTimeout: sinon.stub().returns(2),
        shouldRetry: sinon.stub().returns(true)
      };
      const testError = new Error('fake timeout that shall be retried');
      const actualOperation = sinon.stub().callsArgWith(0, testError);

      const testOperation = new RetryOperation(fakeOperationName, testPolicy, 5);
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
      const testPolicy = {
        nextRetryTimeout: sinon.stub().returns(1),
        shouldRetry: sinon.stub().returns(true)
      };
      const testResult = { success: true };
      const actualOperation = sinon.stub().callsArgWith(0, null, testResult);

      const testOperation = new RetryOperation(fakeOperationName, testPolicy, 1);
      testOperation.retry(function (callback) {
        actualOperation(callback);
      }, function (finalErr, finalResult) {
        assert.isNotOk(finalErr);
        assert.strictEqual(finalResult, testResult);
        testCallback();
      });
    });

    it('does not retry if NoRetry policy is used', function (testCallback) {
      const testError = new Error('fake timeout that shall not be retried');
      const actualOperation = sinon.stub().callsArgWith(0, testError);

      const testOperation = new RetryOperation(fakeOperationName, new NoRetry(), 1);
      testOperation.retry(function (callback) {
        actualOperation(callback);
      }, function (_finalErr) {
        assert.strictEqual(actualOperation.callCount, 1);
        testCallback();
      });
    });
  });
});
