// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var retry_error_filter_1 = require("./retry_error_filter");
/**
 * Parameters used with the {@link azure-iot-common.ExponentialBackOffWithJitter} policy to compute retry intervals.
 */
/*SRS_NODE_COMMON_RETRY_POLICY_16_009: [The default constants to use with the Math formula for the normal conditions retry are:
```
c = 100
cMin = 100
cMax = 10000
ju = 0.25
jd = 0.5
```]*/
var ExponentialBackoffWithJitterParameters = /** @class */ (function () {
    function ExponentialBackoffWithJitterParameters() {
        /**
         * Initial retry interval: 100 ms by default.
         */
        this.c = 100;
        /**
         * Minimal interval between each retry. 100 milliseconds by default
         */
        this.cMin = 100;
        /**
         * Maximum interval between each retry. 10 seconds by default
         */
        this.cMax = 10000;
        /**
         * Jitter up factor. 0.25 by default.
         */
        this.ju = 0.25;
        /**
         * Jitter down factor. 0.5 by default
         */
        this.jd = 0.5;
    }
    return ExponentialBackoffWithJitterParameters;
}());
exports.ExponentialBackoffWithJitterParameters = ExponentialBackoffWithJitterParameters;
/**
 * Implements an Exponential Backoff with Jitter retry strategy.
 * The function to calculate the next interval is the following (x is the xth retry):
 * F(x) = min(Cmin+ (2^(x-1)-1) * rand(C * (1 – Jd), C*(1-Ju)), Cmax)
 * @implements {RetryStrategy}
 */
/*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_005: [The `ExponentialBackoffWithJitter` class shall implement the `RetryPolicy` interface.]*/
var ExponentialBackOffWithJitter = /** @class */ (function () {
    /**
     * Initializes a new instance of the {@link azure-iot-common.ExponentialBackOffWithJitter} class.
     * @param maxTimeout            maximum allowed timeout in milliseconds.
     * @param immediateFirstRetry   boolean indicating whether the first retry should be immediate (default) or wait the first interval (c value).
     */
    function ExponentialBackOffWithJitter(immediateFirstRetry, errorFilter) {
        this._errorFilter = errorFilter ? errorFilter : new retry_error_filter_1.DefaultErrorFilter();
        this.immediateFirstRetry = immediateFirstRetry !== false; // should default to true if not specified.
        this.normalParameters = new ExponentialBackoffWithJitterParameters();
        this.throttledParameters = new ExponentialBackoffWithJitterParameters();
        /*SRS_NODE_COMMON_RETRY_POLICY_16_010: [The default constants to use with the Math formula for the throttled conditions retry are:
        ```
        c = 5000
        cMin = 10000
        cMax = 60000
        ju = 0.5
        jd = 0.25
        ```]*/
        this.throttledParameters.c = 5000;
        this.throttledParameters.cMin = 10000;
        this.throttledParameters.cMax = 60000;
    }
    /**
     * Computes the interval to wait before retrying at each new retry tentative.
     *
     * @param {number} retryCount    Current retry tentative.
     * @param {boolean} isThrottled  Boolean indicating whether the Azure IoT hub is throttling operations.
     * @returns {number}             The time to wait before attempting a retry in milliseconds.
     */
    ExponentialBackOffWithJitter.prototype.nextRetryTimeout = function (retryCount, isThrottled) {
        /*SRS_NODE_COMMON_RETRY_POLICY_16_008: [The `getNextTimeout` method shall return `0` instead of the result of the math formula if the following 3 conditions are met:
        - the `constructor` was called with the `immediateFirstTimeout` boolean set to `true`
        - the `isThrottled` boolean is `false`.
        - the `currentRetryCount` is `0` (meaning it's the first retry).]*/
        if (this.immediateFirstRetry && retryCount === 0 && !isThrottled) {
            return 0;
        }
        else {
            /*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_007: [The `getNextTimeout` method shall implement the following math formula to determine the next timeout value: `F(x) = min(Cmin+ (2^(x-1)-1) * rand(C * (1 – Jd), C*(1-Ju)), Cmax)`]*/
            var constants = isThrottled ? this.throttledParameters : this.normalParameters;
            var minRandomFactor = constants.c * (1 - constants.jd);
            var maxRandomFactor = constants.c * (1 - constants.ju);
            var randomJitter = Math.random() * (maxRandomFactor - minRandomFactor);
            return Math.min(constants.cMin + (Math.pow(2, retryCount - 1) - 1) * randomJitter, constants.cMax);
        }
    };
    /**
     * Based on the error passed as argument, determines if an error is transient and if the operation should be retried or not.
     *
     * @param {Error} error The error encountered by the operation.
     * @returns {boolean}   Whether the operation should be retried or not.
     */
    ExponentialBackOffWithJitter.prototype.shouldRetry = function (error) {
        /*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_006: [The `shouldRetry` method of the new instance shall use the error filter passed to the constructor when the object was instantiated.]*/
        return this._errorFilter[error.name];
    };
    return ExponentialBackOffWithJitter;
}());
exports.ExponentialBackOffWithJitter = ExponentialBackOffWithJitter;
/**
 * Stub policy that blocks any retry tentative. Operations are not retried.
 *
 * @implements {RetryPolicy}
 */
var NoRetry = /** @class */ (function () {
    function NoRetry() {
    }
    /**
     * This will always return -1 as no retry is desired.
     *
     * @param {number} retryCount This parameter is ignored.
     */
    /*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_004: [The `getNextTimeout` method shall always return `-1`.]*/
    // @ts-ignore: parameter is not used
    NoRetry.prototype.nextRetryTimeout = function (retryCount) {
        return -1;
    };
    /**
     * This will always return false as no retry is desired.
     *
     * @param {Error} err This parameter is ignored.
     * @returns {boolean} Will always be false: retry should not be attempted no matter what the error is.
     */
    /*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_03: [The `shouldRetry` method shall always return `false`.]*/
    // @ts-ignore: parameter is not used
    NoRetry.prototype.shouldRetry = function (err) {
        return false;
    };
    return NoRetry;
}());
exports.NoRetry = NoRetry;
//# sourceMappingURL=retry_policy.js.map