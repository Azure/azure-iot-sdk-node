// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Agent } from 'https';
import { endpoint } from 'azure-iot-common';
import * as ConnectionString from './connection_string';
import * as SharedAccessSignature from './shared_access_signature';
import { RestApiClient } from 'azure-iot-http-base';
import { DeviceMethod } from './device_method';
import { Query } from './query';
import { DeviceMethodParams } from './interfaces';
import { TripleValueCallback, tripleValueCallbackToPromise } from 'azure-iot-common';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

const defaultMaxExecutionTimeInSeconds = 3600;

export type JobType = 'scheduleUpdateTwin' | 'scheduleDeviceMethod';
export type JobStatus = 'queued' | 'scheduled' | 'running' | 'cancelled' | 'finished';

/**
 * @private
 */
export interface JobDescription {
  jobId: string | number;
  type: JobType;
  queryCondition?: string;
  updateTwin?: any;
  cloudToDeviceMethod?: DeviceMethodParams;
  startTime: string;
  maxExecutionTimeInSeconds: number;
}

/**
 * Provides methods to create, update, monitor and cancel long-running jobs on an IoT Hub instance, as well as query existing jobs.
 * The Jobs API in Azure IoT Hub allows to schedule direct method calls and twin updates on multiple devices.
 *
 * SDK users are expected to create {@link azure-iothub.JobClient} instances using the factory methods {@link azure-iothub.JobClient.fromConnectionString} and {@link azure-iothub.JobClient.fromSharedAccessSignature}.
 */
export class JobClient {
  private _restApiClient: RestApiClient;

  /**
   * @private
   * @constructor
   * @param {RestApiClient}     restApiClient   The HTTP registry client used to execute REST API calls.@constructor
   * @throws {ReferenceError}   If the restApiClient argument is falsy.
   */
  constructor(restApiClient: RestApiClient) {
    /*Codes_SRS_NODE_JOB_CLIENT_16_001: [The `JobClient` constructor shall throw a `ReferenceError` if `restApiClient` is falsy.]*/
    if (!restApiClient) throw new ReferenceError('restApiClient cannot be \'' + restApiClient + '\'');
    this._restApiClient = restApiClient;
    if (this._restApiClient.setOptions) {
      this._restApiClient.setOptions({ http: { agent: new Agent({ keepAlive: true }) } });
    }
  }

  /**
   * @method            module:azure-iothub.JobClient#getJob
   * @description       Requests information about an existing job.
   *
   * @param {String}    jobId       The identifier of an existing job.
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                job object, and a transport-specific response
   *                                object useful for logging or debugging.
   * @returns {Promise<JobStatusResponse>> | void} Promise if no callback function was passed, void otherwise.
   */
  getJob(jobId: string | number, done: TripleValueCallback<any, any>): void;
  getJob(jobId: string | number): Promise<JobStatusResponse>;
  getJob(jobId: string | number, done?: TripleValueCallback<any, any>): Promise<JobStatusResponse> | void {
    /*Codes_SRS_NODE_JOB_CLIENT_16_006: [The `getJob` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
    return tripleValueCallbackToPromise((_callback) => {
      if (jobId === undefined || jobId === null || jobId === '') throw new ReferenceError('jobId cannot be \'' + jobId + '\'');

      /*Codes_SRS_NODE_JOB_CLIENT_16_007: [The `getJob` method shall construct the HTTP request as follows:
      ```
      GET /jobs/v2/<jobId>?api-version=<version>
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>
      User-Agent: <sdk-name>/<sdk-version>
      ```]*/
      const path = '/jobs/v2/' + jobId + endpoint.versionQueryString();
      this._restApiClient.executeApiCall('GET', path, null, null, _callback);
    }, createJobStatusResponse, done);
  }

  /**
   * @method            module:azure-iothub.JobClient#createQuery
   * @description       Creates a query that can be used to return pages of existing job based on type and status.
   *
   * @param {String}    jobType     The type that should be used to filter results.
   * @param {String}    jobStatus   The status that should be used to filter results.
   * @param {Number}    pageSize    The number of elements to return per page.
   */
  createQuery(jobType?: JobType, jobStatus?: JobStatus, pageSize?: number): Query {
    return new Query(this._getJobsFunc(jobType, jobStatus, pageSize));
  }

  /**
   * @method            module:azure-iothub.JobClient#cancelJob
   * @description       Cancels an existing job.
   *
   * @param {String}    jobId       The identifier of an existing job.
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                job object, and a transport-specific response
   *                                object useful for logging or debugging.
   * @returns {Promise<JobStatusResponse>> | void} Promise if no callback function was passed, void otherwise.
   */
  cancelJob(jobId: string | number, done: TripleValueCallback<any, any>): void;
  cancelJob(jobId: string | number): Promise<JobStatusResponse>;
  cancelJob(jobId: string | number, done?: TripleValueCallback<any, any>): Promise<JobStatusResponse> | void {
    /*Codes_SRS_NODE_JOB_CLIENT_16_008: [The `cancelJob` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
    return tripleValueCallbackToPromise((_callback) => {
      if (jobId === undefined || jobId === null || jobId === '') throw new ReferenceError('jobId cannot be \'' + jobId + '\'');

      /*Codes_SRS_NODE_JOB_CLIENT_16_009: [The `cancelJob` method shall construct the HTTP request as follows:
      ```
      POST /jobs/v2/<jobId>/cancel?api-version=<version>
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>
      User-Agent: <sdk-name>/<sdk-version>
      ```]*/
      const path = '/jobs/v2/' + jobId + '/cancel' + endpoint.versionQueryString();
      this._restApiClient.executeApiCall('POST', path, null, null, _callback);
    }, createJobStatusResponse, done);
  }

  /**
   * @method            module:azure-iothub.JobClient#scheduleDeviceMethod
   * @description       Schedules a job that will execute a device method on a set of devices.
   *
   * @param {String}    jobId             The unique identifier that should be used for this job.
   * @param {String}    queryCondition    A SQL query WHERE clause used to compute the list of devices
   *                                      on which this job should be run.
   * @param {Object}    methodParams      An object describing the method and shall have the following properties:
   *                                      - methodName          The name of the method that shall be invoked.
   *                                      - payload             [optional] The payload to use for the method call.
   *                                      - responseTimeoutInSeconds [optional] The number of seconds IoT Hub shall wait for the device
   * @param {Date}      [jobStartTime]      Time time at which the job should start
   * @param {Number}    [maxExecutionTimeInSeconds]  The maximum time alloted for this job to run in seconds.
   * @param {Function}  [done]            The optional function to call when the operation is
   *                                      complete. `done` will be called with three
   *                                      arguments: an Error object (can be null), a
   *                                      job object, and a transport-specific response
   *                                      object useful for logging or debugging.
   * @returns {Promise<JobStatusResponse>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}   If one or more of the jobId, queryCondition or methodParams arguments are falsy.
   * @throws {ReferenceError}   If methodParams.methodName is falsy.
   * @throws {TypeError}        If the callback is not the last parameter
   */
  scheduleDeviceMethod(jobId: string | number, queryCondition: string, methodParams: DeviceMethodParams, jobStartTime: Date, maxExecutionTimeInSeconds: number, done: TripleValueCallback<any, any>): void;
  scheduleDeviceMethod(jobId: string | number, queryCondition: string, methodParams: DeviceMethodParams, jobStartTime: Date, done: TripleValueCallback<any, any>): void;
  scheduleDeviceMethod(jobId: string | number, queryCondition: string, methodParams: DeviceMethodParams, done: TripleValueCallback<any, any>): void;
  scheduleDeviceMethod(jobId: string | number, queryCondition: string, methodParams: DeviceMethodParams, jobStartTime: Date, maxExecutionTimeInSeconds: number): Promise<JobStatusResponse>;
  scheduleDeviceMethod(jobId: string | number, queryCondition: string, methodParams: DeviceMethodParams, jobStartTime: Date): Promise<JobStatusResponse>;
  scheduleDeviceMethod(jobId: string | number, queryCondition: string, methodParams: DeviceMethodParams): Promise<JobStatusResponse>;
  scheduleDeviceMethod(jobId: string | number, queryCondition: string, methodParams: DeviceMethodParams, jobStartTime?: Date | TripleValueCallback<any, any>, maxExecutionTimeInSeconds?: number | TripleValueCallback<any, any>, done?: TripleValueCallback<any, any>): Promise<JobStatusResponse> | void {
    const callback = (typeof jobStartTime === 'function') ? jobStartTime as TripleValueCallback<any, any> : ((typeof maxExecutionTimeInSeconds === 'function') ? maxExecutionTimeInSeconds as TripleValueCallback<any, any> : done);

    return tripleValueCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_JOB_CLIENT_16_013: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
      if (jobId === undefined || jobId === null || jobId === '') throw new ReferenceError('jobId cannot be \'' + jobId + '\'');
      /*Codes_SRS_NODE_JOB_CLIENT_16_014: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `queryCondition` is falsy.]*/
      if (!queryCondition) throw new ReferenceError('queryCondition cannot be \'' + queryCondition + '\'');

      /*Codes_SRS_NODE_JOB_CLIENT_16_029: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `methodParams` is falsy.*/
      if (!methodParams) throw new ReferenceError('methodParams cannot be \'' + methodParams + '\'');

      /*Codes_SRS_NODE_JOB_CLIENT_16_015: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `methodParams.methodName` is `null`, `undefined` or an empty string.]*/
      if (methodParams.methodName === undefined || methodParams.methodName === null || methodParams.methodName === '') throw new ReferenceError('methodParams.methodName cannot be \'' + methodParams.methodName + '\'');

      /*Codes_SRS_NODE_JOB_CLIENT_16_018: [If `jobStartTime` is a function, `jobStartTime` shall be considered the callback and a `TypeError` shall be thrown if `maxExecutionTimeInSeconds` and/or `_callback` are not `undefined`.]*/
      if (typeof jobStartTime === 'function') {
        if (maxExecutionTimeInSeconds || done) {
          throw new TypeError('The callback must be the last parameter');
        } else {
          _callback = jobStartTime;
          jobStartTime = new Date();
          maxExecutionTimeInSeconds = defaultMaxExecutionTimeInSeconds;
        }
        /*Codes_SRS_NODE_JOB_CLIENT_16_019: [If `maxExecutionTimeInSeconds` is a function, `maxExecutionTimeInSeconds` shall be considered the callback and a `TypeError` shall be thrown if `_callback` is not `undefined`.]*/
      } else if (typeof maxExecutionTimeInSeconds === 'function') {
        if (done) {
          throw new TypeError('The callback must be the last parameter');
        } else {
          _callback = maxExecutionTimeInSeconds;
          maxExecutionTimeInSeconds = defaultMaxExecutionTimeInSeconds;
        }
      }

      /*Codes_SRS_NODE_JOB_CLIENT_16_030: [The `scheduleDeviceMethod` method shall use the `DeviceMethod.defaultPayload` value if `methodParams.payload` is `undefined`.]*/
      /*Codes_SRS_NODE_JOB_CLIENT_16_031: [The `scheduleDeviceMethod` method shall use the `DeviceMethod.defaultTimeout` value if `methodParams.responseTimeoutInSeconds` is falsy.]*/
      const fullMethodParams: DeviceMethodParams = {
        methodName: methodParams.methodName,
        payload: methodParams.payload || DeviceMethod.defaultPayload,
        responseTimeoutInSeconds: methodParams.responseTimeoutInSeconds || DeviceMethod.defaultResponseTimeout
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
      let jobDesc: JobDescription = {
        jobId: jobId,
        type: 'scheduleDeviceMethod',
        cloudToDeviceMethod: fullMethodParams,
        startTime: jobStartTime ? (jobStartTime as Date).toISOString() : null,
        maxExecutionTimeInSeconds: maxExecutionTimeInSeconds as number
      };

      if (typeof queryCondition === 'string') {
        jobDesc.queryCondition = queryCondition;
      } else {
        throw new TypeError('queryCondition must be a sql WHERE clause string');
      }

      this._scheduleJob(jobDesc, _callback);
    }, createJobStatusResponse, callback);
  }

  /**
   * @method            module:azure-iothub.JobClient#scheduleTwinUpdate
   * @description       Schedule a job that will update a set of twins with the patch provided as a parameter.
   *
   * @param {String}    jobId             The unique identifier that should be used for this job.
   * @param {String}    queryCondition    A SQL query WHERE clause used to compute the list of devices
   *                                      on which this job should be run.
   * @param {Object}    patch             The twin patch that should be applied to the twins.
   * @param {Date}      [jobStartTime]      Time time at which the job should start
   * @param {Number}    [maxExecutionTimeInSeconds]  The maximum time alloted for this job to run in seconds.
   * @param {Function}  [done]            The optional function to call when the operation is
   *                                      complete. `done` will be called with three
   *                                      arguments: an Error object (can be null), a
   *                                      job object, and a transport-specific response
   *                                      object useful for logging or debugging.
   * @returns {Promise<JobStatusResponse>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}   If one or more of the jobId, queryCondition or patch arguments are falsy.
   * @throws {TypeError}        If the callback is not the last parameter
   */
  scheduleTwinUpdate(jobId: string | number, queryCondition: string, patch: any, jobStartTime: Date, maxExecutionTimeInSeconds: number, done: TripleValueCallback<any, any>): void;
  scheduleTwinUpdate(jobId: string | number, queryCondition: string, patch: any, jobStartTime: Date, done: TripleValueCallback<any, any>): void;
  scheduleTwinUpdate(jobId: string | number, queryCondition: string, patch: any, done: TripleValueCallback<any, any>): void;
  scheduleTwinUpdate(jobId: string | number, queryCondition: string, patch: any, jobStartTime: Date, maxExecutionTimeInSeconds?: number): Promise<JobStatusResponse>;
  scheduleTwinUpdate(jobId: string | number, queryCondition: string, patch: any, jobStartTime: Date): Promise<JobStatusResponse>;
  scheduleTwinUpdate(jobId: string | number, queryCondition: string, patch: any): Promise<JobStatusResponse>;
  scheduleTwinUpdate(jobId: string | number, queryCondition: string, patch: any, jobStartTime?: Date | TripleValueCallback<any, any>, maxExecutionTimeInSeconds?: number | TripleValueCallback<any, any>, done?: TripleValueCallback<any, any>): Promise<JobStatusResponse> | void {
    const callback = (typeof jobStartTime === 'function') ? jobStartTime as TripleValueCallback<any, any> : ((typeof maxExecutionTimeInSeconds === 'function') ? maxExecutionTimeInSeconds as TripleValueCallback<any, any> : done);

    return tripleValueCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_JOB_CLIENT_16_021: [The `scheduleTwinUpdate` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
      if (jobId === undefined || jobId === null || jobId === '') throw new ReferenceError('jobId cannot be \'' + jobId + '\'');
      /*Codes_SRS_NODE_JOB_CLIENT_16_022: [The `scheduleTwinUpdate` method shall throw a `ReferenceError` if `query` is falsy.]*/
      if (!queryCondition) throw new ReferenceError('queryCondition cannot be \'' + queryCondition + '\'');
      /*Codes_SRS_NODE_JOB_CLIENT_16_023: [The `scheduleTwinUpdate` method shall throw a `ReferenceError` if `patch` is falsy.]*/
      if (!patch) throw new ReferenceError('patch cannot be \'' + patch + '\'');

      /*Codes_SRS_NODE_JOB_CLIENT_16_024: [If `jobStartTime` is a function, `jobStartTime` shall be considered the callback and a `TypeError` shall be thrown if `maxExecutionTimeInSeconds` and/or `_callback` are not `undefined`.]*/
      if (typeof jobStartTime === 'function') {
        if (maxExecutionTimeInSeconds || done) {
          throw new TypeError('The callback must be the last parameter');
        } else {
          _callback = jobStartTime;
          jobStartTime = new Date();
          maxExecutionTimeInSeconds = defaultMaxExecutionTimeInSeconds;
        }
        /*Codes_SRS_NODE_JOB_CLIENT_16_025: [If `maxExecutionTimeInSeconds` is a function, `maxExecutionTimeInSeconds` shall be considered the callback and a `TypeError` shall be thrown if `_callback` is not `undefined`.]*/
      } else if (typeof maxExecutionTimeInSeconds === 'function') {
        if (done) {
          throw new TypeError('The callback must be the last parameter');
        } else {
          _callback = maxExecutionTimeInSeconds;
          maxExecutionTimeInSeconds = defaultMaxExecutionTimeInSeconds;
        }
      }

      let jobDesc: JobDescription = {
        jobId: jobId,
        type: 'scheduleUpdateTwin',
        updateTwin: patch,
        startTime: jobStartTime ? (jobStartTime as Date).toISOString() : null,
        maxExecutionTimeInSeconds: maxExecutionTimeInSeconds as number
      };

      if (typeof queryCondition === 'string') {
        jobDesc.queryCondition = queryCondition;
      } else {
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
      this._scheduleJob(jobDesc, _callback);
    }, createJobStatusResponse, callback);

  }

  private _getJobsFunc(jobType: JobType, jobStatus: JobStatus, pageSize: number): (continuationToken: string, done: TripleValueCallback<any, any>) => void {
    /*Codes_SRS_NODE_JOB_CLIENT_16_035: [The `_getJobsFunc` function shall return a function that can be used by the `Query` object to get a new page of results]*/
    return (continuationToken, done) => {
      /*Codes_SRS_NODE_JOB_CLIENT_16_012: [The `_getJobsFunc` method shall construct the HTTP request as follows:
      ```
      GET /jobs/v2/query?api-version=<version>[&jobType=<jobType>][&jobStatus=<jobStatus>][&pageSize=<pageSize>][&continuationToken=<continuationToken>]
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>
      User-Agent: <sdk-name>/<sdk-version>
      ```]*/
      const jobStatusQueryParam = jobStatus ? '&jobStatus=' + encodeURIComponent(jobStatus) : '';
      const jobTypeQueryParam = jobType ? '&jobType=' + encodeURIComponent(jobType) : '';
      const path = '/jobs/v2/query' + endpoint.versionQueryString() + jobStatusQueryParam + jobTypeQueryParam;

      let headers = {};
      if (continuationToken) {
        headers['x-ms-continuation'] = continuationToken;
      }

      if (pageSize) {
        headers['x-ms-max-item-count'] = pageSize;
      }

      this._restApiClient.executeApiCall('GET', path, headers, null, done);
    };
  }

  private _scheduleJob(jobDesc: JobDescription, done: TripleValueCallback<any, any>): void {
    const path = '/jobs/v2/' + encodeURIComponent(jobDesc.jobId.toString()) + endpoint.versionQueryString();
    const headers = {
      'Content-Type': 'application/json; charset=utf-8'
    };

    /*Codes_SRS_NODE_JOB_CLIENT_16_027: [The method shall call the `done` callback with a single argument that is a standard Javascript `Error` object if the request failed.]*/
    /*Codes_SRS_NODE_JOB_CLIENT_16_028: [The method shall call the `done` callback with a `null` error argument, a result and a transport-specific response object if the request was successful.]*/
    this._restApiClient.executeApiCall('PUT', path, headers, jobDesc, done);
  }

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
  static fromConnectionString(connectionString: string): JobClient {
    /*Codes_SRS_NODE_JOB_CLIENT_16_002: [The `fromConnectionString` method shall throw a `ReferenceError` if `connectionString` is falsy.]*/
    if (!connectionString) throw new ReferenceError('connectionString cannot be \'' + connectionString + '\'');
    const cn = ConnectionString.parse(connectionString);
    const config = {
      host: cn.HostName,
      sharedAccessSignature: SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, Date.now())
    };

    /*Codes_SRS_NODE_JOB_CLIENT_16_003: [The `fromConnectionString` method shall return a new `JobClient` instance.]*/
    return new JobClient(new RestApiClient(config, packageJson.name + '/' + packageJson.version));
  }

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
  static fromSharedAccessSignature(sharedAccessSignature: string): JobClient {
    /*Codes_SRS_NODE_JOB_CLIENT_16_004: [The `fromSharedAccessSignature` method shall throw a `ReferenceError` if `sharedAccessSignature` is falsy.]*/
    if (!sharedAccessSignature) throw new ReferenceError('sharedAccessSignature cannot be \'' + sharedAccessSignature + '\'');

    const sas = SharedAccessSignature.parse(sharedAccessSignature);
    const config = {
      host: sas.sr,
      sharedAccessSignature: sharedAccessSignature
    };

    /*Codes_SRS_NODE_JOB_CLIENT_16_005: [The `fromSharedAccessSignature` method shall return a new `JobClient` instance.]*/
    return new JobClient(new RestApiClient(config, packageJson.name + '/' + packageJson.version));
  }
}

export namespace JobClient {
  export type JobCallback = TripleValueCallback<any, any>; // (err: Error, jobStatus?: any, response?: any) => void;
}

export type JobStatusResponse = {
  jobStatus: any;
  response: any;
};

export function createJobStatusResponse(jobStatus: any, response: any): JobStatusResponse {
  return { jobStatus: jobStatus, response: response };
}
