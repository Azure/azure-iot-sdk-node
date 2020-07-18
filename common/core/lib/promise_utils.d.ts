import { ResultWithHttpResponse } from './results';
/**
 * Defines type describing callback with two results.
 *
 * @template TResult1 - Type of the first result value, possibly Error.
 * @template TResult2 - Type of the second result value, possibly Error.
 */
export declare type DoubleValueCallback<TResult1, TResult2> = (result1?: TResult1, result2?: TResult2) => void;
/**
 * Defines type describing callback with one non-error result value.
 *
 * @template TResult - Type of the result value.
 */
export declare type NoErrorCallback<TResult> = (result?: TResult) => void;
/**
 * Defines type describing callback with only Error result value.
 */
export declare type ErrorCallback = (error?: Error) => void;
/**
 * Defines type describing regular callback with two results - one is the Error, the other one is the result value.
 *
 * @template TResult - Type of the result value.
 */
export declare type Callback<TResult> = DoubleValueCallback<Error, TResult>;
/**
 * Defines type describing regular callback with three results - the first one is Error, the other two are the result values.
 *
 * @template TResult1 - Type of the first result value.
 * @template TResult2 - Type of the second result value.
 */
export declare type TripleValueCallback<TResult1, TResult2> = (error?: Error, result1?: TResult1, result2?: TResult2) => void;
/**
 * Defines type describing callback with three results - response, raw HTTP response and an Error.
 *
 * @template TResult - Type of the result value.
 */
export declare type HttpResponseCallback<TResult> = TripleValueCallback<TResult, any>;
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
export declare function callbackToPromise<TResult>(callBackOperation: (callback: Callback<TResult>) => void, userCallback?: Callback<TResult>): Promise<TResult> | void;
/**
 * @private
 *
 * Converts method taking callback returning only error as a parameter to method returning a void Promise if userCallback is not specified.
 * Otherwise, it executes the method with userCallback as the callback.
 *
 * @param {callback: ErrorCallback) => void} callBackOperation - Function taking error-only returning callback as a parameter.
 * @param {ErrorCallback} [userCallback] - Optional caller-provided callback. The method will not return a Promise if specified.
 * @returns {Promise<void> | void} Promise with empty result or a rejection or void if user's callback provided
 * @example
 * // When method takes only callback as the parameter like example:
 * function foo(callback: Function) {[...]}
 * // we call
 * errorCallbackToPromise((_callback) => foo(_callback));
 * // We need to create a lambda expression or an anonymous function because this method has to inject its own callback.
 *
 * // If converted method takes more than callback as its parameter, we need to create a closure. For method defined like
 * function foo(param: any, callback: Function) {[...]}
 * // we call
 * const param = 42;
 * errorCallbackToPromise((_callback) => foo(param, _callback)).then(_ => { }, err => { console.log(err); });
 */
export declare function errorCallbackToPromise(callBackOperation: (callback: ErrorCallback) => void, userCallback: ErrorCallback): void;
export declare function errorCallbackToPromise(callBackOperation: (callback: ErrorCallback) => void): Promise<void>;
/**
 * @private
 *
 * Converts method taking callback returning only result as a parameter to method returning a Promise with the result if userCallback is not specified.
 * Otherwise, it executes the method with userCallback as the callback.
 *
 * @param {(callback: NoErrorCallback<TResult>) => void} callBackOperation - Function taking result-only returning callback as a parameter.
 * @param {NoErrorCallback<TResult>} [userCallback] - Optional caller-provided callback. The method will not return a Promise if specified.
 * @returns {Promise<TResult> | void} Promise with the result, it never rejects or void if user's callback provided
 * @template TResult - Type of the result value.
 * @example
 * // When method takes only callback as the parameter like example:
 * function foo(callback: Function) {[...]}
 * // we call
 * noErrorCallbackToPromise((_callback) => foo(_callback));
 * // We need to create a lambda expression or an anonymous function because this method has to inject its own callback.
 *
 * // If converted method takes more than callback as its parameter, we need to create a closure. For method defined like
 * function foo(param: any, callback: Function) {[...]}
 * // we call
 * const param = 42;
 * noErrorCallbackToPromise((_callback) => foo(param, _callback)).then(result => { console.log(result); }, err => { console.log("it never rejects"); });
 */
export declare function noErrorCallbackToPromise<TResult>(callBackOperation: (callback: NoErrorCallback<TResult>) => void, userCallback: NoErrorCallback<TResult>): void;
export declare function noErrorCallbackToPromise<TResult>(callBackOperation: (callback: NoErrorCallback<TResult>) => void): Promise<TResult>;
/**
 * @private
 *
 * Converts method taking callback with two result values (one can be an Error) as a parameter to method returning a Promise if userCallback is not specified.
 * Otherwise, it executes the method with userCallback as the callback.
 * Promise cannot return multiple objects so the return values have to be packed into a single object.
 *
 * @param {(callback: DoubleValueCallback<TResult1, TResult2>) => void} callBackOperation - Function taking callback with two return values and an error as a parameter.
 * @param {(result1: TResult1, result2: TResult2) => TPromiseResult} packResults - Function converting two return values from the callback to a single object of {TPromiseResult} type.
 * @param {DoubleValueCallback<TResult1, TResult2>} [userCallback] - Optional caller-provided callback. The method will not return a Promise if specified.
 * @returns {Promise<TResult> | void} Promise with result of TResult type or void if user's callback provided
 * @template TResult1 - Type of the first result value.
 * @template TResult2 - Type of the second result value.
 * @template TPromiseResult - Type of the Promise result value.
 * @example
 * // When method takes only callback as the parameter like example:
 * function foo(callback: Function) {[...]}
 * // we call
 * const pack = (result1, result2) => { return { res1: result1, res2: result2 }; };
 * doubleValueCallbackToPromise((_callback) => foo(_callback), pack);
 * // We need to create a lambda expression or an anonymous function because this method has to inject its own callback
 * // and we need to provide a method packing two results into one object which is returned in the Promise.
 *
 * // If converted method takes more than callback as its parameter, we need to create a closure. For method defined like
 * function foo(param: any, callback: Function) {[...]}
 * // we call
 * const pack = (result1, result2) => { return { res1: result1, res2: result2 }; };
 * const param = 42;
 * doubleValueCallbackToPromise((_callback) => foo(param, _callback), pack).then(result => { console.log(result); }, err => { console.error(error); });
 */
export declare function doubleValueCallbackToPromise<TResult1, TResult2, TPromiseResult>(callBackOperation: (callback: DoubleValueCallback<TResult1, TResult2>) => void, packResults: (result1: TResult1, result2: TResult2) => TPromiseResult, userCallback: DoubleValueCallback<TResult1, TResult2>): void;
export declare function doubleValueCallbackToPromise<TResult1, TResult2, TPromiseResult>(callBackOperation: (callback: DoubleValueCallback<TResult1, TResult2>) => void, packResults: (result1: TResult1, result2: TResult2) => TPromiseResult): Promise<TPromiseResult>;
/**
 * @private
 *
 * Converts method taking callback with two result values and an error as a parameter to method returning a Promise if userCallback is not specified.
 * Otherwise, it executes the method with userCallback as the callback.
 * Promise cannot return multiple objects so the return values have to be packed into a single object.
 *
 * @param {(callback: DoubleValueCallback<TResult1, TResult2>) => void} callbackOperation - Function taking callback with two return values and an error as a parameter.
 * @param {(result1: TResult1, result2: TResult2) => TPromiseResult} packResults - Function converting two return values from the callback to a single object of {TPromiseResult} type.
 * @param {TripleValueCallback<TResult1, TResult2>} [userCallback] - Optional caller-provided callback. The method will not return a Promise if specified.
 * @returns {Promise<TResult> | void} Promise with result of TResult type or void if user's callback provided.
 * @template TResult1 - Type of the first result value.
 * @template TResult2 - Type of the second result value.
 * @template TPromiseResult - Type of the Promise result value.
 * @example
 * // When method takes only callback as the parameter like example:
 * function foo(callback: Function) {[...]}
 * // we call
 * const pack = (result1, result2) => { return { res1: result1, res2: result2 }; };
 * tripleValueCallbackToPromise((_callback) => foo(_callback), pack);
 * // We need to create a lambda expression or an anonymous function because this method has to inject its own callback
 * // and we need to provide a method packing two results into one object which is returned in the Promise.
 *
 * // If converted method takes more than callback as its parameter, we need to create a closure. For method defined like
 * function foo(param: any, callback: Function) {[...]}
 * // we call
 * const pack = (result1, result2) => { return { res1: result1, res2: result2 }; };
 * const param = 42;
 * tripleValueCallbackToPromise((_callback) => foo(param, _callback), pack).then(result => { console.log(result); }, err => { console.error(error); });
 */
export declare function tripleValueCallbackToPromise<TResult1, TResult2, TPromiseResult>(callbackOperation: (callback: TripleValueCallback<TResult1, TResult2>) => void, packResults: (result1: TResult1, result2: TResult2) => TPromiseResult, userCallback: TripleValueCallback<TResult1, TResult2>): void;
export declare function tripleValueCallbackToPromise<TResult1, TResult2, TPromiseResult>(callbackOperation: (callback: TripleValueCallback<TResult1, TResult2>) => void, packResults: (result1: TResult1, result2: TResult2) => TPromiseResult): Promise<TPromiseResult>;
/**
 * @private
 *
 * Converts method taking callback with two result values (response body and HTTP response itself)
 * and an error as a parameter to method returning a Promise if userCallback is not specified.
 * Otherwise, it executes the method with userCallback as the callback.
 *
 * @param {(callback: HttpResponseCallback<TResult>) => void} callbackOperation - Function taking callback with two return values (response body and HTTP response) and an error as a parameter.
 * @param {HttpResponseCallback<TResult>} callback - Optional caller-provided callback. The method will not return a Promise if specified.
 * @returns {Promise<TResult> | void} Promise with result of TResult type or void if user's callback provided
 * @template TResult - Type of the response body result.
 */
export declare function httpCallbackToPromise<TResult>(callbackOperation: (callback: HttpResponseCallback<TResult>) => void, callback: HttpResponseCallback<TResult>): void;
export declare function httpCallbackToPromise<TResult>(callbackOperation: (callback: HttpResponseCallback<TResult>) => void): Promise<ResultWithHttpResponse<TResult>>;
/**
 * @private
 */
export declare function createResultWithHttpResponse<TResult>(responseBody: TResult, httpResponse: any): ResultWithHttpResponse<TResult>;
