// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import Query = require('./query');
import Device = require('./device');
import RestApiClient = require('./rest_api_client');

declare class Registry {
    constructor(config: Registry.TransportConfig, restApiClient: RestApiClient);

    // CRUD operations
    create(deviceInfo: Registry.DeviceDescription, done: Registry.DeviceCallback): void;
    update(deviceInfo: Registry.DeviceDescription, done: Registry.DeviceCallback): void;
    get(deviceId: string, done: Registry.DeviceCallback): void;
    list(done: (err: Error, devices?: Device[], response?: any) => void): void;
    delete(deviceId: string, done: Registry.ResponseCallback): void;

    // Device Statistics
    getRegistryStatistics(done: (err: Error, statistics: Registry.RegistryStatistics, response: any) => void): void;

    // Bulk Import/Export Jobs
    importDevicesFromBlob(inputBlobContainerUri: string, outputBlobContainerUri: string, done: Registry.JobCallback): void;
    exportDevicesToBlob(outputBlobContainerUri: string, excludeKeys: boolean, done: Registry.JobCallback): void;
    listJobs(done: (err: Error, jobsList?: string[]) => void): void;
    getJob(jobId: string, done: Registry.JobCallback): void;
    cancelJob(jobId: string, done: Registry.JobCallback): void;

    // Bulk Device Identity
    addDevices(devices: Registry.DeviceDescription[], done: Registry.BulkDeviceIdentityCallback): void;
    updateDevices(devices: Registry.DeviceDescription[], forceUpdate: boolean, done: Registry.BulkDeviceIdentityCallback): void;
    removeDevices(devices: Registry.DeviceDescription[], forceRemove: boolean, done: Registry.BulkDeviceIdentityCallback): void;

    // Twin
    getTwin(deviceId: string, done: Registry.ResponseCallback): void;
    updateTwin(deviceId: string, patch: any, etag: string, done: Registry.ResponseCallback): void;

    // Queries
    createQuery(sqlQuery: string, pageSize?: number): Query;

    // Factory methods
    static fromConnectionString(value: string): Registry;
    static fromSharedAccessSignature(value: string): Registry;
}

declare namespace Registry {
    interface TransportConfig {
        host: string;
        sharedAccessSignature: string;
    }

    interface JobStatus {
    }

    interface QueryDescription {
        query: string;
    }

    interface RegistryStatistics {
        totalDeviceCount: number;
        enabledDeviceCount: number;
        disabledDeviceCount: number;
    }

    type DeviceCallback = (err: Error, device: Device) => void;
    type ResponseCallback = (err: Error, device: any, response: any) => void;
    type JobCallback = (err: Error, jobStatus?: JobStatus) => void;
    type BulkDeviceIdentityCallback = ( err: Error, result: BulkRegistryOperationResult, response: any) => void;

    interface DeviceDescription {
      deviceId: string;
      [x: string]: any;
    }

    interface DeviceRegistryOperationError {
      deviceId: string;
      errorCode: Error;
      errorStatus: string;
    }

    interface BulkRegistryOperationResult {
      isSuccessful: boolean;
      errors: DeviceRegistryOperationError[];
    }
}

export = Registry;
