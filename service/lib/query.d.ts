import { Twin } from './twin';
import { Registry } from './registry';
import { IncomingMessageCallback, ResultWithIncomingMessage } from './interfaces';
/**
 * Constructs a Query object that provides APIs to trigger the execution of a device query.
 * SDK users should create queries using the {@link azure-iothub.JobClient.createQuery} and {@link azure-iothub.Registry.createQuery} APIs
 * and should not try to instantiate this class directly.
 */
export declare class Query {
    /**
     * Token used to iterate over multiple pages of results.
     */
    continuationToken: string;
    /**
     * Boolean indicating whether there are more results pages.
     */
    hasMoreResults: boolean;
    private _registry;
    private _executeQueryFn;
    /**
     * @private
     * @constructor
     * @param {Function}       executeQueryFn  The function that should be called to get a new page.
     * @param {Registry}       registry        [optional] Registry client used to create Twin objects (used in nextAsTwin()).
     */
    constructor(executeQueryFn: (continuationToken: string, done: IncomingMessageCallback<any>) => void, registry?: Registry);
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
}
