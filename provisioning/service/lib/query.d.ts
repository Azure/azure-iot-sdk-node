import { IndividualEnrollment, EnrollmentGroup, DeviceRegistrationState } from './interfaces';
import { ResultWithHttpResponse, HttpResponseCallback } from 'azure-iot-common';
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
export declare type QueryCallback = HttpResponseCallback<QueryResult>;
export declare class Query {
    continuationToken: string;
    hasMoreResults: boolean;
    private _executeQueryFn;
    constructor(executeQueryFn: (continuationToken: string, done: QueryCallback) => void);
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
}
