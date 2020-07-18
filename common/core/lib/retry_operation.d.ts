import { RetryPolicy } from './retry_policy';
/**
 * Implements the necessary logic to retry operations such as connecting, receiving C2D messages, sending telemetry, twin updates, etc.
 */
export declare class RetryOperation {
    private _policy;
    private _retryCount;
    private _maxTimeout;
    private _operationStartTime;
    private _operationExpiryTime;
    /**
     * Creates an instance of {@link azure-iot-common.RetryOperation.}
     * @param {RetryPolicy} policy The retry policy to be used for this operation, which determines what error is "retryable" or not and how fast to retry.
     * @param {number} maxTimeout  The maximum timeout for this operation, after which no retry will be attempted.
     */
    constructor(policy: RetryPolicy, maxTimeout: number);
    /**
     * Executes an operation and retries if it fails and the retry policy allows it.
     *
     * @param {(opCallback: (err?: Error, result?: any) => void) => void} operation The operation to execute.
     * @param {(err?: Error, result?: any) => void} finalCallback                   The callback to call with the final error or result, after retries if necessary.
     */
    retry(operation: (opCallback: (err?: Error, result?: any, response?: any) => void) => void, finalCallback: (err?: Error, result?: any, response?: any) => void): void;
}
