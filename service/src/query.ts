// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Twin } from './twin';
import { Registry } from './registry';
import { IncomingMessageCallback, ResultWithIncomingMessage, createResultWithIncomingMessage } from './interfaces';
import { tripleValueCallbackToPromise } from 'azure-iot-common';

/**
 * Constructs a Query object that provides APIs to trigger the execution of a device query.
 * SDK users should create queries using the {@link azure-iothub.JobClient.createQuery} and {@link azure-iothub.Registry.createQuery} APIs
 * and should not try to instantiate this class directly.
 */
export class Query {
  /**
   * Token used to iterate over multiple pages of results.
   */
  continuationToken: string;
  /**
   * Boolean indicating whether there are more results pages.
   */
  hasMoreResults: boolean;

  private _registry: Registry;
  private _executeQueryFn: (continuationToken: string, done: IncomingMessageCallback<any>) => void;

  /**
   * @private
   * @constructor
   * @param {Function}       executeQueryFn  The function that should be called to get a new page.
   * @param {Registry}       registry        [optional] Registry client used to create Twin objects (used in nextAsTwin()).
   */
  constructor(executeQueryFn: (continuationToken: string, done: IncomingMessageCallback<any>) => void, registry?: Registry) {
    if (!executeQueryFn) throw new ReferenceError('executeQueryFn cannot be \'' + executeQueryFn + '\'');
    if (typeof executeQueryFn !== 'function') throw new TypeError('executeQueryFn cannot be \'' + typeof executeQueryFn + '\'');

    this._executeQueryFn = executeQueryFn;
    this._registry = registry;

    this.hasMoreResults = true;
    this.continuationToken = null;
  }

  /**
   * @method              module:azure-iothub.Query#next
   * @description         Gets the next page of results for this query.
   * @param {string}      continuationToken    Continuation Token used for paging through results (optional)
   * @param {Function}    [done]               The optional callback that will be called with either an Error object or
   *                                           the results of the query.
   * @returns {Promise<ResultWithIncomingMessage<any>> | void} Promise if no callback function was passed, void otherwise.
   */
  next(continuationToken: string, done: IncomingMessageCallback<any>): void;
  next(done: IncomingMessageCallback<any>): void;
  next(continuationToken: string): Promise<ResultWithIncomingMessage<any>>;
  next(): Promise<ResultWithIncomingMessage<any>>;
  next(continuationTokenOrCallback?: string | IncomingMessageCallback<any>, done?: IncomingMessageCallback<any>): Promise<ResultWithIncomingMessage<any>> | void {
    let actualContinuationToken = this.continuationToken;
    let actualCallback: IncomingMessageCallback<any>;
    /*Codes_SRS_NODE_SERVICE_QUERY_16_016: [If `continuationToken` is a function and `done` is undefined the `next` method shall assume that `continuationToken` is actually the callback and us it as such (see requirements associated with the `done` parameter)]*/
    if (typeof continuationTokenOrCallback === 'function' && !done) {
      actualCallback = continuationTokenOrCallback as IncomingMessageCallback<any>;
    } else {
      /*Codes_SRS_NODE_SERVICE_QUERY_16_017: [the `next` method shall use the `continuationToken` passed as argument instead of its own property `Query.continuationToken` if it's not falsy.]*/
      actualContinuationToken = continuationTokenOrCallback as string;
      actualCallback = done as IncomingMessageCallback<any>;
    }

    return tripleValueCallbackToPromise((_callback) => {
      this._executeQueryFn(actualContinuationToken, (err, result, response) => {
        if (err) {
          /*Codes_SRS_NODE_SERVICE_QUERY_16_008: [The `next` method shall call the `_callback` callback with a single argument that is an instance of the standard Javascript `Error` object if the request failed.]*/
          _callback(err);
        } else {
          /*Codes_SRS_NODE_SERVICE_QUERY_16_006: [The `next` method shall set the `Query.continuationToken` property to the `continuationToken` value of the query result.]*/
          this.continuationToken = response.headers['x-ms-continuation'] as string;

          /*Codes_SRS_NODE_SERVICE_QUERY_16_013: [The `next` method shall set the `Query.hasMoreResults` property to `true` if the `continuationToken` property of the result object is not `null`.]*/
          /*Codes_SRS_NODE_SERVICE_QUERY_16_014: [The `next` method shall set the `Query.hasMoreResults` property to `false` if the `continuationToken` property of the result object is `null`.]*/
          this.hasMoreResults = this.continuationToken !== undefined;

          /*Codes_SRS_NODE_SERVICE_QUERY_16_007: [The `next` method shall call the `_callback` callback with a `null` error object, the results of the query and the response of the underlying transport if the request was successful.]*/
          _callback(null, result, response);
        }
      });
    }, (r, m) => { return createResultWithIncomingMessage(r, m); }, actualCallback);
  }

  /**
   * @method              module:azure-iothub.Query#nextAsTwin
   * @description         Gets the next page of results for this query and cast them as Twins.
   * @param {string}      continuationToken    Continuation Token used for paging through results (optional)
   * @param {Function}    [done]               The optional callback that will be called with either an Error object or
   *                                           the results of the query.
   * @returns {Promise<ResultWithIncomingMessage<Twin[]>> | void} Promise if no callback function was passed, void otherwise.
   */
  nextAsTwin(continuationToken: string, done: IncomingMessageCallback<Twin[]>): void;
  nextAsTwin(done: IncomingMessageCallback<Twin[]>): void;
  nextAsTwin(continuationToken: string): Promise<ResultWithIncomingMessage<Twin[]>>;
  nextAsTwin(): Promise<ResultWithIncomingMessage<Twin[]>>;
  nextAsTwin(continuationToken?: string | IncomingMessageCallback<Twin[]>, done?: IncomingMessageCallback<Twin[]>): Promise<ResultWithIncomingMessage<Twin[]>> | void {
    /*Codes_SRS_NODE_SERVICE_QUERY_16_016: [If `continuationToken` is a function and `_callback` is undefined the `next` method shall assume that `continuationToken` is actually the callback and us it as such (see requirements associated with the `done` parameter)]*/
    if (typeof continuationToken === 'function' && !done) {
      done = continuationToken;
      continuationToken = null;
    }

    return tripleValueCallbackToPromise((_callback) => {
      let ct = continuationToken as string || this.continuationToken;

      this.next(ct, (err, result, response) => {
        if (err) {
          /*Codes_SRS_NODE_SERVICE_QUERY_16_008: [The `next` method shall call the `_callback` callback with a single argument that is an instance of the standard Javascript `Error` object if the request failed.]*/
          _callback(err);
        } else {
          if (result) {
            /*SRS_NODE_SERVICE_QUERY_16_009: [The `nextAsTwin` method shall call the `_callback` callback with a `null` error object and a collection of `Twin` objects created from the results of the query if the request was successful.]*/
            const twins = result.map((twinJson) => {
              return new Twin(twinJson, this._registry);
            });
            _callback(null, twins, response);
          } else {
            /*Codes_SRS_NODE_SERVICE_QUERY_16_007: [The `next` method shall call the `_callback` callback with a `null` error object, the results of the query and the response of the underlying transport if the request was successful.]*/
            _callback(null, null, response);
          }
        }
      });
    }, (r, m) => { return createResultWithIncomingMessage(r, m); }, done);
  }
}
