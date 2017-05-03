// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Twin } from './twin';
import { Callback } from './interfaces';
import { Registry } from './registry';

/**
 * @class                  module:azure-iothub.Query
 * @classdesc              Constructs a Query object that provides APIs to trigger the execution of a device query.
 * @param {Function}       executeQueryFn  The function that should be called to get a new page.
 * @param {Registry}       registry        [optional] Registry client used to create Twin objects (used in nextAsTwin()).
 */
export class Query {
  continuationToken: string;
  hasMoreResults: boolean;

  private _registry: Registry;
  private _executeQueryFn: (continuationToken: string, done: Callback<any>) => void;

  constructor(executeQueryFn: (continuationToken: string, done: Callback<any>) => void, registry?: Registry) {
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
   * @param {Function}    done                 The callback that will be called with either an Error object or
   *                                           the results of the query.
   */
  next(continuationTokenOrCallback: string | Callback<any>, done?: Callback<any>): void {
    let actualContinuationToken = this.continuationToken;
    let actualCallback: Callback<any>;

    /*Codes_SRS_NODE_SERVICE_QUERY_16_016: [If `continuationToken` is a function and `done` is undefined the `next` method shall assume that `continuationToken` is actually the callback and us it as such (see requirements associated with the `done` parameter)]*/
    if (typeof continuationTokenOrCallback === 'function' && !done) {
      actualCallback = continuationTokenOrCallback as Callback<any>;
    } else {
      /*Codes_SRS_NODE_SERVICE_QUERY_16_017: [the `next` method shall use the `continuationToken` passed as argument instead of its own property `Query.continuationToken` if it's not falsy.]*/
      actualContinuationToken = continuationTokenOrCallback as string;
      actualCallback = done as Callback<any>;
    }

    this._executeQueryFn(actualContinuationToken, (err, result, response) => {
      if (err) {
        /*Codes_SRS_NODE_SERVICE_QUERY_16_008: [The `next` method shall call the `done` callback with a single argument that is an instance of the standard Javascript `Error` object if the request failed.]*/
        actualCallback(err);
      } else {
        /*Codes_SRS_NODE_SERVICE_QUERY_16_006: [The `next` method shall set the `Query.continuationToken` property to the `continuationToken` value of the query result.]*/
        this.continuationToken = response.headers['x-ms-continuation'];

        /*Codes_SRS_NODE_SERVICE_QUERY_16_013: [The `next` method shall set the `Query.hasMoreResults` property to `true` if the `continuationToken` property of the result object is not `null`.]*/
        /*Codes_SRS_NODE_SERVICE_QUERY_16_014: [The `next` method shall set the `Query.hasMoreResults` property to `false` if the `continuationToken` property of the result object is `null`.]*/
        this.hasMoreResults = this.continuationToken !== undefined;

        /*Codes_SRS_NODE_SERVICE_QUERY_16_007: [The `next` method shall call the `done` callback with a `null` error object, the results of the query and the response of the underlying transport if the request was successful.]*/
        actualCallback(null, result, response);
      }
    });
  }

  /**
   * @method              module:azure-iothub.Query#nextAsTwin
   * @description         Gets the next page of results for this query and cast them as Twins.
   * @param {string}      continuationToken    Continuation Token used for paging through results (optional)
   * @param {Function}    done                 The callback that will be called with either an Error object or
   *                                           the results of the query.
   */
  nextAsTwin(continuationToken: string | Callback<Twin[]>, done: Callback<Twin[]>): void {
    /*Codes_SRS_NODE_SERVICE_QUERY_16_016: [If `continuationToken` is a function and `done` is undefined the `next` method shall assume that `continuationToken` is actually the callback and us it as such (see requirements associated with the `done` parameter)]*/
    if (typeof continuationToken === 'function' && !done) {
      done = continuationToken;
      continuationToken = null;
    }

    let ct = continuationToken || this.continuationToken;

    this.next(ct, (err, result, response) => {
      if (err) {
        /*Codes_SRS_NODE_SERVICE_QUERY_16_008: [The `next` method shall call the `done` callback with a single argument that is an instance of the standard Javascript `Error` object if the request failed.]*/
        done(err);
      } else {
        if (result) {
          /*SRS_NODE_SERVICE_QUERY_16_009: [The `nextAsTwin` method shall call the `done` callback with a `null` error object and a collection of `Twin` objects created from the results of the query if the request was successful.]*/
          const twins = result.map((twinJson) => {
            return new Twin(twinJson, this._registry);
          });
          done(null, twins, response);
        } else {
          /*Codes_SRS_NODE_SERVICE_QUERY_16_007: [The `next` method shall call the `done` callback with a `null` error object, the results of the query and the response of the underlying transport if the request was successful.]*/
          done(null, null, response);
        }
      }
    });
  }
}
