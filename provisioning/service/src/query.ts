// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { IndividualEnrollment, EnrollmentGroup, DeviceRegistrationState } from './interfaces';
import { ResultWithHttpResponse, HttpResponseCallback, httpCallbackToPromise } from 'azure-iot-common';

/**
 * The query result.
 */
export interface QueryResult {
  /**
   * The query result items, as a collection.
   */
  items: Array<IndividualEnrollment | EnrollmentGroup | DeviceRegistrationState>;
}

/**
 * A Json query request
 */
export interface QuerySpecification {
  /**
   * The query.
   */
  query: string;
}

export type QueryCallback = HttpResponseCallback<QueryResult>;

export class Query {
  continuationToken: string;
  hasMoreResults: boolean;

  private _executeQueryFn: (continuationToken: string, done: QueryCallback) => void;

  constructor(executeQueryFn: (continuationToken: string, done: QueryCallback) => void) {
    if (!executeQueryFn) throw new ReferenceError('executeQueryFn cannot be \'' + executeQueryFn + '\'');
    if (typeof executeQueryFn !== 'function') throw new TypeError('executeQueryFn cannot be \'' + typeof executeQueryFn + '\'');

    this._executeQueryFn = executeQueryFn;
    this.hasMoreResults = true;
    this.continuationToken = null;
  }

  /**
   * @method              module:azure-iot-provisioning-service.Query#next
   * @description         Gets the next page of results for this query.
   * @param {string}      continuationToken    Continuation Token used for paging through results (optional)
   * @param {Function}    [done]               The optional callback that will be called with either an Error object or
   *                                           the results of the query.
   * @returns {Promise<ResultWithHttpResponse<QueryResult>> | void} Promise if no callback function was passed, void otherwise.
   */
  next(done: QueryCallback): void;
  next(continuationToken: string, done: QueryCallback): void;
  next(): Promise<ResultWithHttpResponse<QueryResult>>;
  next(continuationToken: string): Promise<ResultWithHttpResponse<QueryResult>>;
  next(continuationTokenOrCallback?: string | QueryCallback, done?: QueryCallback): Promise<ResultWithHttpResponse<QueryResult>> | void {
    const callback = done || ((typeof continuationTokenOrCallback === 'function') ? continuationTokenOrCallback : undefined);

    return httpCallbackToPromise((_callback) => {
      let actualContinuationToken = this.continuationToken;
      let actualCallback: QueryCallback;

      if (typeof continuationTokenOrCallback === 'function' && !done) {
        actualCallback = continuationTokenOrCallback as QueryCallback;
      } else {
        actualContinuationToken = continuationTokenOrCallback as string;
        actualCallback = done as QueryCallback;
      }

      this._executeQueryFn(actualContinuationToken, (err, result, response) => {
        if (err) {
          actualCallback(err);
        } else {
          this.continuationToken = response.headers['x-ms-continuation'] as string;
          this.hasMoreResults = this.continuationToken !== undefined;

          /*Codes_SRS_NODE_SERVICE_QUERY_16_007: [The `next` method shall call the `done` callback with a `null` error object, the results of the query and the response of the underlying transport if the request was successful.]*/
          actualCallback(null, result, response);
        }
      });
    }, callback as QueryCallback);
  }
}
