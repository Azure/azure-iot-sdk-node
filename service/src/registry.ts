// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { errors, endpoint, SharedAccessSignature } from 'azure-iot-common';
import { RestApiClient } from './rest_api_client';
import * as ConnectionString from './connection_string';
import { Twin } from './twin';
import { Query } from './query';
import { Device } from './device';
import { Callback } from './interfaces';

const ArgumentError = errors.ArgumentError;

/**
 * @class           module:azure-iothub.Registry
 * @classdesc       Constructs a Registry object with the given configuration
 *                  object. The Registry class provides access to the IoT Hub
 *                  identity service. Normally, consumers will call one of the
 *                  factory methods, e.g.,
 *                  {@link module:azure-iothub.Registry.fromConnectionString|fromSharedAccessSignature},
 *                  to create a Registry object.
 * @param {Object}  config      An object containing the necessary information to connect to the IoT Hub instance:
 *                              - host: the hostname for the IoT Hub instance
 *                              - sharedAccessSignature: A shared access signature with valid access rights and expiry.
 */
/*Codes_SRS_NODE_IOTHUB_REGISTRY_05_001: [The Registry constructor shall accept a transport object]*/
export class Registry {
  private _config: Registry.TransportConfig;
  private _restApiClient: RestApiClient;

  constructor(config: Registry.TransportConfig, restApiClient?: RestApiClient) {
    if (!config) {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_023: [The `Registry` constructor shall throw a `ReferenceError` if the config object is falsy.]*/
      throw new ReferenceError('The \'config\' parameter cannot be \'' + config + '\'');
    } else if (!config.host || !config.sharedAccessSignature) {
      /*SRS_NODE_IOTHUB_REGISTRY_05_001: [** The `Registry` constructor shall throw an `ArgumentException` if the config object is missing one or more of the following properties:
      - `host`: the IoT Hub hostname
      - `sharedAccessSignature`: shared access signature with the permissions for the desired operations.]*/
      throw new ArgumentError('The \'config\' argument is missing either the host or the sharedAccessSignature property');
    }
    this._config = config;

    /*SRS_NODE_IOTHUB_REGISTRY_16_024: [The `Registry` constructor shall use the `restApiClient` provided as a second argument if it is provided.]*/
    /*SRS_NODE_IOTHUB_REGISTRY_16_025: [The `Registry` constructor shall use `azure-iothub.RestApiClient` if no `restApiClient` argument is provided.]*/
    // This httpRequestBuilder parameter is used only for unit-testing purposes and should not be used in other situations.
    this._restApiClient = restApiClient || new RestApiClient(config);
  }

  /**
   * @method            module:azure-iothub.Registry#create
   * @description       Creates a new device identity on an IoT hub.
   * @param {Object}    deviceInfo  The object must include a `deviceId` property
   *                                with a valid device identifier.
   * @param {Function}  done        The function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                {@link module:azure-iothub.Device|Device}
   *                                object representing the created device
   *                                identity, and a transport-specific response
   *                                object useful for logging or debugging.
   */
  create(deviceInfo: Registry.DeviceDescription, done: Registry.DeviceCallback): void {
    if (!deviceInfo) {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_07_001: [The `create` method shall throw `ReferenceError` if the `deviceInfo` argument is falsy. **]*/
      throw new ReferenceError('deviceInfo cannot be \'' + deviceInfo + '\'');
    } else if (!deviceInfo.deviceId) {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_07_001: [The create method shall throw ArgumentError if the first argument does not contain a deviceId property.]*/
      throw new ArgumentError('The object \'deviceInfo\' is missing the property: deviceId');
    }

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_026: [The `create` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    PUT /devices/<deviceInfo.deviceId>?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    If-Match: *
    Request-Id: <guid>

    <deviceInfo>
    ```]*/
    const path = endpoint.devicePath(deviceInfo.deviceId) + endpoint.versionQueryString();
    const httpHeaders = {
      'Content-Type': 'application/json; charset=utf-8'
    };

    this._restApiClient.executeApiCall('PUT', path, httpHeaders, deviceInfo, (err, device, httpResponse) => {
      if (err) {
        done(err);
      } else {
        done(null, new Device(device), httpResponse);
      }
    });
  }

  /**
   * @method            module:azure-iothub.Registry#update
   * @description       Updates an existing device identity on an IoT hub with
   *                    the given device information.
   * @param {Object}    deviceInfo  An object which must include a `deviceId`
   *                                property whose value is a valid device
   *                                identifier.
   * @param {Function}  done        The function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                {@link module:azure-iothub.Device|Device}
   *                                object representing the updated device
   *                                identity, and a transport-specific response
   *                                object useful for logging or debugging.
   */
  update(deviceInfo: Registry.DeviceDescription, done: Registry.DeviceCallback): void {
    if (!deviceInfo) {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_043: [The `update` method shall throw `ReferenceError` if the `deviceInfo` argument is falsy.]*/
      throw new ReferenceError('deviceInfo cannot be \'' + deviceInfo + '\'');
    } else if (!deviceInfo.deviceId) {
      /* Codes_SRS_NODE_IOTHUB_REGISTRY_07_003: [The update method shall throw ArgumentError if the first argument does not contain a deviceId property.]*/
      throw new ArgumentError('The object \'deviceInfo\' is missing the property: deviceId');
    }

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_027: [The `update` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    PUT /devices/<deviceInfo.deviceId>?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>

    <deviceInfo>
    ```]*/
    const path = endpoint.devicePath(deviceInfo.deviceId) + endpoint.versionQueryString();
    const httpHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'If-Match': '*'
    };

    this._restApiClient.executeApiCall('PUT', path, httpHeaders, deviceInfo, (err, device, httpResponse) => {
      if (err) {
        done(err);
      } else {
        done(null, new Device(device), httpResponse);
      }
    });
  }

  /**
   * @method            module:azure-iothub.Registry#get
   * @description       Requests information about an existing device identity
   *                    on an IoT hub.
   * @param {String}    deviceId    The identifier of an existing device identity.
   * @param {Function}  done        The function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                {@link module:azure-iothub.Device|Device}
   *                                object representing the created device
   *                                identity, and a transport-specific response
   *                                object useful for logging or debugging.
   */
  get(deviceId: string, done: Registry.DeviceCallback): void {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_006: [The get method shall throw ReferenceError if the supplied deviceId is falsy.]*/
    if (!deviceId) {
      throw new ReferenceError('deviceId is \'' + deviceId + '\'');
    }

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_028: [The `get` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    GET /devices/<deviceInfo.deviceId>?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    Request-Id: <guid>
    ```]*/
    const path = endpoint.devicePath(deviceId) + endpoint.versionQueryString();

    this._restApiClient.executeApiCall('GET', path, null, null, (err, device, httpResponse) => {
      if (err) {
        done(err);
      } else {
        done(null, new Device(device), httpResponse);
      }
    });
  }

  /**
   * @method            module:azure-iothub.Registry#list
   * @description       Requests information about the first 1000 device
   *                    identities on an IoT hub.
   * @param {Function}  done        The function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), an
   *                                array of
   *                                {@link module:azure-iothub.Device|Device}
   *                                objects representing the listed device
   *                                identities, and a transport-specific response
   *                                object useful for logging or debugging.
   */
  list(done: Callback<Device[]>): void {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_029: [The `list` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    GET /devices?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    Request-Id: <guid>
    ```]*/
    const path = endpoint.devicePath('') + endpoint.versionQueryString();

    this._restApiClient.executeApiCall('GET', path, null, null, (err, devices, httpResponse) => {
      if (err) {
        done(err);
      } else {
        done(null, devices ? devices.map((device) => new Device(device)) : [], httpResponse);
      }
    });
  }

  /**
   * @method            module:azure-iothub.Registry#delete
   * @description       Removes an existing device identity from an IoT hub.
   * @param {String}    deviceId    The identifier of an existing device identity.
   * @param {Function}  done        The function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), an
   *                                always-null argument (for consistency with
   *                                the other methods), and a transport-specific
   *                                response object useful for logging or
   *                                debugging.
   */
  delete(deviceId: string, done: Registry.ResponseCallback): void {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_07_007: [The delete method shall throw ReferenceError if the supplied deviceId is falsy.]*/
    if (!deviceId) {
      throw new ReferenceError('deviceId is \'' + deviceId + '\'');
    }

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_030: [The `delete` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    DELETE /devices/<deviceInfo.deviceId>?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    If-Match: *
    Request-Id: <guid>
    ```]*/
    const path = endpoint.devicePath(deviceId) + endpoint.versionQueryString();
    const httpHeaders = {
      'If-Match': '*'
    };

    this._restApiClient.executeApiCall('DELETE', path, httpHeaders, null, done);
  }

  /**
   * @method            module:azure-iothub.Registry#addDevices
   * @description       Adds an array of devices.
   *
   * @param {Object}    devices     An array of objects which must include a `deviceId`
   *                                property whose value is a valid device
   *                                identifier.
   * @param {Function}  done        The function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                BulkRegistryOperationResult
   *                                and a transport-specific response object useful
   *                                for logging or debugging.
   */
  addDevices(devices: Registry.DeviceDescription[], done: Registry.BulkDeviceIdentityCallback): void {
    this._processBulkDevices(devices, 'create', null, null, null, done);
  }

  /**
   * @method            module:azure-iothub.Registry#updateDevices
   * @description       Updates an array of devices.
   *
   * @param {Object}    devices     An array of objects which must include a `deviceId`
   *                                property whose value is a valid device
   *                                identifier.
   * @param {boolean}   forceUpdate if `forceUpdate` is true then the device will be
   *                                updated regardless of an etag.  Otherwise the etags
   *                                must match.
   * @param {Function}  done        The function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                BulkRegistryOperationResult
   *                                and a transport-specific response object useful
   *                                for logging or debugging.
   */
  updateDevices(devices: Registry.DeviceDescription[], forceUpdate: boolean, done?: Registry.BulkDeviceIdentityCallback): void {
    this._processBulkDevices(devices, null, forceUpdate, 'Update', 'UpdateIfMatchETag', done);
  }

  /**
   * @method            module:azure-iothub.Registry#removeDevices
   * @description       Updates an array of devices.
   *
   * @param {Object}    devices     An array of objects which must include a `deviceId`
   *                                property whose value is a valid device
   *                                identifier.
   * @param {boolean}   forceRemove if `forceRemove` is true then the device will be
   *                                removed regardless of an etag.  Otherwise the etags
   *                                must match.
   * @param {Function}  done        The function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                BulkRegistryOperationResult
   *                                and a transport-specific response object useful
   *                                for logging or debugging.
   */
  removeDevices(devices: Registry.DeviceDescription[], forceRemove: boolean, done: Registry.BulkDeviceIdentityCallback): void {
    this._processBulkDevices(devices, null, forceRemove, 'Delete', 'DeleteIfMatchETag', done);
  }

  /**
   * @method              module:azure-iothub.Registry#importDevicesFromBlob
   * @description         Imports devices from a blob in bulk job.
   * @param {String}      inputBlobContainerUri   The URI to a container with a blob named 'devices.txt' containing a list of devices to import.
   * @param {String}      outputBlobContainerUri  The URI to a container where a blob will be created with logs of the import process.
   * @param {Function}    done                    The function to call when the job has been created, with two arguments: an error object if an
   *                                              an error happened, (null otherwise) and the job status that can be used to track progress of the devices import.
   */
  importDevicesFromBlob(inputBlobContainerUri: string, outputBlobContainerUri: string, done: Registry.JobCallback): void {
    /* Codes_SRS_NODE_IOTHUB_REGISTRY_16_001: [A ReferenceError shall be thrown if importBlobContainerUri is falsy] */
    if (!inputBlobContainerUri) throw new ReferenceError('inputBlobContainerUri cannot be falsy');
    /* Codes_SRS_NODE_IOTHUB_REGISTRY_16_002: [A ReferenceError shall be thrown if exportBlobContainerUri is falsy] */
    if (!outputBlobContainerUri) throw new ReferenceError('outputBlobContainerUri cannot be falsy');

    /*SRS_NODE_IOTHUB_REGISTRY_16_031: [The `importDeviceFromBlob` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    POST /jobs/create?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>

    {
      'type': 'import',
      'inputBlobContainerUri': '<input container Uri given as parameter>',
      'outputBlobContainerUri': '<output container Uri given as parameter>'
    }
    ```]*/
    const path = '/jobs/create' + endpoint.versionQueryString();
    const httpHeaders = {
      'Content-Type': 'application/json; charset=utf-8'
    };
    const importRequest = {
      'type': 'import',
      'inputBlobContainerUri': inputBlobContainerUri,
      'outputBlobContainerUri': outputBlobContainerUri
    };

    this._restApiClient.executeApiCall('POST', path, httpHeaders, importRequest, done);
  }

  /**
   * @method              module:azure-iothub.Registry#exportDevicesToBlob
   * @description         Export devices to a blob in a bulk job.
   * @param {String}      outputBlobContainerUri  The URI to a container where a blob will be created with logs of the export process.
   * @param {Boolean}     excludeKeys             Boolean indicating whether security keys should be excluded from the exported data.
   * @param {Function}    done                    The function to call when the job has been created, with two arguments: an error object if an
   *                                              an error happened, (null otherwise) and the job status that can be used to track progress of the devices export.
   */
  exportDevicesToBlob(outputBlobContainerUri: string, excludeKeys: boolean, done: Registry.JobCallback): void {
    /* Codes_SRS_NODE_IOTHUB_REGISTRY_16_004: [A ReferenceError shall be thrown if outputBlobContainerUri is falsy] */
    if (!outputBlobContainerUri) throw new ReferenceError('outputBlobContainerUri cannot be falsy');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_032: [** The `exportDeviceToBlob` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    POST /jobs/create?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>

    {
      'type': 'export',
      'outputBlobContainerUri': '<output container Uri given as parameter>',
      'excludeKeysInExport': '<excludeKeys Boolean given as parameter>'
    }
    ```]*/
    const path = '/jobs/create' + endpoint.versionQueryString();
    const httpHeaders = {
      'Content-Type': 'application/json; charset=utf-8'
    };
    const exportRequest = {
      'type': 'export',
      'outputBlobContainerUri': outputBlobContainerUri,
      'excludeKeysInExport': excludeKeys
    };

    this._restApiClient.executeApiCall('POST', path, httpHeaders, exportRequest, done);
  }

  /**
   * @method              module:azure-iothub.Registry#listJobs
   * @description         List the last import/export jobs (including the active one, if any).
   * @param {Function}    done    The function to call with two arguments: an error object if an error happened,
   *                              (null otherwise) and the list of past jobs as an argument.
   */
  listJobs(done: Callback<any>): void {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_037: [The `listJobs` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    GET /jobs?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    Request-Id: <guid>
    ```]*/
    const path = '/jobs' + endpoint.versionQueryString();

    this._restApiClient.executeApiCall('GET', path, null, null, done);
  }

  /**
   * @method              module:azure-iothub.Registry#getJob
   * @description         Get the status of a bulk import/export job.
   * @param {String}      jobId   The identifier of the job for which the user wants to get status information.
   * @param {Function}    done    The function to call with two arguments: an error object if an error happened,
   *                              (null otherwise) and the status of the job whose identifier was passed as an argument.
   */
  getJob(jobId: string, done: Registry.JobCallback): void {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_006: [A ReferenceError shall be thrown if jobId is falsy] */
    if (!jobId) throw new ReferenceError('jobId cannot be falsy');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_038: [The `getJob` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    GET /jobs/<jobId>?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    Request-Id: <guid>
    ```]*/
    const path = '/jobs/' + jobId + endpoint.versionQueryString();
    this._restApiClient.executeApiCall('GET', path, null, null, done);
  }

  /**
   * @method              module:azure-iothub.Registry#cancelJob
   * @description         Cancel a bulk import/export job.
   * @param {String}      jobId   The identifier of the job for which the user wants to get status information.
   * @param {Function}    done    The function to call with two arguments: an error object if an error happened,
   *                              (null otherwise) and the (cancelled) status of the job whose identifier was passed as an argument.
   */
  cancelJob(jobId: string, done: Registry.JobCallback): void {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_012: [A ReferenceError shall be thrown if the jobId is falsy] */
    if (!jobId) throw new ReferenceError('jobId cannot be falsy');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_039: [The `cancelJob` method shall construct an HTTP request using information supplied by the caller as follows:
    ```
    DELETE /jobs/<jobId>?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    Request-Id: <guid>
    ```]*/
    const path = '/jobs/' + jobId + endpoint.versionQueryString();
    this._restApiClient.executeApiCall('DELETE', path, null, null, done);
  }

  /**
   * @method              module:azure-iothub.Registry#getTwin
   * @description         Gets the Device Twin of the device with the specified device identifier.
   * @param {String}      deviceId   The device identifier.
   * @param {Function}    done       The callback that will be called with either an Error object or
   *                                 the device twin instance.
   */
  getTwin(deviceId: string, done: Registry.ResponseCallback): void {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_019: [The `getTwin` method shall throw a `ReferenceError` if the `deviceId` parameter is falsy.]*/
    if (!deviceId) throw new ReferenceError('the \'deviceId\' cannot be falsy');
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_020: [The `getTwin` method shall throw a `ReferenceError` if the `done` parameter is falsy.]*/
    if (!done) throw new ReferenceError('the \'done\' argument cannot be falsy');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_049: [The `getTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    GET /twins/<deviceId>?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    Request-Id: <guid>
    ```]*/
    const path = '/twins/' + deviceId + endpoint.versionQueryString();
    this._restApiClient.executeApiCall('GET', path, null, null, (err, newTwin, response) => {
      if (err) {
        done(err);
      } else {
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_036: [The `getTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service.]*/
        done(null, new Twin(newTwin, this), response);
      }
    });
  }

  /**
   * @method              module:azure-iothub.Registry#updateTwin
   * @description         Updates the Device Twin of a specific device with the given patch.
   * @param {String}      deviceId   The device identifier.
   * @param {Object}      patch      The desired properties and tags to patch the device twin with.
   * @param {string}      etag       The latest etag for this device twin or '*' to force an update even if
   *                                 the device twin has been updated since the etag was obtained.
   * @param {Function}    done       The callback that will be called with either an Error object or
   *                                 the device twin instance.
   */
  updateTwin(deviceId: string, patch: any, etag: string, done: Registry.ResponseCallback): void {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_044: [The `updateTwin` method shall throw a `ReferenceError` if the `deviceId` argument is `undefined`, `null` or an empty string.]*/
    if (deviceId === null || deviceId === undefined || deviceId === '') throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_045: [The `updateTwin` method shall throw a `ReferenceError` if the `patch` argument is falsy.]*/
    if (!patch) throw new ReferenceError('patch cannot be \'' + patch + '\'');
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_046: [The `updateTwin` method shall throw a `ReferenceError` if the `etag` argument is falsy.]*/
    if (!etag) throw new ReferenceError('etag cannot be \'' + etag + '\'');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_048: [The `updateTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    PATCH /twins/<deviceId>?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>
    If-Match: <etag>

    <patch>
    ```]*/
    const path = '/twins/' + deviceId + endpoint.versionQueryString();
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'If-Match': etag
    };

    this._restApiClient.executeApiCall('PATCH', path, headers, patch, (err, newTwin, response) => {
      if (err) {
        done(err);
      } else {
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_050: [The `updateTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service.]*/
        done(null, new Twin(newTwin, this), response);
      }
    });
  }

  /**
   * @method              module:azure-iothub.Registry#createQuery
   * @description         Creates a query that can be run on the IoT Hub instance to find information about devices or jobs.
   * @param {String}      sqlQuery   The query written as an SQL string.
   * @param {Number}      pageSize   The desired number of results per page (optional. default: 1000, max: 10000).
   *
   * @throws {ReferenceError}        If the sqlQuery argument is falsy.
   * @throws {TypeError}             If the sqlQuery argument is not a string or the pageSize argument not a number, null or undefined.
   */
  createQuery(sqlQuery: string, pageSize?: number): Query {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_051: [The `createQuery` method shall throw a `ReferenceError` if the `sqlQuery` argument is falsy.]*/
    if (!sqlQuery) throw new ReferenceError('sqlQuery cannot be \'' + sqlQuery + '\'');
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_052: [The `createQuery` method shall throw a `TypeError` if the `sqlQuery` argument is not a string.]*/
    if (typeof sqlQuery !== 'string') throw new TypeError('sqlQuery must be a string');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_053: [The `createQuery` method shall throw a `TypeError` if the `pageSize` argument is not `null`, `undefined` or a number.]*/
    if (pageSize !== null && pageSize !== undefined && typeof pageSize !== 'number') throw new TypeError('pageSize must be a number or be null or undefined');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_054: [The `createQuery` method shall return a new `Query` instance initialized with the `sqlQuery` and the `pageSize` argument if specified.]*/
    return new Query(this._executeQueryFunc(sqlQuery, pageSize), this);
  }

  /**
   * @method                module:azure-iothub.Registry#getRegistryStatistics
   * @description           Gets statistics about the devices in the device identity registry.
   * @param {Function}      done   The callback that will be called with either an Error object or
   *                               the device registry statistics.
   */
  getRegistryStatistics(done: Callback<Registry.RegistryStatistics>): void {
    const path = '/statistics/devices' + endpoint.versionQueryString();
    this._restApiClient.executeApiCall('GET', path, {}, null, done);
  }

  private _bulkOperation(devices: Registry.DeviceDescription[], done: Callback<any>): void {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_011: [The `addDevices` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    POST /devices?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>

    <stringified array supplied by the argument devices annotated with importMode property and deviceId property replaced by id>
    ```
    ]*/
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_013: [The `updateDevices` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    POST /devices?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>

    <list supplied by the argument devices annotated with importMode property and deviceId property replaced by id>
    ```
    ]*/
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_018: [The `removeDevices` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    POST /devices?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>

    <stringified array supplied by the argument devices annotated with importMode property and deviceId property replaced by id>
    ```
    ]*/
    const path = '/devices' + endpoint.versionQueryString();
    const httpHeaders = {
      'Content-Type': 'application/json; charset=utf-8'
    };

    this._restApiClient.executeApiCall('POST', path, httpHeaders, devices, done);
  }

  private _processBulkDevices(devices: Registry.DeviceDescription[], operation: Registry.BulkRegistryOperationType, force: boolean, forceTrueAlternative: Registry.BulkRegistryOperationType, forceFalseAlternative: Registry.BulkRegistryOperationType, done: Callback<any>): void {
    if (!devices) {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_004: [The `addDevices` method shall throw `ReferenceError` if the `devices` argument is falsy.]*/
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_025: [The `updateDevices` method shall throw `ReferenceError` if the `devices` argument is falsy.]*/
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_006: [The `removeDevices` method shall throw `ReferenceError` if the deviceInfo is falsy.]*/
      throw new ReferenceError('devices cannot be \'' + devices + '\'');
    } else if (!Array.isArray(devices)) {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_021: [The `addDevices` method shall throw `ArgumentError` if devices is NOT an array.]*/
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_020: [The `updateDevices` method shall throw `ArgumentError` if devices is NOT an array.]*/
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_019: [The `removeDevices` method shall throw `ArgumentError` if devices is NOT an array.]*/
      throw new ArgumentError('devices must be an array');
    } else if ((devices.length === 0) || (devices.length > 100)) {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_014: [The `addDevices` method shall throw `ArgumentError` if devices.length == 0  or is greater than 100.]*/
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_015: [The `updateDevices` method shall throw `ArgumentError` if devices.length == 0  or is greater than 100.]*/
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_016: [The `removeDevices` method shall throw `ArgumentError` if devices.length == 0  or is greater than 100.]*/
      throw new ArgumentError('The device array has an invalid size of ' + devices.length);
    } else {
      let importMode: string;
      if (operation === null) {
        //
        // The api utilizes a force parameter.  Check to insure it's present and a boolean.
        //
        if ((typeof force) !== 'boolean') {
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_026: [The `updateDevices` method shall throw `ReferenceError` if the `forceUpdate` parameter is null or undefined.]*/
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_027: [The `removeDevices` method shall throw `ReferenceError` if the `forceRemove` parameter is null or undefined.]*/
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_024: [The `updateDevices` method shall throw `ReferenceError` if the `forceUpdate` parameter is NOT typeof boolean.]*/
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_023: [The `removeDevices` method shall throw `ReferenceError` if the `forceRemove` parameter is NOT typeof boolean.]*/
          throw new ReferenceError('force parameter must be present and a boolean');
        } else {
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_008: [If the `forceUpdate` parameter is true importMode will be set to `Update` otherwise it will be set to `UpdateIfMatchETag`.]*/
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_007: [If the `forceRemove` parameter is true then importMode will be set to `Delete` otherwise it will be set to `DeleteIfMatchETag`.]*/
          importMode = force ? forceTrueAlternative : forceFalseAlternative;
        }
      } else {
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_009: [The `addDevices` method shall utilize an importMode = `create`.]*/
        importMode = operation;
      }
      let bulkArray: Registry.DeviceDescription[] = [];

      devices.forEach((currentDevice) => {
        if (!currentDevice.deviceId) {
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_010: [The `addDevices` method shall throw `ArgumentError` if any elements of devices do NOT contain a `deviceId` property.]*/
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_012: [The `updateDevices` method shall throw `ArgumentError` if any elements of devices do NOT contain a `deviceId` property.]*/
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_017: [The `removeDevices` method shall throw `ArgumentError` if any elements of devices do NOT contain a `deviceId` property.]*/
          throw new ArgumentError('The object is missing the property: deviceId');
        } else {
          //
          // And now remove the device id and put it back as id.
          //
          const actualDeviceId = currentDevice.deviceId;
          let preparedDevice = JSON.parse(JSON.stringify(currentDevice));
          delete preparedDevice.deviceId;
          preparedDevice.id = actualDeviceId;
          preparedDevice.importMode = importMode;

          bulkArray.push(preparedDevice);
        }
      });

      this._bulkOperation(bulkArray, done);
    }
  }

  private _executeQueryFunc(sqlQuery: string, pageSize: number): (continuationToken: string, done: Callback<any>) => void {
    return (continuationToken, done) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_057: [The `_executeQueryFunc` method shall construct an HTTP request as follows:
      ```
      POST /devices/query?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      x-ms-continuation: continuationToken
      x-ms-max-item-count: pageSize
      Request-Id: <guid>

      {
        query: <sqlQuery>
      }
      ```]*/
      const path = '/devices/query' + endpoint.versionQueryString();
      const headers = {
        'Content-Type': 'application/json; charset=utf-8'
      };

      if (continuationToken) {
        headers['x-ms-continuation'] = continuationToken;
      }

      if (pageSize) {
        headers['x-ms-max-item-count'] = pageSize;
      }

      const query = {
        query: sqlQuery
      };

      this._restApiClient.executeApiCall('POST', path, headers, query, done);
    };
  }
  /**
   * @method          module:azure-iothub.Registry.fromConnectionString
   * @description     Constructs a Registry object from the given connection
   *                  string using the default transport
   *                  ({@link module:azure-iothub.Http|Http}).
   * @param {String}  value       A connection string which encapsulates the
   *                              appropriate (read and/or write) Registry
   *                              permissions.
   * @returns {module:azure-iothub.Registry}
   */
  static fromConnectionString(value: string): Registry {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_008: [The `fromConnectionString` method shall throw `ReferenceError` if the value argument is falsy.]*/
    if (!value) throw new ReferenceError('value is \'' + value + '\'');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_009: [The `fromConnectionString` method shall derive and transform the needed parts from the connection string in order to create a `config` object for the constructor (see `SRS_NODE_IOTHUB_REGISTRY_05_001`).]*/
    const cn = ConnectionString.parse(value);

    const config: Registry.TransportConfig = {
      host: cn.HostName,
      sharedAccessSignature: SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, Date.now())
    };

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_010: [The `fromConnectionString` method shall return a new instance of the `Registry` object.]*/
    return new Registry(config);
  }

  /**
   * @method            module:azure-iothub.Registry.fromSharedAccessSignature
   * @description       Constructs a Registry object from the given shared access
   *                    signature using the default transport
   *                    ({@link module:azure-iothub.Http|Http}).
   * @param {String}    value     A shared access signature which encapsulates
   *                              the appropriate (read and/or write) Registry
   *                              permissions.
   * @returns {module:azure-iothub.Registry}
   */
  static fromSharedAccessSignature(value: string): Registry {
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_011: [The `fromSharedAccessSignature` method shall throw ReferenceError if the value argument is falsy.]*/
    if (!value) throw new ReferenceError('value is \'' + value + '\'');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_012: [The `fromSharedAccessSignature` method shall derive and transform the needed parts from the shared access signature in order to create a `config` object for the constructor (see `SRS_NODE_IOTHUB_REGISTRY_05_001`).]*/
    const sas = SharedAccessSignature.parse(value);

    const config: Registry.TransportConfig = {
      host: sas.sr,
      sharedAccessSignature: sas.toString()
    };

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_013: [The fromSharedAccessSignature method shall return a new instance of the `Registry` object.]*/
    return new Registry(config);
  }
}

export namespace Registry {
    export interface TransportConfig {
        host: string;
        sharedAccessSignature: string | SharedAccessSignature;
    }

    export interface JobStatus {
    }

    export interface QueryDescription {
        query: string;
    }

    export interface RegistryStatistics {
        totalDeviceCount: number;
        enabledDeviceCount: number;
        disabledDeviceCount: number;
    }

    export type DeviceCallback = (err: Error, device?: Device, response?: any) => void;
    export type ResponseCallback = (err: Error, result?: any, response?: any) => void;
    export type JobCallback = (err: Error, jobStatus?: JobStatus) => void;
    export type BulkDeviceIdentityCallback = ( err: Error, result: BulkRegistryOperationResult, response: any) => void;

    export interface DeviceDescription {
      deviceId: string;
      [x: string]: any;
    }

    export interface DeviceRegistryOperationError {
      deviceId: string;
      errorCode: Error;
      errorStatus: string;
    }

    export interface BulkRegistryOperationResult {
      isSuccessful: boolean;
      errors: DeviceRegistryOperationError[];
    }

    export type BulkRegistryOperationType = 'create' | 'Update' | 'UpdateIfMatchETag' | 'Delete' | 'DeleteIfMatchETag';
}
