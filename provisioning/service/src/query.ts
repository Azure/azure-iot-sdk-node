// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Enrollment, EnrollmentGroup, DeviceRegistrationStatus } from './interfaces';

/**
 * The query result.
 */
export interface ProvisioningServiceQueryResult {
    /**
     * The query result items, as a collection.
     */
    items: Array<Enrollment | EnrollmentGroup | DeviceRegistrationStatus>;
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

export type ProvisioningServiceQueryCallback = (err?: Error, result?: ProvisioningServiceQueryResult, response?: any) => void;

export class ProvisioningServiceQuery {
  continuationToken: string;
  hasMoreResults: boolean;

  private _executeQueryFn: (continuationToken: string, done: ProvisioningServiceQueryCallback) => void;

  constructor(executeQueryFn: (continuationToken: string, done: ProvisioningServiceQueryCallback) => void) {
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
   * @param {Function}    done                 The callback that will be called with either an Error object or
   *                                           the results of the query.
   */
  next(continuationTokenOrCallback: string | ProvisioningServiceQueryCallback, done?: ProvisioningServiceQueryCallback): void {
    let actualContinuationToken = this.continuationToken;
    let actualCallback: ProvisioningServiceQueryCallback;

    if (typeof continuationTokenOrCallback === 'function' && !done) {
      actualCallback = continuationTokenOrCallback as ProvisioningServiceQueryCallback;
    } else {
      actualContinuationToken = continuationTokenOrCallback as string;
      actualCallback = done as ProvisioningServiceQueryCallback;
    }

    this._executeQueryFn(actualContinuationToken, (err, result, response) => {
      if (err) {
        actualCallback(err);
      } else {
        this.continuationToken = response.headers['x-ms-continuation'];
        this.hasMoreResults = this.continuationToken !== undefined;

        /*Codes_SRS_NODE_SERVICE_QUERY_16_007: [The `next` method shall call the `done` callback with a `null` error object, the results of the query and the response of the underlying transport if the request was successful.]*/
        actualCallback(null, result, response);
      }
    });
  }
}
