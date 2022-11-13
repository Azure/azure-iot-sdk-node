// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { ErrorFilter, DefaultErrorFilter } from './retry_error_filter';

/**
 * Interface describing a retry policy object.
 * Retry policies are composed of 2 things
 * - An algorithm that computes the next time to retry based on the current number or retries.
 * - An error filter that decides, based on the type of error received, whether a retry should happen or not.
 *
 * Those 2 components hide behind 2 method calls described in this interface.
 */
export interface RetryPolicy {
  /**
   * Computes the interval to wait before retrying at each new retry tentative.
   *
   * @param {number} retryCount    Current retry tentative.
   * @param {boolean} isThrottled  Boolean indicating whether the Azure IoT hub is throttling operations.
   * @returns {number}             The time to wait before attempting a retry in milliseconds.
   */
  /*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_002: [Any implementation of the `RetryPolicy` interface shall have a `getNextTimeout` method used to return the timeout value corresponding to the current retry count.]*/
  nextRetryTimeout: (retryCount: number, isThrottled: boolean) => number;

  /**
   * Based on the error passed as argument, determines if an error is transient and if the operation should be retried or not.
   *
   * @param {Error} error The error encountered by the operation.
   * @returns {boolean}   Whether the operation should be retried or not.
   */
  /*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_001: [Any implementation of the `RetryPolicy` interface shall have a `shouldRetry` method used to evaluate if an error is "retryable" or not.]*/
  shouldRetry: (error: Error) => boolean;
}

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
export class ExponentialBackoffWithJitterParameters {
  /**
   * Initial retry interval: 100 ms by default.
   */
  c: number = 100;
  /**
   * Minimal interval between each retry. 100 milliseconds by default
   */
  cMin: number = 100;
  /**
   * Maximum interval between each retry. 10 seconds by default
   */
  cMax: number = 10000;
  /**
   * Jitter up factor. 0.25 by default.
   */
  ju: number = 0.25;
  /**
   * Jitter down factor. 0.5 by default
   */
  jd: number = 0.5;
}

/**
 * Implements an Exponential Backoff with Jitter retry strategy.
 * The function to calculate the next interval is the following (x is the xth retry):
 * F(x) = min(Cmin+ (2^(x-1)-1) * rand(C * (1 – Jd), C*(1-Ju)), Cmax)
 *
 * @implements {RetryStrategy}
 */
/*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_005: [The `ExponentialBackoffWithJitter` class shall implement the `RetryPolicy` interface.]*/
export class ExponentialBackOffWithJitter implements RetryPolicy {
  /**
   * Retry parameters used to calculate the delay between each retry in normal situations (ie. not throttled).
   */
  normalParameters: ExponentialBackoffWithJitterParameters;
  /**
   * Retry parameters used to calculate the delay between each retry in throttled situations.
   */
  throttledParameters: ExponentialBackoffWithJitterParameters;
  /**
   * Boolean indicating whether the first retry should be immediate (if set to true) or after the normalParameters.c delay (if set to false).
   */
  immediateFirstRetry: boolean;

  private _errorFilter: ErrorFilter;

  /**
   * Initializes a new instance of the {@link azure-iot-common.ExponentialBackOffWithJitter} class.
   *
   * @param maxTimeout            maximum allowed timeout in milliseconds.
   * @param immediateFirstRetry   boolean indicating whether the first retry should be immediate (default) or wait the first interval (c value).
   */
  constructor(immediateFirstRetry?: boolean, errorFilter?: ErrorFilter, ) {
    this._errorFilter = errorFilter ? errorFilter : new DefaultErrorFilter();
    this.immediateFirstRetry = immediateFirstRetry !== false;    // should default to true if not specified.
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
  nextRetryTimeout(retryCount: number, isThrottled: boolean): number {
    /*SRS_NODE_COMMON_RETRY_POLICY_16_008: [The `getNextTimeout` method shall return `0` instead of the result of the math formula if the following 3 conditions are met:
    - the `constructor` was called with the `immediateFirstTimeout` boolean set to `true`
    - the `isThrottled` boolean is `false`.
    - the `currentRetryCount` is `0` (meaning it's the first retry).]*/
    if (this.immediateFirstRetry && retryCount === 0 && !isThrottled) {
      return 0;
    } else {
      /*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_007: [The `getNextTimeout` method shall implement the following math formula to determine the next timeout value: `F(x) = min(Cmin+ (2^(x-1)-1) * rand(C * (1 – Jd), C*(1-Ju)), Cmax)`]*/
      const constants = isThrottled ? this.throttledParameters : this.normalParameters;
      const minRandomFactor = constants.c * (1 - constants.jd);
      const  maxRandomFactor = constants.c * (1 - constants.ju);
      const randomJitter = Math.random() * (maxRandomFactor - minRandomFactor);
      return Math.min(constants.cMin + (Math.pow(2, retryCount - 1) - 1) * randomJitter, constants.cMax);
    }
  }

  /**
   * Based on the error passed as argument, determines if an error is transient and if the operation should be retried or not.
   *
   * @param {Error} error The error encountered by the operation.
   * @returns {boolean}   Whether the operation should be retried or not.
   */
  shouldRetry(error: Error): boolean {
    /*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_006: [The `shouldRetry` method of the new instance shall use the error filter passed to the constructor when the object was instantiated.]*/
    return this._errorFilter[error.name];
  }
}

/**
 * Stub policy that blocks any retry tentative. Operations are not retried.
 *
 * @implements {RetryPolicy}
 */
export class NoRetry implements RetryPolicy {
  /**
   * This will always return -1 as no retry is desired.
   *
   * @param {number} retryCount This parameter is ignored.
   */
  /*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_004: [The `getNextTimeout` method shall always return `-1`.]*/
  nextRetryTimeout(_retryCount: number): number {
    return -1;
  }

  /**
   * This will always return false as no retry is desired.
   *
   * @param {Error} err This parameter is ignored.
   * @returns {boolean} Will always be false: retry should not be attempted no matter what the error is.
   */
  /*Codes_SRS_NODE_COMMON_RETRY_POLICY_16_03: [The `shouldRetry` method shall always return `false`.]*/
  shouldRetry(_err: Error): boolean {
    return false;
  }
}
