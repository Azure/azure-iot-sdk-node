// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var twin_1 = require("./twin");
var interfaces_1 = require("./interfaces");
var azure_iot_common_1 = require("azure-iot-common");
/**
 * Constructs a Query object that provides APIs to trigger the execution of a device query.
 * SDK users should create queries using the {@link azure-iothub.JobClient.createQuery} and {@link azure-iothub.Registry.createQuery} APIs
 * and should not try to instantiate this class directly.
 */
var Query = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param {Function}       executeQueryFn  The function that should be called to get a new page.
     * @param {Registry}       registry        [optional] Registry client used to create Twin objects (used in nextAsTwin()).
     */
    function Query(executeQueryFn, registry) {
        if (!executeQueryFn)
            throw new ReferenceError('executeQueryFn cannot be \'' + executeQueryFn + '\'');
        if (typeof executeQueryFn !== 'function')
            throw new TypeError('executeQueryFn cannot be \'' + typeof executeQueryFn + '\'');
        this._executeQueryFn = executeQueryFn;
        this._registry = registry;
        this.hasMoreResults = true;
        this.continuationToken = null;
    }
    Query.prototype.next = function (continuationTokenOrCallback, done) {
        var _this = this;
        var actualContinuationToken = this.continuationToken;
        var actualCallback;
        /*Codes_SRS_NODE_SERVICE_QUERY_16_016: [If `continuationToken` is a function and `done` is undefined the `next` method shall assume that `continuationToken` is actually the callback and us it as such (see requirements associated with the `done` parameter)]*/
        if (typeof continuationTokenOrCallback === 'function' && !done) {
            actualCallback = continuationTokenOrCallback;
        }
        else {
            /*Codes_SRS_NODE_SERVICE_QUERY_16_017: [the `next` method shall use the `continuationToken` passed as argument instead of its own property `Query.continuationToken` if it's not falsy.]*/
            actualContinuationToken = continuationTokenOrCallback;
            actualCallback = done;
        }
        return azure_iot_common_1.tripleValueCallbackToPromise(function (_callback) {
            _this._executeQueryFn(actualContinuationToken, function (err, result, response) {
                if (err) {
                    /*Codes_SRS_NODE_SERVICE_QUERY_16_008: [The `next` method shall call the `_callback` callback with a single argument that is an instance of the standard Javascript `Error` object if the request failed.]*/
                    _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_SERVICE_QUERY_16_006: [The `next` method shall set the `Query.continuationToken` property to the `continuationToken` value of the query result.]*/
                    _this.continuationToken = response.headers['x-ms-continuation'];
                    /*Codes_SRS_NODE_SERVICE_QUERY_16_013: [The `next` method shall set the `Query.hasMoreResults` property to `true` if the `continuationToken` property of the result object is not `null`.]*/
                    /*Codes_SRS_NODE_SERVICE_QUERY_16_014: [The `next` method shall set the `Query.hasMoreResults` property to `false` if the `continuationToken` property of the result object is `null`.]*/
                    _this.hasMoreResults = _this.continuationToken !== undefined;
                    /*Codes_SRS_NODE_SERVICE_QUERY_16_007: [The `next` method shall call the `_callback` callback with a `null` error object, the results of the query and the response of the underlying transport if the request was successful.]*/
                    _callback(null, result, response);
                }
            });
        }, function (r, m) { return interfaces_1.createResultWithIncomingMessage(r, m); }, actualCallback);
    };
    Query.prototype.nextAsTwin = function (continuationToken, done) {
        var _this = this;
        /*Codes_SRS_NODE_SERVICE_QUERY_16_016: [If `continuationToken` is a function and `_callback` is undefined the `next` method shall assume that `continuationToken` is actually the callback and us it as such (see requirements associated with the `done` parameter)]*/
        if (typeof continuationToken === 'function' && !done) {
            done = continuationToken;
            continuationToken = null;
        }
        return azure_iot_common_1.tripleValueCallbackToPromise(function (_callback) {
            var ct = continuationToken || _this.continuationToken;
            _this.next(ct, function (err, result, response) {
                if (err) {
                    /*Codes_SRS_NODE_SERVICE_QUERY_16_008: [The `next` method shall call the `_callback` callback with a single argument that is an instance of the standard Javascript `Error` object if the request failed.]*/
                    _callback(err);
                }
                else {
                    if (result) {
                        /*SRS_NODE_SERVICE_QUERY_16_009: [The `nextAsTwin` method shall call the `_callback` callback with a `null` error object and a collection of `Twin` objects created from the results of the query if the request was successful.]*/
                        var twins = result.map(function (twinJson) {
                            return new twin_1.Twin(twinJson, _this._registry);
                        });
                        _callback(null, twins, response);
                    }
                    else {
                        /*Codes_SRS_NODE_SERVICE_QUERY_16_007: [The `next` method shall call the `_callback` callback with a `null` error object, the results of the query and the response of the underlying transport if the request was successful.]*/
                        _callback(null, null, response);
                    }
                }
            });
        }, function (r, m) { return interfaces_1.createResultWithIncomingMessage(r, m); }, done);
    };
    return Query;
}());
exports.Query = Query;
//# sourceMappingURL=query.js.map