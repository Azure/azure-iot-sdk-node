import { RestApiClient } from 'azure-iot-http-base';
import { Query } from './query';
import { DeviceMethodParams } from './interfaces';
import { TripleValueCallback } from 'azure-iot-common';
export declare type JobType = 'scheduleUpdateTwin' | 'scheduleDeviceMethod';
export declare type JobStatus = 'queued' | 'scheduled' | 'running' | 'cancelled' | 'finished';
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
export declare class JobClient {
    private _restApiClient;
    /**
     * @private
     * @constructor
     * @param {RestApiClient}     restApiClient   The HTTP registry client used to execute REST API calls.@constructor
     * @throws {ReferenceError}   If the restApiClient argument is falsy.
     */
    constructor(restApiClient: RestApiClient);
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
    /**
     * @method            module:azure-iothub.JobClient#createQuery
     * @description       Creates a query that can be used to return pages of existing job based on type and status.
     *
     * @param {String}    jobType     The type that should be used to filter results.
     * @param {String}    jobStatus   The status that should be used to filter results.
     * @param {Number}    pageSize    The number of elements to return per page.
     */
    createQuery(jobType?: JobType, jobStatus?: JobStatus, pageSize?: number): Query;
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
    private _getJobsFunc;
    private _scheduleJob;
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
    static fromConnectionString(connectionString: string): JobClient;
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
    static fromSharedAccessSignature(sharedAccessSignature: string): JobClient;
}
export declare namespace JobClient {
    type JobCallback = TripleValueCallback<any, any>;
}
export declare type JobStatusResponse = {
    jobStatus: any;
    response: any;
};
export declare function createJobStatusResponse(jobStatus: any, response: any): JobStatusResponse;
