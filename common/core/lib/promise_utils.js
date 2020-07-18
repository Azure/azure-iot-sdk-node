// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @private
 *
 * Converts method taking regular callback as a parameter to method returning a Promise if userCallback is not specified.
 * Otherwise, it executes the method with userCallback as the callback.
 *
 * @param {(callback: Callback<TResult>) => void} callBackOperation - Function taking regular callback as a parameter.
 * @param {Callback<TResult>} [userCallback] - Optional caller-provided callback. The method will not return a Promise if specified.
 * @returns {Promise<TResult> | void} Promise with result of TResult type or void if user's callback provided
 * @template TResult - Type of the result value.
 * @example
 * // When method takes only callback as the parameter like example:
 * function foo(callback: Function) {[...]}
 * // we call
 * callbackToPromise((_callback) => foo(_callback));
 * // We need to create a lambda expression or an anonymous function because this method has to inject its own callback.
 *
 * // If converted method takes more than callback as its parameter, we need to create a closure. For method defined like
 * function foo(param: any, callback: Function) {[...]}
 * // we call
 * const param = 42;
 * callbackToPromise((_callback) => foo(param, _callback)).then(result => { console.log(result); }, error => { console.error(error); });
 */
function callbackToPromise(callBackOperation, userCallback) {
    if (userCallback) {
        if (!(typeof userCallback === 'function')) {
            throw new TypeError('Callback has to be a Function');
        }
        return callBackOperation(userCallback);
    }
    return new Promise(function (resolve, reject) {
        try {
            callBackOperation(function (error, result) {
                if (error) {
                    return reject(error);
                }
                return resolve(result);
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.callbackToPromise = callbackToPromise;
function errorCallbackToPromise(callBackOperation, userCallback) {
    return callbackToPromise(callBackOperation, userCallback);
}
exports.errorCallbackToPromise = errorCallbackToPromise;
function noErrorCallbackToPromise(callBackOperation, userCallback) {
    if (userCallback) {
        if (!(typeof userCallback === 'function')) {
            throw new TypeError('Callback has to be a Function');
        }
        return callBackOperation(userCallback);
    }
    return new Promise(function (resolve, _reject) {
        callBackOperation(function (result) {
            return resolve(result);
        });
    });
}
exports.noErrorCallbackToPromise = noErrorCallbackToPromise;
function doubleValueCallbackToPromise(callBackOperation, packResults, userCallback) {
    if (userCallback) {
        if (!(typeof userCallback === 'function')) {
            throw new TypeError('Callback has to be a Function');
        }
        return callBackOperation(userCallback);
    }
    return new Promise(function (resolve, reject) {
        try {
            callBackOperation(function (result1, result2) {
                if (result1 instanceof Error) {
                    reject(result1);
                }
                if (result2 instanceof Error) {
                    reject(result2);
                }
                return resolve(packResults(result1, result2));
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.doubleValueCallbackToPromise = doubleValueCallbackToPromise;
function tripleValueCallbackToPromise(callbackOperation, packResults, userCallback) {
    if (userCallback) {
        if (!(typeof userCallback === 'function')) {
            throw new TypeError('Callback has to be a Function');
        }
        return callbackOperation(userCallback);
    }
    return new Promise(function (resolve, reject) {
        try {
            callbackOperation(function (error, result1, result2) {
                if (error) {
                    reject(error);
                }
                resolve(packResults(result1, result2));
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.tripleValueCallbackToPromise = tripleValueCallbackToPromise;
function httpCallbackToPromise(callbackOperation, callback) {
    return tripleValueCallbackToPromise(callbackOperation, function (b, r) { return createResultWithHttpResponse(b, r); }, callback);
}
exports.httpCallbackToPromise = httpCallbackToPromise;
/**
 * @private
 */
function createResultWithHttpResponse(responseBody, httpResponse) {
    return { responseBody: responseBody, httpResponse: httpResponse };
}
exports.createResultWithHttpResponse = createResultWithHttpResponse;
//# sourceMappingURL=promise_utils.js.map