// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var Query = /** @class */ (function () {
    function Query(executeQueryFn) {
        if (!executeQueryFn)
            throw new ReferenceError('executeQueryFn cannot be \'' + executeQueryFn + '\'');
        if (typeof executeQueryFn !== 'function')
            throw new TypeError('executeQueryFn cannot be \'' + typeof executeQueryFn + '\'');
        this._executeQueryFn = executeQueryFn;
        this.hasMoreResults = true;
        this.continuationToken = null;
    }
    Query.prototype.next = function (continuationTokenOrCallback, done) {
        var _this = this;
        var callback = done || ((typeof continuationTokenOrCallback === 'function') ? continuationTokenOrCallback : undefined);
        return azure_iot_common_1.httpCallbackToPromise(function (_callback) {
            var actualContinuationToken = _this.continuationToken;
            var actualCallback;
            if (typeof continuationTokenOrCallback === 'function' && !done) {
                actualCallback = continuationTokenOrCallback;
            }
            else {
                actualContinuationToken = continuationTokenOrCallback;
                actualCallback = done;
            }
            _this._executeQueryFn(actualContinuationToken, function (err, result, response) {
                if (err) {
                    actualCallback(err);
                }
                else {
                    _this.continuationToken = response.headers['x-ms-continuation'];
                    _this.hasMoreResults = _this.continuationToken !== undefined;
                    /*Codes_SRS_NODE_SERVICE_QUERY_16_007: [The `next` method shall call the `done` callback with a `null` error object, the results of the query and the response of the underlying transport if the request was successful.]*/
                    actualCallback(null, result, response);
                }
            });
        }, callback);
    };
    return Query;
}());
exports.Query = Query;
//# sourceMappingURL=query.js.map