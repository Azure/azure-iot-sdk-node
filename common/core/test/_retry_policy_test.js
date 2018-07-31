// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');

var errors = require('../lib/errors.js');
var RetryPolicy = require('../lib/retry_policy.js').RetryPolicy;
var ExponentialBackOffWithJitter = require('../lib/retry_policy.js').ExponentialBackOffWithJitter;
var NoRetry = require('../lib/retry_policy.js').NoRetry;

describe('RetryPolicy', function () {
  describe('ExponentialBackOffWithJitter', function () {
    describe('shouldRetry', function () {
      /*SRS_NODE_COMMON_RETRY_POLICY_16_006: [** The `shouldRetry` method of the new instance shall use the error filter passed to the constructor when the object was instantiated.]*/
      it('uses the ErrorFilter passed in the constructor', function () {
        var testFilter = {
          TimeoutError: false,
          UnauthorizedError: true
        };
        var testPolicy = new ExponentialBackOffWithJitter(testPolicy, testFilter);
        assert.isFalse(testPolicy.shouldRetry(new errors.TimeoutError('fake timeout that shall not be retried because of the filter')));
        assert.isTrue(testPolicy.shouldRetry(new errors.UnauthorizedError('fake UnauthorizedError that shall be retried because of the filter')));
      });
    });

    describe('nextRetryTimeout', function () {
      /*Tests_SRS_NODE_COMMON_RETRY_POLICY_16_008: [The `getNextTimeout` method shall return `0` instead of the result of the math formula if the following 3 conditions are met:
      - the `constructor` was called with the `immediateFirstTimeout` boolean set to `true`
      - the `isThrottled` boolean is `false`.
      - the `currentRetryCount` is `0` (meaning it's the first retry).]*/
      it('returns 0 for the first immediate retry if the first retry is set to be immediate', function () {
        sinon.stub(Math, 'random').returns(0.42);
        var policy = new ExponentialBackOffWithJitter(true);
        assert.strictEqual(policy.nextRetryTimeout(0, false), 0);
        Math.random.restore();
      });

      it('returns a non-zero value for the first retry if the first retry is not set to be immediate', function () {
        sinon.stub(Math, 'random').returns(0.42);
        var policy = new ExponentialBackOffWithJitter(false);
        assert.isAbove(policy.nextRetryTimeout(0, false), 0);
        Math.random.restore();
      });

      /*Tests_SRS_NODE_COMMON_RETRY_POLICY_16_007: [The `getNextTimeout` method shall implement the following math formula to determine the next timeout value: `F(x) = min(Cmin+ (2^(x-1)-1) * rand(C * (1 – Jd), C*(1-Ju)), Cmax`]*/
      it('returns the proper value based on the retry count', function() {
        sinon.stub(Math, 'random').returns(0.42);
        var policy = new ExponentialBackOffWithJitter();
        /*Tests_SRS_NODE_COMMON_RETRY_POLICY_16_009: [The default constants to use with the Math formula for the normal conditions retry are:
        ```
        c = 100
        cMin = 100
        cMax = 10000
        ju = 0.25
        jd = 0.5
        ```]*/
        [
          { retryCount: 0, expected: 0 },
          { retryCount: 1, expected: 100 },
          { retryCount: 2, expected: 110.5 },
          { retryCount: 3, expected: 131.5 },
          { retryCount: 10, expected: 5465.5 },
          { retryCount: 42, expected: 10000 }
        ].forEach(function (testConfig) {
          assert.strictEqual(policy.nextRetryTimeout(testConfig.retryCount, false), testConfig.expected);
        });

        /*Tests_SRS_NODE_COMMON_RETRY_POLICY_16_010: [The default constants to use with the Math formula for the throttled conditions retry are:
        ```
        c = 5000
        cMin = 10000
        cMax = 60000
        ju = 0.5
        jd = 0.25
        ```]*/
        [
          { retryCount: 0, expected: 9737.5 },
          { retryCount: 1, expected: 10000 },
          { retryCount: 2, expected: 10525 },
          { retryCount: 3, expected: 11575 },
          { retryCount: 10, expected: 60000 },
          { retryCount: 42, expected: 60000 }
        ].forEach(function (testConfig) {
          assert.strictEqual(policy.nextRetryTimeout(testConfig.retryCount, true), testConfig.expected);
        });
        Math.random.restore();
      });
    });
  });

  describe('NoRetry', function () {
    describe('shouldRetry', function () {
      /*Tests_SRS_NODE_COMMON_RETRY_POLICY_16_03: [The `shouldRetry` method shall always return `false`.]*/
      it('returns false', function() {
        var policy = new NoRetry();
        assert.strictEqual(false, policy.shouldRetry(new Error()));
      });
    });

    describe('nextRetryTimeout', function () {
      /*Tests_SRS_NODE_COMMON_RETRY_POLICY_16_004: [The `getNextTimeout` method shall always return `-1`.]*/
      it('always returns -1', function () {
        var policy = new NoRetry();
        [0, 1, 42, -1, 9999].forEach(function(retryCount) {
          assert.strictEqual(-1, policy.nextRetryTimeout(retryCount));
        });
      });
    });
  });
});