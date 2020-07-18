// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var https_1 = require("https");
var azure_iot_common_1 = require("azure-iot-common");
var ConnectionString = require("./connection_string");
var SharedAccessSignature = require("./shared_access_signature");
var azure_iot_http_base_1 = require("azure-iot-http-base");
var device_method_1 = require("./device_method");
var query_1 = require("./query");
var azure_iot_common_2 = require("azure-iot-common");
// tslint:disable-next-line:no-var-requires
var packageJson = require('../package.json');
/**
 * Provides methods to create, update, monitor and cancel long-running jobs on an IoT Hub instance, as well as query existing jobs.
 * The Jobs API in Azure IoT Hub allows to schedule direct method calls and twin updates on multiple devices.
 *
 * SDK users are expected to create {@link azure-iothub.JobClient} instances using the factory methods {@link azure-iothub.JobClient.fromConnectionString} and {@link azure-iothub.JobClient.fromSharedAccessSignature}.
 */
var JobClient = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param {RestApiClient}     restApiClient   The HTTP registry client used to execute REST API calls.@constructor
     * @throws {ReferenceError}   If the restApiClient argument is falsy.
     */
    function JobClient(restApiClient) {
        /*Codes_SRS_NODE_JOB_CLIENT_16_001: [The `JobClient` constructor shall throw a `ReferenceError` if `restApiClient` is falsy.]*/
        if (!restApiClient)
            throw new ReferenceError('restApiClient cannot be \'' + restApiClient + '\'');
        this._restApiClient = restApiClient;
        if (this._restApiClient.setOptions) {
            this._restApiClient.setOptions({ http: { agent: new https_1.Agent({ keepAlive: true }) } });
        }
    }
    JobClient.prototype.getJob = function (jobId, done) {
        var _this = this;
        /*Codes_SRS_NODE_JOB_CLIENT_16_006: [The `getJob` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
        return azure_iot_common_2.tripleValueCallbackToPromise(function (_callback) {
            if (jobId === undefined || jobId === null || jobId === '')
                throw new ReferenceError('jobId cannot be \'' + jobId + '\'');
            /*Codes_SRS_NODE_JOB_CLIENT_16_007: [The `getJob` method shall construct the HTTP request as follows:
            ```
            GET /jobs/v2/<jobId>?api-version=<version>
            Authorization: <config.sharedAccessSignature>
            Content-Type: application/json; charset=utf-8
            Request-Id: <guid>
            User-Agent: <sdk-name>/<sdk-version>
            ```]*/
            var path = '/jobs/v2/' + jobId + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, _callback);
        }, createJobStatusResponse, done);
    };
    /**
     * @method            module:azure-iothub.JobClient#createQuery
     * @description       Creates a query that can be used to return pages of existing job based on type and status.
     *
     * @param {String}    jobType     The type that should be used to filter results.
     * @param {String}    jobStatus   The status that should be used to filter results.
     * @param {Number}    pageSize    The number of elements to return per page.
     */
    JobClient.prototype.createQuery = function (jobType, jobStatus, pageSize) {
        return new query_1.Query(this._getJobsFunc(jobType, jobStatus, pageSize));
    };
    JobClient.prototype.cancelJob = function (jobId, done) {
        var _this = this;
        /*Codes_SRS_NODE_JOB_CLIENT_16_008: [The `cancelJob` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
        return azure_iot_common_2.tripleValueCallbackToPromise(function (_callback) {
            if (jobId === undefined || jobId === null || jobId === '')
                throw new ReferenceError('jobId cannot be \'' + jobId + '\'');
            /*Codes_SRS_NODE_JOB_CLIENT_16_009: [The `cancelJob` method shall construct the HTTP request as follows:
            ```
            POST /jobs/v2/<jobId>/cancel?api-version=<version>
            Authorization: <config.sharedAccessSignature>
            Content-Type: application/json; charset=utf-8
            Request-Id: <guid>
            User-Agent: <sdk-name>/<sdk-version>
            ```]*/
            var path = '/jobs/v2/' + jobId + '/cancel' + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('POST', path, null, null, _callback);
        }, createJobStatusResponse, done);
    };
    JobClient.prototype.scheduleDeviceMethod = function (jobId, queryCondition, methodParams, jobStartTime, maxExecutionTimeInSeconds, done) {
        var _this = this;
        var callback = (typeof jobStartTime === 'function') ? jobStartTime : ((typeof maxExecutionTimeInSeconds === 'function') ? maxExecutionTimeInSeconds : done);
        return azure_iot_common_2.tripleValueCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_JOB_CLIENT_16_013: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
            if (jobId === undefined || jobId === null || jobId === '')
                throw new ReferenceError('jobId cannot be \'' + jobId + '\'');
            /*Codes_SRS_NODE_JOB_CLIENT_16_014: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `queryCondition` is falsy.]*/
            if (!queryCondition)
                throw new ReferenceError('queryCondition cannot be \'' + queryCondition + '\'');
            /*Codes_SRS_NODE_JOB_CLIENT_16_029: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `methodParams` is falsy.*/
            if (!methodParams)
                throw new ReferenceError('methodParams cannot be \'' + methodParams + '\'');
            /*Codes_SRS_NODE_JOB_CLIENT_16_015: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `methodParams.methodName` is `null`, `undefined` or an empty string.]*/
            if (methodParams.methodName === undefined || methodParams.methodName === null || methodParams.methodName === '')
                throw new ReferenceError('methodParams.methodName cannot be \'' + methodParams.methodName + '\'');
            /*Codes_SRS_NODE_JOB_CLIENT_16_018: [If `jobStartTime` is a function, `jobStartTime` shall be considered the callback and a `TypeError` shall be thrown if `maxExecutionTimeInSeconds` and/or `_callback` are not `undefined`.]*/
            if (typeof jobStartTime === 'function') {
                if (maxExecutionTimeInSeconds || done) {
                    throw new TypeError('The callback must be the last parameter');
                }
                else {
                    _callback = jobStartTime;
                    jobStartTime = null;
                    maxExecutionTimeInSeconds = null;
                }
                /*Codes_SRS_NODE_JOB_CLIENT_16_019: [If `maxExecutionTimeInSeconds` is a function, `maxExecutionTimeInSeconds` shall be considered the callback and a `TypeError` shall be thrown if `_callback` is not `undefined`.]*/
            }
            else if (typeof maxExecutionTimeInSeconds === 'function') {
                if (done) {
                    throw new TypeError('The callback must be the last parameter');
                }
                else {
                    _callback = maxExecutionTimeInSeconds;
                    maxExecutionTimeInSeconds = null;
                }
            }
            /*Codes_SRS_NODE_JOB_CLIENT_16_030: [The `scheduleDeviceMethod` method shall use the `DeviceMethod.defaultPayload` value if `methodParams.payload` is `undefined`.]*/
            /*Codes_SRS_NODE_JOB_CLIENT_16_031: [The `scheduleDeviceMethod` method shall use the `DeviceMethod.defaultTimeout` value if `methodParams.responseTimeoutInSeconds` is falsy.]*/
            var fullMethodParams = {
                methodName: methodParams.methodName,
                payload: methodParams.payload || device_method_1.DeviceMethod.defaultPayload,
                responseTimeoutInSeconds: methodParams.responseTimeoutInSeconds || device_method_1.DeviceMethod.defaultResponseTimeout
            };
            /*Codes_SRS_NODE_JOB_CLIENT_16_020: [The `scheduleDeviceMethod` method shall construct the HTTP request as follows:
            ```
            PUT /jobs/v2/<jobId>?api-version=<version>
            Authorization: <config.sharedAccessSignature>
            Content-Type: application/json; charset=utf-8
            Request-Id: <guid>
            User-Agent: <sdk-name>/<sdk-version>
      
            {
              jobId: '<jobId>',
              type: 'scheduleDirectRequest', // TBC
              cloudToDeviceMethod: {
                methodName: '<methodName>',
                payload: <payload>,           // valid JSON object
                timeoutInSeconds: methodTimeoutInSeconds // Number
              },
              queryCondition: '<queryCondition>', // if the query parameter is a string
              startTime: <jobStartTime>,          // as an ISO-8601 date string
              maxExecutionTimeInSeconds: <maxExecutionTimeInSeconds>        // format TBD
            }
            ```]*/
            var jobDesc = {
                jobId: jobId,
                type: 'scheduleDeviceMethod',
                cloudToDeviceMethod: fullMethodParams,
                startTime: jobStartTime ? jobStartTime.toISOString() : null,
                maxExecutionTimeInSeconds: maxExecutionTimeInSeconds
            };
            if (typeof queryCondition === 'string') {
                jobDesc.queryCondition = queryCondition;
            }
            else {
                throw new TypeError('queryCondition must be a sql WHERE clause string');
            }
            _this._scheduleJob(jobDesc, _callback);
        }, createJobStatusResponse, callback);
    };
    JobClient.prototype.scheduleTwinUpdate = function (jobId, queryCondition, patch, jobStartTime, maxExecutionTimeInSeconds, done) {
        var _this = this;
        var callback = (typeof jobStartTime === 'function') ? jobStartTime : ((typeof maxExecutionTimeInSeconds === 'function') ? maxExecutionTimeInSeconds : done);
        return azure_iot_common_2.tripleValueCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_JOB_CLIENT_16_021: [The `scheduleTwinUpdate` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
            if (jobId === undefined || jobId === null || jobId === '')
                throw new ReferenceError('jobId cannot be \'' + jobId + '\'');
            /*Codes_SRS_NODE_JOB_CLIENT_16_022: [The `scheduleTwinUpdate` method shall throw a `ReferenceError` if `query` is falsy.]*/
            if (!queryCondition)
                throw new ReferenceError('queryCondition cannot be \'' + queryCondition + '\'');
            /*Codes_SRS_NODE_JOB_CLIENT_16_023: [The `scheduleTwinUpdate` method shall throw a `ReferenceError` if `patch` is falsy.]*/
            if (!patch)
                throw new ReferenceError('patch cannot be \'' + patch + '\'');
            /*Codes_SRS_NODE_JOB_CLIENT_16_024: [If `jobStartTime` is a function, `jobStartTime` shall be considered the callback and a `TypeError` shall be thrown if `maxExecutionTimeInSeconds` and/or `_callback` are not `undefined`.]*/
            if (typeof jobStartTime === 'function') {
                if (maxExecutionTimeInSeconds || done) {
                    throw new TypeError('The callback must be the last parameter');
                }
                else {
                    _callback = jobStartTime;
                    jobStartTime = null;
                    maxExecutionTimeInSeconds = null;
                }
                /*Codes_SRS_NODE_JOB_CLIENT_16_025: [If `maxExecutionTimeInSeconds` is a function, `maxExecutionTimeInSeconds` shall be considered the callback and a `TypeError` shall be thrown if `_callback` is not `undefined`.]*/
            }
            else if (typeof maxExecutionTimeInSeconds === 'function') {
                if (done) {
                    throw new TypeError('The callback must be the last parameter');
                }
                else {
                    _callback = maxExecutionTimeInSeconds;
                    maxExecutionTimeInSeconds = null;
                }
            }
            var jobDesc = {
                jobId: jobId,
                type: 'scheduleUpdateTwin',
                updateTwin: patch,
                startTime: jobStartTime ? jobStartTime.toISOString() : null,
                maxExecutionTimeInSeconds: maxExecutionTimeInSeconds
            };
            if (typeof queryCondition === 'string') {
                jobDesc.queryCondition = queryCondition;
            }
            else {
                throw new TypeError('queryCondition must be a sql WHERE clause string');
            }
            /*Codes_SRS_NODE_JOB_CLIENT_16_026: [The `scheduleTwinUpdate` method shall construct the HTTP request as follows:
            ```
            PUT /jobs/v2/<jobId>?api-version=<version>
            Authorization: <config.sharedAccessSignature>
            Content-Type: application/json; charset=utf-8
            Request-Id: <guid>
            User-Agent: <sdk-name>/<sdk-version>
      
            {
              jobId: '<jobId>',
              type: 'scheduleTwinUpdate', // TBC
              updateTwin: <patch>                 // Valid JSON object
              queryCondition: '<queryCondition>', // if the query parameter is a string
              startTime: <jobStartTime>,          // as an ISO-8601 date string
              maxExecutionTimeInSeconds: <maxExecutionTimeInSeconds>        // format TBD
            }
            ```]*/
            _this._scheduleJob(jobDesc, _callback);
        }, createJobStatusResponse, callback);
    };
    JobClient.prototype._getJobsFunc = function (jobType, jobStatus, pageSize) {
        var _this = this;
        /*Codes_SRS_NODE_JOB_CLIENT_16_035: [The `_getJobsFunc` function shall return a function that can be used by the `Query` object to get a new page of results]*/
        return function (continuationToken, done) {
            /*Codes_SRS_NODE_JOB_CLIENT_16_012: [The `_getJobsFunc` method shall construct the HTTP request as follows:
            ```
            GET /jobs/v2/query?api-version=<version>[&jobType=<jobType>][&jobStatus=<jobStatus>][&pageSize=<pageSize>][&continuationToken=<continuationToken>]
            Authorization: <config.sharedAccessSignature>
            Content-Type: application/json; charset=utf-8
            Request-Id: <guid>
            User-Agent: <sdk-name>/<sdk-version>
            ```]*/
            var jobStatusQueryParam = jobStatus ? '&jobStatus=' + encodeURIComponent(jobStatus) : '';
            var jobTypeQueryParam = jobType ? '&jobType=' + encodeURIComponent(jobType) : '';
            var path = '/jobs/v2/query' + azure_iot_common_1.endpoint.versionQueryString() + jobStatusQueryParam + jobTypeQueryParam;
            var headers = {};
            if (continuationToken) {
                headers['x-ms-continuation'] = continuationToken;
            }
            if (pageSize) {
                headers['x-ms-max-item-count'] = pageSize;
            }
            _this._restApiClient.executeApiCall('GET', path, headers, null, done);
        };
    };
    JobClient.prototype._scheduleJob = function (jobDesc, done) {
        var path = '/jobs/v2/' + encodeURIComponent(jobDesc.jobId.toString()) + azure_iot_common_1.endpoint.versionQueryString();
        var headers = {
            'Content-Type': 'application/json; charset=utf-8'
        };
        /*Codes_SRS_NODE_JOB_CLIENT_16_027: [The method shall call the `done` callback with a single argument that is a standard Javascript `Error` object if the request failed.]*/
        /*Codes_SRS_NODE_JOB_CLIENT_16_028: [The method shall call the `done` callback with a `null` error argument, a result and a transport-specific response object if the request was successful.]*/
        this._restApiClient.executeApiCall('PUT', path, headers, jobDesc, done);
    };
    /**
     * @method          module:azure-iothub.JobClient.fromConnectionString
     * @description     Constructs a JobClient object from the given connection string.
     * @static
     *
     * @param   {String}          connectionString       A connection string which encapsulates the
     *                                                   appropriate (read and/or write) Registry
     *                                                   permissions.
     *
     * @throws  {ReferenceError}  If the connectionString argument is falsy.
     *
     * @returns {module:azure-iothub.JobClient}
     */
    JobClient.fromConnectionString = function (connectionString) {
        /*Codes_SRS_NODE_JOB_CLIENT_16_002: [The `fromConnectionString` method shall throw a `ReferenceError` if `connectionString` is falsy.]*/
        if (!connectionString)
            throw new ReferenceError('connectionString cannot be \'' + connectionString + '\'');
        var cn = ConnectionString.parse(connectionString);
        var sas = SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, azure_iot_common_1.anHourFromNow());
        var config = {
            host: cn.HostName,
            sharedAccessSignature: sas.toString()
        };
        /*Codes_SRS_NODE_JOB_CLIENT_16_003: [The `fromConnectionString` method shall return a new `JobClient` instance.]*/
        return new JobClient(new azure_iot_http_base_1.RestApiClient(config, packageJson.name + '/' + packageJson.version));
    };
    /**
     * @method            module:azure-iothub.JobClient.fromSharedAccessSignature
     * @description       Constructs a JobClient object from the given shared access signature.
     * @static
     *
     * @param {String}    sharedAccessSignature     A shared access signature which encapsulates
     *                                              the appropriate (read and/or write) Registry
     *                                              permissions.
     *
     * @throws  {ReferenceError}  If the sharedAccessSignature argument is falsy.
     *
     * @returns {module:azure-iothub.JobClient}
     */
    JobClient.fromSharedAccessSignature = function (sharedAccessSignature) {
        /*Codes_SRS_NODE_JOB_CLIENT_16_004: [The `fromSharedAccessSignature` method shall throw a `ReferenceError` if `sharedAccessSignature` is falsy.]*/
        if (!sharedAccessSignature)
            throw new ReferenceError('sharedAccessSignature cannot be \'' + sharedAccessSignature + '\'');
        var sas = SharedAccessSignature.parse(sharedAccessSignature);
        var config = {
            host: sas.sr,
            sharedAccessSignature: sharedAccessSignature
        };
        /*Codes_SRS_NODE_JOB_CLIENT_16_005: [The `fromSharedAccessSignature` method shall return a new `JobClient` instance.]*/
        return new JobClient(new azure_iot_http_base_1.RestApiClient(config, packageJson.name + '/' + packageJson.version));
    };
    return JobClient;
}());
exports.JobClient = JobClient;
function createJobStatusResponse(jobStatus, response) {
    return { jobStatus: jobStatus, response: response };
}
exports.createJobStatusResponse = createJobStatusResponse;
//# sourceMappingURL=job_client.js.map