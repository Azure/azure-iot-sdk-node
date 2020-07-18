import { ErrorFilter } from './retry_error_filter';
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
    nextRetryTimeout: (retryCount: number, isThrottled: boolean) => number;
    /**
     * Based on the error passed as argument, determines if an error is transient and if the operation should be retried or not.
     *
     * @param {Error} error The error encountered by the operation.
     * @returns {boolean}   Whether the operation should be retried or not.
     */
    shouldRetry: (error: Error) => boolean;
}
/**
 * Parameters used with the {@link azure-iot-common.ExponentialBackOffWithJitter} policy to compute retry intervals.
 */
export declare class ExponentialBackoffWithJitterParameters {
    /**
     * Initial retry interval: 100 ms by default.
     */
    c: number;
    /**
     * Minimal interval between each retry. 100 milliseconds by default
     */
    cMin: number;
    /**
     * Maximum interval between each retry. 10 seconds by default
     */
    cMax: number;
    /**
     * Jitter up factor. 0.25 by default.
     */
    ju: number;
    /**
     * Jitter down factor. 0.5 by default
     */
    jd: number;
}
/**
 * Implements an Exponential Backoff with Jitter retry strategy.
 * The function to calculate the next interval is the following (x is the xth retry):
 * F(x) = min(Cmin+ (2^(x-1)-1) * rand(C * (1 – Jd), C*(1-Ju)), Cmax)
 * @implements {RetryStrategy}
 */
export declare class ExponentialBackOffWithJitter implements RetryPolicy {
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
    private _errorFilter;
    /**
     * Initializes a new instance of the {@link azure-iot-common.ExponentialBackOffWithJitter} class.
     * @param maxTimeout            maximum allowed timeout in milliseconds.
     * @param immediateFirstRetry   boolean indicating whether the first retry should be immediate (default) or wait the first interval (c value).
     */
    constructor(immediateFirstRetry?: boolean, errorFilter?: ErrorFilter);
    /**
     * Computes the interval to wait before retrying at each new retry tentative.
     *
     * @param {number} retryCount    Current retry tentative.
     * @param {boolean} isThrottled  Boolean indicating whether the Azure IoT hub is throttling operations.
     * @returns {number}             The time to wait before attempting a retry in milliseconds.
     */
    nextRetryTimeout(retryCount: number, isThrottled: boolean): number;
    /**
     * Based on the error passed as argument, determines if an error is transient and if the operation should be retried or not.
     *
     * @param {Error} error The error encountered by the operation.
     * @returns {boolean}   Whether the operation should be retried or not.
     */
    shouldRetry(error: Error): boolean;
}
/**
 * Stub policy that blocks any retry tentative. Operations are not retried.
 *
 * @implements {RetryPolicy}
 */
export declare class NoRetry implements RetryPolicy {
    /**
     * This will always return -1 as no retry is desired.
     *
     * @param {number} retryCount This parameter is ignored.
     */
    nextRetryTimeout(retryCount: number): number;
    /**
     * This will always return false as no retry is desired.
     *
     * @param {Error} err This parameter is ignored.
     * @returns {boolean} Will always be false: retry should not be attempted no matter what the error is.
     */
    shouldRetry(err: Error): boolean;
}
