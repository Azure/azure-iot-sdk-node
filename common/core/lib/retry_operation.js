// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var errors = require("./errors");
var dbg = require("debug");
var debug = dbg('azure-iot-common:RetryOperation');
/**
 * Implements the necessary logic to retry operations such as connecting, receiving C2D messages, sending telemetry, twin updates, etc.
 */
var RetryOperation = /** @class */ (function () {
    /**
     * Creates an instance of {@link azure-iot-common.RetryOperation.}
     * @param {RetryPolicy} policy The retry policy to be used for this operation, which determines what error is "retryable" or not and how fast to retry.
     * @param {number} maxTimeout  The maximum timeout for this operation, after which no retry will be attempted.
     */
    function RetryOperation(policy, maxTimeout) {
        this._retryCount = 0;
        this._policy = policy;
        this._maxTimeout = maxTimeout;
    }
    /**
     * Executes an operation and retries if it fails and the retry policy allows it.
     *
     * @param {(opCallback: (err?: Error, result?: any) => void) => void} operation The operation to execute.
     * @param {(err?: Error, result?: any) => void} finalCallback                   The callback to call with the final error or result, after retries if necessary.
     */
    RetryOperation.prototype.retry = function (operation, finalCallback) {
        var _this = this;
        var retryOperation = function () {
            _this._retryCount++;
            /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_001: [The `operation` function should be called at every retry.]*/
            operation(function (err, result, response) {
                if (err) {
                    /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_003: [If the `operation` fails with an error the `retry` method should determine whether to retry or not using the `shouldRetry` method of the policy passed to the constructor.]*/
                    if (_this._policy.shouldRetry(err)) {
                        /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_005: [If the `operation` fails and should be retried, the time at which to try again the `operation` should be computed using the `nextRetryTimeout` method of the policy passed to the constructor. ]*/
                        var nextRetryTimeout = _this._policy.nextRetryTimeout(_this._retryCount, (err instanceof errors.ThrottlingError));
                        /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_006: [The `operation` should not be retried past the `maxTimeout` parameter passed to the constructor.]*/
                        if (Date.now() >= _this._operationExpiryTime || nextRetryTimeout < 0) {
                            debug('Past the maximum timeout for the operation. failing with the latest error.');
                            finalCallback(err);
                        }
                        else {
                            debug('Will retry after: ' + nextRetryTimeout + ' milliseconds');
                            setTimeout(retryOperation, nextRetryTimeout);
                        }
                    }
                    else {
                        debug('Error: ' + err.toString() + ' is not retriable');
                        /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_004: [If the `operation` fails and should not be retried, the `finalCallback` should be called with the last error as the only parameter. ]*/
                        finalCallback(err);
                    }
                }
                else {
                    /*Codes_SRS_NODE_COMMON_RETRY_OPERATION_16_002: [If the `operation` is successful the `finalCallback` function should be called with a `null` error parameter and the result of the operation.]*/
                    finalCallback(null, result, response);
                }
            });
        };
        this._operationStartTime = Date.now();
        this._operationExpiryTime = this._operationStartTime + this._maxTimeout;
        debug('Operation start time: ' + this._operationStartTime + ' - Will stop retrying after: ' + this._operationExpiryTime);
        retryOperation();
    };
    return RetryOperation;
}());
exports.RetryOperation = RetryOperation;
//# sourceMappingURL=retry_operation.js.map