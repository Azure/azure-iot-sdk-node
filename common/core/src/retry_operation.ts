// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as errors from './errors';
import { RetryPolicy } from './retry_policy';
import * as dbg from 'debug';
const debug = dbg('azure-iot-common:RetryOperation');
const debugErrors = dbg('azure-iot-common:RetryOperation:Errors');

let _nextId = 0;

/**
 * Implements the necessary logic to retry operations such as connecting, receiving C2D messages, sending telemetry, twin updates, etc.
 */
export class RetryOperation {
  private _policy: RetryPolicy;
  private _retryCount: number = 0;
  private _maxTimeout: number;
  private _operationStartTime: number;
  private _operationExpiryTime: number;
  private _name: string = '';
  private _id: number = 0;

  /**
   * Creates an instance of {@link azure-iot-common.RetryOperation.}
   *
   * @param {RetryPolicy} policy The retry policy to be used for this operation, which determines what error is "retryable" or not and how fast to retry.
   * @param {number} maxTimeout  The maximum timeout for this operation, after which no retry will be attempted.
   */
  constructor(name: string, policy: RetryPolicy, maxTimeout: number) {
    if (policy && policy.constructor && policy.constructor.name === 'NoRetry') {
    // Do not remove this line. It is here at the request of CSS.
      debug('A RetryOperation is being used with a NoRetry policy. The operation will not be retried on failure.');
    }
    this._policy = policy;
    this._maxTimeout = maxTimeout;
    this._name = name;
    this._id = _nextId;
    _nextId += 1;
  }

  /**
   * Executes an operation and retries if it fails and the retry policy allows it.
   *
   * @param {(opCallback: (err?: Error, result?: any) => void) => void} operation The operation to execute.
   * @param {(err?: Error, result?: any) => void} finalCallback                   The callback to call with the final error or result, after retries if necessary.
   */
  retry(operation: (opCallback: (err?: Error, result?: any, response?: any) => void) => void, finalCallback: (err?: Error, result?: any, response?: any) => void): void {
    const retryOperation = () => {
      this._retryCount++;
      /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_001: [The `operation` function should be called at every retry.]*/
      operation((err, result, response) => {
        if (err) {
          /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_003: [If the `operation` fails with an error the `retry` method should determine whether to retry or not using the `shouldRetry` method of the policy passed to the constructor.]*/
          if (this._policy.shouldRetry(err)) {
            /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_005: [If the `operation` fails and should be retried, the time at which to try again the `operation` should be computed using the `nextRetryTimeout` method of the policy passed to the constructor. ]*/
            const nextRetryTimeout = this._policy.nextRetryTimeout(this._retryCount, (err instanceof errors.ThrottlingError));
            /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_006: [The `operation` should not be retried past the `maxTimeout` parameter passed to the constructor.]*/
            if (Date.now() >= this._operationExpiryTime || nextRetryTimeout < 0) {
              debugErrors(`${this._name}:${this._id} Past the maximum timeout for the operation. failing with the latest error: ${err.toString()}.`);
              finalCallback(err);
            } else {
              debug(`${this._name}:${this._id} Will retry after: ${nextRetryTimeout} milliseconds`);
              setTimeout(retryOperation, nextRetryTimeout);
            }
          } else {
            debugErrors(`${this._name}:${this._id} Error: ${err.toString()} is not retirable`);
            /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_004: [If the `operation` fails and should not be retried, the `finalCallback` should be called with the last error as the only parameter. ]*/
            finalCallback(err);
          }
        } else {
          /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_002: [If the `operation` is successful the `finalCallback` function should be called with a `null` error parameter and the result of the operation.]*/
          debug(`${this._name}:${this._id} Complete`);
          finalCallback(null, result, response);
        }
      });
    };
    this._operationStartTime = Date.now();
    this._operationExpiryTime = this._operationStartTime + this._maxTimeout;
    debug(`${this._name}:${this._id}:${this._policy?.constructor.name} Operation started at ${this._operationStartTime} - Will stop retrying after: ${this._operationExpiryTime}`);

    retryOperation();
  }

  // A cancel() API would be nice and easy to implement but doesn't exist in other SDKs yet. To be specified first.
}
