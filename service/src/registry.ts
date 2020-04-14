// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { errors, endpoint, SharedAccessSignature, ResultWithHttpResponse } from 'azure-iot-common';
import { Agent } from 'https';
import { RestApiClient } from 'azure-iot-http-base';
import * as ConnectionString from './connection_string';
import { Twin } from './twin';
import { Query } from './query';
import { Configuration, ConfigurationContent } from './configuration';
import { Device } from './device';
import { IncomingMessageCallback } from './interfaces';
import { Module } from './module';
import { TripleValueCallback, Callback, HttpResponseCallback, callbackToPromise, httpCallbackToPromise } from 'azure-iot-common';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

const ArgumentError = errors.ArgumentError;

/**
 * The Registry class provides access to the IoT Hub device identity service.
 * Users of the SDK should instantiate this class with one of the factory methods:
 * {@link azure-iothub.Registry.fromConnectionString|fromConnectionString} or {@link azure-iothub.Registry.fromSharedAccessSignature|fromSharedAccessSignature}.
 *
 * The protocol used for device identity registry operations is HTTPS.
 */
/*Codes_SRS_NODE_IOTHUB_REGISTRY_05_001: [The Registry constructor shall accept a transport object]*/
export class Registry {
  private _restApiClient: RestApiClient;

  /**
   * @private
   * @constructor
   * @param {Object}  config      An object containing the necessary information to connect to the IoT Hub instance:
   *                              - host: the hostname for the IoT Hub instance
   *                              - sharedAccessSignature: A shared access signature with valid access rights and expiry.
   */
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

    /*SRS_NODE_IOTHUB_REGISTRY_16_024: [The `Registry` constructor shall use the `restApiClient` provided as a second argument if it is provided.]*/
    /*SRS_NODE_IOTHUB_REGISTRY_16_025: [The `Registry` constructor shall use `azure-iothub.RestApiClient` if no `restApiClient` argument is provided.]*/
    // This httpRequestBuilder parameter is used only for unit-testing purposes and should not be used in other situations.
    this._restApiClient = restApiClient || new RestApiClient(config, packageJson.name + '/' + packageJson.version);
    if (this._restApiClient.setOptions) {
      this._restApiClient.setOptions({ http: { agent: new Agent({ keepAlive: true }) } });
    }
  }

  /**
   * @method            module:azure-iothub.Registry#create
   * @description       Creates a new device identity on an IoT hub.
   * @param {Object}    deviceInfo  The object must include a `deviceId` property
   *                                with a valid device identifier.
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                {@link module:azure-iothub.Device|Device}
   *                                object representing the created device
   *                                identity, and a transport-specific response
   *                                object useful for logging or debugging.
   * @returns {Promise<ResultWithHttpResponse<Device>> | void} Promise if no callback function was passed, void otherwise.
   */
  create(deviceInfo: Registry.DeviceDescription, done: HttpResponseCallback<Device>): void;
  create(deviceInfo: Registry.DeviceDescription): Promise<ResultWithHttpResponse<Device>>;
  create(deviceInfo: Registry.DeviceDescription, done?: HttpResponseCallback<Device>): Promise<ResultWithHttpResponse<Device>> | void {
    return httpCallbackToPromise((_callback) => {
      if (!deviceInfo) {
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_07_001: [The `create` method shall throw `ReferenceError` if the `deviceInfo` argument is falsy. **]*/
        throw new ReferenceError('deviceInfo cannot be \'' + deviceInfo + '\'');
      } else if (!deviceInfo.deviceId) {
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_07_001: [The create method shall throw ArgumentError if the first argument does not contain a deviceId property.]*/
        throw new ArgumentError('The object \'deviceInfo\' is missing the property: deviceId');
      }

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_026: [The `create` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      PUT /devices/<encodeURIComponent(deviceInfo.deviceId)>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      If-Match: *
      Request-Id: <guid>

      <deviceInfo>
      ```]*/
      const path = endpoint.devicePath(encodeURIComponent(deviceInfo.deviceId)) + endpoint.versionQueryString();
      const httpHeaders = {
        'Content-Type': 'application/json; charset=utf-8'
      };

      let normalizedDeviceInfo = JSON.parse(JSON.stringify(deviceInfo));
      this._normalizeAuthentication(normalizedDeviceInfo);
      this._restApiClient.executeApiCall('PUT', path, httpHeaders, normalizedDeviceInfo, (err, device, httpResponse) => {
        if (err) {
          _callback(err);
        } else {
          _callback(null, new Device(device), httpResponse);
        }
      });
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#update
   * @description       Updates an existing device identity on an IoT hub with
   *                    the given device information.
   * @param {Object}    deviceInfo  An object which must include a `deviceId`
   *                                property whose value is a valid device
   *                                identifier.
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                {@link module:azure-iothub.Device|Device}
   *                                object representing the updated device
   *                                identity, and a transport-specific response
   *                                object useful for logging or debugging.
   * @returns {Promise<ResultWithHttpResponse<Device>> | void} Promise if no callback function was passed, void otherwise.
   */
  update(deviceInfo: Registry.DeviceDescription, done: HttpResponseCallback<Device>): void;
  update(deviceInfo: Registry.DeviceDescription): Promise<ResultWithHttpResponse<Device>>;
  update(deviceInfo: Registry.DeviceDescription, done?: HttpResponseCallback<Device>): Promise<ResultWithHttpResponse<Device>> | void {
    return httpCallbackToPromise((_callback) => {
      if (!deviceInfo) {
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_043: [The `update` method shall throw `ReferenceError` if the `deviceInfo` argument is falsy.]*/
        throw new ReferenceError('deviceInfo cannot be \'' + deviceInfo + '\'');
      } else if (!deviceInfo.deviceId) {
        /* Codes_SRS_NODE_IOTHUB_REGISTRY_07_003: [The update method shall throw ArgumentError if the first argument does not contain a deviceId property.]*/
        throw new ArgumentError('The object \'deviceInfo\' is missing the property: deviceId');
      }

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_027: [The `update` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      PUT /devices/<encodeURIComponent(deviceInfo.deviceId)>?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>

      <deviceInfo>
      ```]*/
      const path = endpoint.devicePath(encodeURIComponent(deviceInfo.deviceId)) + endpoint.versionQueryString();
      const httpHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'If-Match': this.ensureQuoted('*')
      };

      let normalizedDeviceInfo = JSON.parse(JSON.stringify(deviceInfo));
      this._normalizeAuthentication(normalizedDeviceInfo);
      this._restApiClient.executeApiCall('PUT', path, httpHeaders, normalizedDeviceInfo, (err, device, httpResponse) => {
        if (err) {
          _callback(err);
        } else {
          _callback(null, new Device(device), httpResponse);
        }
      });
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#get
   * @description       Requests information about an existing device identity
   *                    on an IoT hub.
   * @param {String}    deviceId    The identifier of an existing device identity.
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                {@link module:azure-iothub.Device|Device}
   *                                object representing the created device
   *                                identity, and a transport-specific response
   *                                object useful for logging or debugging.
   * @returns {Promise<ResultWithHttpResponse<Device>> | void} Promise if no callback function was passed, void otherwise.
   */
  get(deviceId: string, done: HttpResponseCallback<Device>): void;
  get(deviceId: string): Promise<ResultWithHttpResponse<Device>>;
  get(deviceId: string, done?: HttpResponseCallback<Device>): Promise<ResultWithHttpResponse<Device>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_006: [The get method shall throw ReferenceError if the supplied deviceId is falsy.]*/
      if (!deviceId) {
        throw new ReferenceError('deviceId is \'' + deviceId + '\'');
      }

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_028: [The `get` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      GET /devices/<encodeURIComponent(deviceInfo.deviceId)>?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Request-Id: <guid>
      ```]*/
      const path = endpoint.devicePath(encodeURIComponent(deviceId)) + endpoint.versionQueryString();

      this._restApiClient.executeApiCall('GET', path, null, null, (err, device, httpResponse) => {
        if (err) {
          _callback(err);
        } else {
          _callback(null, new Device(device), httpResponse);
        }
      });
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#list
   * @description       Requests information about the first 1000 device
   *                    identities on an IoT hub.
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), an
   *                                array of
   *                                {@link module:azure-iothub.Device|Device}
   *                                objects representing the listed device
   *                                identities, and a transport-specific response
   *                                object useful for logging or debugging.
   * @returns {Promise<ResultWithHttpResponse<Device[]>> | void} Promise if no callback function was passed, void otherwise.
   */
  list(done: HttpResponseCallback<Device[]>): void;
  list(): Promise<ResultWithHttpResponse<Device[]>>;
  list(done?: HttpResponseCallback<Device[]>): Promise<ResultWithHttpResponse<Device[]>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_029: [The `list` method shall construct an HTTP request using information supplied by the caller, as follows:
         ```
         GET /devices?api-version=<version> HTTP/1.1
         Authorization: <config.sharedAccessSignature>
         Request-Id: <guid>
         ```]*/
      const path = endpoint.devicePath('') + endpoint.versionQueryString();

      this._restApiClient.executeApiCall('GET', path, null, null, (err, devices, httpResponse) => {
        if (err) {
          _callback(err);
        } else {
          _callback(null, devices ? devices.map((device) => new Device(device)) : [], httpResponse);
        }
      });
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#delete
   * @description       Removes an existing device identity from an IoT hub.
   * @param {String}    deviceId    The identifier of an existing device identity.
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), an
   *                                always-null argument (for consistency with
   *                                the other methods), and a transport-specific
   *                                response object useful for logging or
   *                                debugging.
   * @returns {Promise<ResultWithHttpResponse<any>> | void} Promise if no callback function was passed, void otherwise.
   */
  delete(deviceId: string, done: HttpResponseCallback<any>): void;
  delete(deviceId: string): Promise<ResultWithHttpResponse<any>>;
  delete(deviceId: string, done?: HttpResponseCallback<any>): Promise<ResultWithHttpResponse<any>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_07_007: [The delete method shall throw ReferenceError if the supplied deviceId is falsy.]*/
      if (!deviceId) {
        throw new ReferenceError('deviceId is \'' + deviceId + '\'');
      }

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_030: [The `delete` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      DELETE /devices/<encodeURIComponent(deviceInfo.deviceId)>?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      If-Match: *
      Request-Id: <guid>
      ```]*/
      const path = endpoint.devicePath(encodeURIComponent(deviceId)) + endpoint.versionQueryString();
      const httpHeaders = {
        'If-Match': this.ensureQuoted('*')
      };

      this._restApiClient.executeApiCall('DELETE', path, httpHeaders, null, _callback);
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#addDevices
   * @description       Adds an array of devices.
   *
   * @param {Object}    devices     An array of objects which must include a `deviceId`
   *                                property whose value is a valid device
   *                                identifier.
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                BulkRegistryOperationResult
   *                                and a transport-specific response object useful
   *                                for logging or debugging.
   * @returns {Promise<ResultWithHttpResponse<Registry.BulkRegistryOperationResult>> | void} Promise if no callback function was passed, void otherwise.
   */
  addDevices(devices: Registry.DeviceDescription[], done: HttpResponseCallback<Registry.BulkRegistryOperationResult>): void;
  addDevices(devices: Registry.DeviceDescription[]): Promise<ResultWithHttpResponse<Registry.BulkRegistryOperationResult>>;
  addDevices(devices: Registry.DeviceDescription[], done?: HttpResponseCallback<Registry.BulkRegistryOperationResult>): Promise<ResultWithHttpResponse<Registry.BulkRegistryOperationResult>> | void {
    return httpCallbackToPromise((_callback) => {
      this._processBulkDevices(devices, 'create', null, null, null, _callback);
    }, done);
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
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                BulkRegistryOperationResult
   *                                and a transport-specific response object useful
   *                                for logging or debugging.
   * @returns {Promise<ResultWithHttpResponse<Registry.BulkRegistryOperationResult>> | void} Promise if no callback function was passed, void otherwise.
   */
  updateDevices(devices: Registry.DeviceDescription[], forceUpdate: boolean, done: HttpResponseCallback<Registry.BulkRegistryOperationResult>): void;
  updateDevices(devices: Registry.DeviceDescription[], forceUpdate: boolean): Promise<ResultWithHttpResponse<Registry.BulkRegistryOperationResult>>;
  updateDevices(devices: Registry.DeviceDescription[], forceUpdate: boolean, done?: HttpResponseCallback<Registry.BulkRegistryOperationResult>): Promise<ResultWithHttpResponse<Registry.BulkRegistryOperationResult>> | void {
    return httpCallbackToPromise((_callback) => {
      this._processBulkDevices(devices, null, forceUpdate, 'Update', 'UpdateIfMatchETag', _callback);
    }, done);
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
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), a
   *                                BulkRegistryOperationResult
   *                                and a transport-specific response object useful
   *                                for logging or debugging.
   * @returns {Promise<ResultWithHttpResponse<Registry.BulkRegistryOperationResult>> | void} Promise if no callback function was passed, void otherwise.
   */
  removeDevices(devices: Registry.DeviceDescription[], forceRemove: boolean, done: HttpResponseCallback<Registry.BulkRegistryOperationResult>): void;
  removeDevices(devices: Registry.DeviceDescription[], forceRemove: boolean): Promise<ResultWithHttpResponse<Registry.BulkRegistryOperationResult>>;
  removeDevices(devices: Registry.DeviceDescription[], forceRemove: boolean, done?: HttpResponseCallback<Registry.BulkRegistryOperationResult>): Promise<ResultWithHttpResponse<Registry.BulkRegistryOperationResult>> | void {
    return httpCallbackToPromise((_callback) => {
      this._processBulkDevices(devices, null, forceRemove, 'Delete', 'DeleteIfMatchETag', _callback);
    }, done);
  }

  /**
   * @method              module:azure-iothub.Registry#importDevicesFromBlob
   * @description         Imports devices from a blob in bulk job.
   * @param {String}      inputBlobContainerUri   The URI to a container with a blob named 'devices.txt' containing a list of devices to import.
   * @param {String}      outputBlobContainerUri  The URI to a container where a blob will be created with logs of the import process.
   * @param {Function}    [done]                  The optional function to call when the job has been created, with two arguments: an error object if an
   *                                              an error happened, (null otherwise) and the job status that can be used to track progress of the devices import.
   * @returns {Promise<Registry.JobStatus> | void} Promise if no callback function was passed, void otherwise.
   */
  importDevicesFromBlob(inputBlobContainerUri: string, outputBlobContainerUri: string, done: Callback<Registry.JobStatus>): void;
  importDevicesFromBlob(inputBlobContainerUri: string, outputBlobContainerUri: string): Promise<Registry.JobStatus>;
  importDevicesFromBlob(inputBlobContainerUri: string, outputBlobContainerUri: string, done?: Callback<Registry.JobStatus>): Promise<Registry.JobStatus> | void {
    return callbackToPromise((_callback) => {
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

      this._restApiClient.executeApiCall('POST', path, httpHeaders, importRequest, _callback);
    }, done);
  }

  /**
   * @method              module:azure-iothub.Registry#importDevicesFromBlobByIdentity
   * @description         Imports devices from a blob in bulk job using the configured identity.  This API initially has limited availablity and is only is implemented in a few regions.
   *                      If a user wishes to try it out, they will need to set an Environment Variable of "EnabledStorageIdentity" and set it to "1"
   * @param {String}      inputBlobContainerUri   The URI to a container with a blob named 'devices.txt' containing a list of devices to import.
   * @param {String}      outputBlobContainerUri  The URI to a container where a blob will be created with logs of the import process.
   * @param {Function}    [done]                  The optional function to call when the job has been created, with two arguments: an error object if an
   *                                              an error happened, (null otherwise) and the job status that can be used to track progress of the devices import.
   * @returns {Promise<Registry.JobStatus> | void} Promise if no callback function was passed, void otherwise.
   */
  importDevicesFromBlobByIdentity(inputBlobContainerUri: string, outputBlobContainerUri: string, done: Callback<Registry.JobStatus>): void;
  importDevicesFromBlobByIdentity(inputBlobContainerUri: string, outputBlobContainerUri: string): Promise<Registry.JobStatus>;
  importDevicesFromBlobByIdentity(inputBlobContainerUri: string, outputBlobContainerUri: string, done?: Callback<Registry.JobStatus>): Promise<Registry.JobStatus> | void {
    return callbackToPromise((_callback) => {
      /* Codes_SRS_NODE_IOTHUB_REGISTRY_07_001: [A ReferenceError shall be thrown if importBlobContainerUri is falsy] */
      if (!inputBlobContainerUri) throw new ReferenceError('inputBlobContainerUri cannot be falsy');
      /* Codes_SRS_NODE_IOTHUB_REGISTRY_07_002: [A ReferenceError shall be thrown if exportBlobContainerUri is falsy] */
      if (!outputBlobContainerUri) throw new ReferenceError('outputBlobContainerUri cannot be falsy');

      /* Codes_SRS_NODE_IOTHUB_REGISTRY_07_003: [The `importDevicesFromBlobByIdentity` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      POST /jobs/create?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>

      {
        'type': 'import',
        'inputBlobContainerUri': '<input container Uri given as parameter>',
        'outputBlobContainerUri': '<output container Uri given as parameter>',
        'storageAuthenticationType': 'IdentityBased'
      }
      ```]*/
      const path = '/jobs/create' + endpoint.versionQueryStringLimitedAvailability();
      const httpHeaders = {
        'Content-Type': 'application/json; charset=utf-8'
      };
      const importRequest = {
        'type': 'import',
        'inputBlobContainerUri': inputBlobContainerUri,
        'outputBlobContainerUri': outputBlobContainerUri,
        'storageAuthenticationType': 'IdentityBased'
      };

      this._restApiClient.executeApiCall('POST', path, httpHeaders, importRequest, _callback);
    }, done);
  }

  /**
   * @method              module:azure-iothub.Registry#exportDevicesToBlob
   * @description         Export devices to a blob in a bulk job.
   * @param {String}      outputBlobContainerUri  The URI to a container where a blob will be created with logs of the export process.
   * @param {Boolean}     excludeKeys             Boolean indicating whether security keys should be excluded from the exported data.
   * @param {Function}    [done]                  The optional function to call when the job has been created, with two arguments: an error object if an
   *                                              an error happened, (null otherwise) and the job status that can be used to track progress of the devices export.
   * @returns {Promise<Registry.JobStatus> | void} Promise if no callback function was passed, void otherwise.
   */
  exportDevicesToBlob(outputBlobContainerUri: string, excludeKeys: boolean, done: Callback<Registry.JobStatus>): void;
  exportDevicesToBlob(outputBlobContainerUri: string, excludeKeys: boolean): Promise<Registry.JobStatus>;
  exportDevicesToBlob(outputBlobContainerUri: string, excludeKeys: boolean, done?: Callback<Registry.JobStatus>): Promise<Registry.JobStatus> | void {
    return callbackToPromise((_callback) => {
      /* Codes_SRS_NODE_IOTHUB_REGISTRY_16_004: [A ReferenceError shall be thrown if outputBlobContainerUri is falsy] */
      if (!outputBlobContainerUri) throw new ReferenceError('outputBlobContainerUri cannot be falsy');

      /* Codes_SRS_NODE_IOTHUB_REGISTRY_16_032: [** The `exportDeviceToBlob` method shall construct an HTTP request using information supplied by the caller, as follows:
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

      this._restApiClient.executeApiCall('POST', path, httpHeaders, exportRequest, _callback);
    }, done);
  }

  /**
   * @method              module:azure-iothub.Registry#exportDevicesToBlob
   * @description         Export devices to a blob in a bulk job using the configured identity.  This API initially has limited availablity and is only is implemented in a few regions.
   *                      If a user wishes to try it out, they will need to set an Environment Variable of "EnabledStorageIdentity" and set it to "1"
   * @param {String}      outputBlobContainerUri  The URI to a container where a blob will be created with logs of the export process.
   * @param {Boolean}     excludeKeys             Boolean indicating whether security keys should be excluded from the exported data.
   * @param {Function}    [done]                  The optional function to call when the job has been created, with two arguments: an error object if an
   *                                              an error happened, (null otherwise) and the job status that can be used to track progress of the devices export.
   * @returns {Promise<Registry.JobStatus> | void} Promise if no callback function was passed, void otherwise.
   */
  exportDevicesToBlobByIdentity(outputBlobContainerUri: string, excludeKeys: boolean, done: Callback<Registry.JobStatus>): void;
  exportDevicesToBlobByIdentity(outputBlobContainerUri: string, excludeKeys: boolean): Promise<Registry.JobStatus>;
  exportDevicesToBlobByIdentity(outputBlobContainerUri: string, excludeKeys: boolean, done?: Callback<Registry.JobStatus>): Promise<Registry.JobStatus> | void {
    return callbackToPromise((_callback) => {
      /* Codes_SRS_NODE_IOTHUB_REGISTRY_07_004: [A ReferenceError shall be thrown if outputBlobContainerUri is falsy] */
      if (!outputBlobContainerUri) throw new ReferenceError('outputBlobContainerUri cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_07_005: [** The `exportDeviceToBlob` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      POST /jobs/create?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>

      {
        'type': 'export',
        'outputBlobContainerUri': '<output container Uri given as parameter>',
        'excludeKeysInExport': '<excludeKeys Boolean given as parameter>',
        'storageAuthenticationType': 'IdentityBased'
      }
      ```]*/
      const path = '/jobs/create' + endpoint.versionQueryStringLimitedAvailability();
      const httpHeaders = {
        'Content-Type': 'application/json; charset=utf-8'
      };
      const exportRequest = {
        'type': 'export',
        'outputBlobContainerUri': outputBlobContainerUri,
        'excludeKeysInExport': excludeKeys,
        'storageAuthenticationType': 'IdentityBased'
      };

      this._restApiClient.executeApiCall('POST', path, httpHeaders, exportRequest, _callback);
    }, done);
  }

  /**
   * @method              module:azure-iothub.Registry#listJobs
   * @description         List the last import/export jobs (including the active one, if any).
   * @param {Function}    [done]  The optional function to call with two arguments: an error object if an error happened,
   *                              (null otherwise) and the list of past jobs as an argument.
   * @returns {Promise<ResultWithHttpResponse<any>> | void} Promise if no callback function was passed, void otherwise.
   */
  listJobs(done: HttpResponseCallback<any>): void;
  listJobs(): Promise<ResultWithHttpResponse<any>>;
  listJobs(done?: HttpResponseCallback<any>): Promise<ResultWithHttpResponse<any>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_037: [The `listJobs` method shall construct an HTTP request using information supplied by the caller, as follows:
          ```
          GET /jobs?api-version=<version> HTTP/1.1
          Authorization: <config.sharedAccessSignature>
          Request-Id: <guid>
          ```]*/
      const path = '/jobs' + endpoint.versionQueryString();

      this._restApiClient.executeApiCall('GET', path, null, null, _callback);
    }, done);
  }

  /**
   * @method              module:azure-iothub.Registry#getJob
   * @description         Get the status of a bulk import/export job.
   * @param {String}      jobId   The identifier of the job for which the user wants to get status information.
   * @param {Function}    [done]  The optional function to call with two arguments: an error object if an error happened,
   *                              (null otherwise) and the status of the job whose identifier was passed as an argument.
   * @returns {Promise<Registry.JobStatus> | void} Promise if no callback function was passed, void otherwise.
   */
  getJob(jobId: string, done: Callback<Registry.JobStatus>): void;
  getJob(jobId: string): Promise<Registry.JobStatus>;
  getJob(jobId: string, done?: Callback<Registry.JobStatus>): Promise<Registry.JobStatus> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_006: [A ReferenceError shall be thrown if jobId is falsy] */
      if (!jobId) throw new ReferenceError('jobId cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_038: [The `getJob` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      GET /jobs/<jobId>?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Request-Id: <guid>
      ```]*/
      const path = '/jobs/' + jobId + endpoint.versionQueryString();
      this._restApiClient.executeApiCall('GET', path, null, null, _callback);
    }, done);
  }

  /**
   * @method              module:azure-iothub.Registry#cancelJob
   * @description         Cancel a bulk import/export job.
   * @param {String}      jobId   The identifier of the job for which the user wants to get status information.
   * @param {Function}    [done]  The optional function to call with two arguments: an error object if an error happened,
   *                              (null otherwise) and the (cancelled) status of the job whose identifier was passed as an argument.
   * @returns {Promise<Registry.JobStatus> | void} Promise if no callback function was passed, void otherwise.
   */
  cancelJob(jobId: string, done: Callback<Registry.JobStatus>): void;
  cancelJob(jobId: string): Promise<Registry.JobStatus>;
  cancelJob(jobId: string, done?: Callback<Registry.JobStatus>): Promise<Registry.JobStatus> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_012: [A ReferenceError shall be thrown if the jobId is falsy] */
      if (!jobId) throw new ReferenceError('jobId cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_039: [The `cancelJob` method shall construct an HTTP request using information supplied by the caller as follows:
      ```
      DELETE /jobs/<jobId>?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Request-Id: <guid>
      ```]*/
      const path = '/jobs/' + jobId + endpoint.versionQueryString();
      this._restApiClient.executeApiCall('DELETE', path, null, null, _callback);
    }, done);
  }

  /**
   * @method              module:azure-iothub.Registry#getTwin
   * @description         Gets the Device Twin of the device with the specified device identifier.
   * @param {String}      deviceId   The device identifier.
   * @param {Function}    [done]     The optional callback that will be called with either an Error object or
   *                                 the device twin instance.
   * @returns {Promise<ResultWithHttpResponse<Twin>> | void} Promise if no callback function was passed, void otherwise.
   */
  getTwin(deviceId: string, done: HttpResponseCallback<Twin>): void;
  getTwin(deviceId: string): Promise<ResultWithHttpResponse<Twin>>;
  getTwin(deviceId: string, done?: HttpResponseCallback<Twin>): Promise<ResultWithHttpResponse<Twin>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_019: [The `getTwin` method shall throw a `ReferenceError` if the `deviceId` parameter is falsy.]*/
      if (!deviceId) throw new ReferenceError('the \'deviceId\' cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_049: [The `getTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      GET /twins/<encodeURIComponent(deviceId)>?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Request-Id: <guid>
      ```]*/
      const path = '/twins/' + encodeURIComponent(deviceId) + endpoint.versionQueryString();
      this._restApiClient.executeApiCall('GET', path, null, null, (err, newTwin, response) => {
        if (err) {
          _callback(err);
        } else {
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_036: [The `getTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service.]*/
          _callback(null, new Twin(newTwin, this), response);
        }
      });
    }, done);
  }

  /**
   * @method              module:azure-iothub.Registry#getModuleTwin
   * @description         Gets the Module Twin of the module with the specified module identifier.
   * @param {String}      deviceId   The device identifier.
   * @param {String}      moduleId   The module identifier.
   * @param {Function}    [done]     The optional callback that will be called with either an Error object or
   *                                 the module twin instance.
   * @throws {ReferenceError}       If the deviceId, moduleId, or done argument is falsy.
   * @returns {Promise<ResultWithHttpResponse<Twin>> | void} Promise if no callback function was passed, void otherwise.
   */
  getModuleTwin(deviceId: string, moduleId: string, done: HttpResponseCallback<Twin>): void;
  getModuleTwin(deviceId: string, moduleId: string): Promise<ResultWithHttpResponse<Twin>>;
  getModuleTwin(deviceId: string, moduleId: string, done?: HttpResponseCallback<Twin>): Promise<ResultWithHttpResponse<Twin>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_001: [The `getModuleTwin` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, or `done` is falsy. ]*/
      if (!deviceId) throw new ReferenceError('Argument \'deviceId\' cannot be falsy');
      if (!moduleId) throw new ReferenceError('Argument \'moduleId\' cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_002: [The `getModuleTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
        GET /twins/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
        Authorization: <config.sharedAccessSignature>
        Request-Id: <guid>
      ```
      ]*/
      const path = `/twins/${encodeURIComponent(deviceId)}/modules/${encodeURIComponent(moduleId)}${endpoint.versionQueryString()}`;
      this._restApiClient.executeApiCall('GET', path, null, null, (err, newTwin, response) => {
        if (err) {
          _callback(err);
        } else {
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_003: [The `getModuleTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service. ]*/
          _callback(null, new Twin(newTwin, this), response);
        }
      });
    }, done);
  }

  /**
   * @method              module:azure-iothub.Registry#updateTwin
   * @description         Updates the Device Twin of a specific device with the given patch.
   * @param {String}      deviceId   The device identifier.
   * @param {Object}      patch      The desired properties and tags to patch the device twin with.
   * @param {string}      etag       The latest etag for this device twin or '*' to force an update even if
   *                                 the device twin has been updated since the etag was obtained.
   * @param {Function}    [done]     The optional callback that will be called with either an Error object or
   *                                 the device twin instance.
   * @returns {Promise<ResultWithHttpResponse<Twin>> | void} Promise if no callback function was passed, void otherwise.
   */
  updateTwin(deviceId: string, patch: any, etag: string, done: HttpResponseCallback<Twin>): void;
  updateTwin(deviceId: string, patch: any, etag: string): Promise<ResultWithHttpResponse<Twin>>;
  updateTwin(deviceId: string, patch: any, etag: string, done?: HttpResponseCallback<Twin>): Promise<ResultWithHttpResponse<Twin>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_044: [The `updateTwin` method shall throw a `ReferenceError` if the `deviceId` argument is `undefined`, `null` or an empty string.]*/
      if (deviceId === null || deviceId === undefined || deviceId === '') throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_045: [The `updateTwin` method shall throw a `ReferenceError` if the `patch` argument is falsy.]*/
      if (!patch) throw new ReferenceError('patch cannot be \'' + patch + '\'');
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_046: [The `updateTwin` method shall throw a `ReferenceError` if the `etag` argument is falsy.]*/
      if (!etag) throw new ReferenceError('etag cannot be \'' + etag + '\'');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_048: [The `updateTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      PATCH /twins/<encodeURIComponent(deviceId)>?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>
      If-Match: <etag>

      <patch>
      ```]*/
      const path = '/twins/' + encodeURIComponent(deviceId) + endpoint.versionQueryString();
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'If-Match': this.ensureQuoted(etag)
      };

      this._restApiClient.executeApiCall('PATCH', path, headers, patch, (err, newTwin, response) => {
        if (err) {
          _callback(err);
        } else {
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_050: [The `updateTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service.]*/
          _callback(null, new Twin(newTwin, this), response);
        }
      });
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#updateModuleTwin
   * @description         Updates the Twin of a specific module with the given patch.
   *
   * @param {String}      deviceId    The device identifier.
   * @param {String}      moduleId    The module identifier
   * @param {Object}      patch       The desired properties and tags to patch the module twin with.
   * @param {string}      etag        The latest etag for this module twin or '*' to force an update even if
   *                                  the module twin has been updated since the etag was obtained.
   * @param {Function}    [done]      The optional callback that will be called with either an Error object or
   *                                  the module twin instance.
   * @returns {Promise<ResultWithHttpResponse<Twin>> | void} Promise if no callback function was passed, void otherwise.
   * @throws {ReferenceError}         If the deviceId, moduleId, patch, etag, or done argument is falsy.
   */
  updateModuleTwin(deviceId: string, moduleId: string, patch: any, etag: string, done: HttpResponseCallback<Twin>): void;
  updateModuleTwin(deviceId: string, moduleId: string, patch: any, etag: string): Promise<ResultWithHttpResponse<Twin>>;
  updateModuleTwin(deviceId: string, moduleId: string, patch: any, etag: string, done?: HttpResponseCallback<Twin>): Promise<ResultWithHttpResponse<Twin>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_004: [The `updateModuleTwin` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, `patch`, `etag`,or `done` is falsy. ]*/
      if (!deviceId) throw new ReferenceError('Argument \'deviceId\' cannot be falsy');
      if (!moduleId) throw new ReferenceError('Argument \'moduleId\' cannot be falsy');
      if (!patch) throw new ReferenceError('Argument \'patch\' cannot be falsy');
      if (!etag) throw new ReferenceError('Argument \'etag\' cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_005: [The `updateModuleTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      PATCH /twins/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>
      If-Match: <etag>
      <patch>
      ```
      ]*/
      const path = `/twins/${encodeURIComponent(deviceId)}/modules/${encodeURIComponent(moduleId)}${endpoint.versionQueryString()}`;
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'If-Match': this.ensureQuoted(etag)
      };

      this._restApiClient.executeApiCall('PATCH', path, headers, patch, (err, newTwin, response) => {
        if (err) {
          _callback(err);
        } else {
          /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_006: [The `updateModuleTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service. ]*/
          _callback(null, new Twin(newTwin, this), response);
        }
      });
    }, done);
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
   * @param {Function}      [done]   The optional callback that will be called with either an Error object or
   *                                 the device registry statistics.
   * @returns {Promise<ResultWithHttpResponse<Registry.RegistryStatistics>> | void} Promise if no callback function was passed, void otherwise.
   */
  getRegistryStatistics(done: HttpResponseCallback<Registry.RegistryStatistics>): void;
  getRegistryStatistics(): Promise<ResultWithHttpResponse<Registry.RegistryStatistics>>;
  getRegistryStatistics(done?: HttpResponseCallback<Registry.RegistryStatistics>): Promise<ResultWithHttpResponse<Registry.RegistryStatistics>> | void {
    return httpCallbackToPromise((_callback) => {
      const path = '/statistics/devices' + endpoint.versionQueryString();
      this._restApiClient.executeApiCall('GET', path, {}, null, _callback);
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#addConfiguration
   * @description       Add a configuration to an IoT hub.
   *
   * @param {Configuration} configuration An object of type module:azure-iothub.Configuration
   *                                      to add to the hub
   * @param {Function}      [done]        The optional function to call when the operation is
   *                                      complete. `done` will be called with three
   *                                      arguments: an Error object (can be null), the
   *                                      body of the response, and a transport-specific
   *                                      response object useful for logging or
   *                                      debugging.
   * @returns {Promise<ResultWithHttpResponse<any>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}             The configuration or done parameter is falsy.
   * @throws {ArgumentError}              The configuration object is missing the id property
   */
  addConfiguration(configuration: Configuration, done: HttpResponseCallback<any>): void;
  addConfiguration(configuration: Configuration): Promise<ResultWithHttpResponse<any>>;
  addConfiguration(configuration: Configuration, done?: HttpResponseCallback<any>): Promise<ResultWithHttpResponse<any>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_007: [The `addConfiguration` method shall throw a `ReferenceError` exception if `configuration` or `done` is falsy. ]*/
      if (!configuration) throw new ReferenceError('configuration cannot be falsy');
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_008: [The `addConfiguration` method shall throw an `ArgumentError` exception if `configuration.id` is falsy. ]*/
      if (!configuration.id) throw new ArgumentError('configuration object is missing id property');
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_009: [The `addConfiguration` method shall set `configuration.schemaVersion` to '1.0' if it is not already set. ]*/
      if (!configuration.schemaVersion) {
        configuration.schemaVersion = '1.0';
      }

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_010: [The `addConfiguration` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      PUT /configurations/<encodeURIComponent(configuration.id)>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>

      <configuration>
      ```
      ]*/
      const path = `/configurations/${encodeURIComponent(configuration.id)}${endpoint.versionQueryString()}`;
      const httpHeaders = {
        'Content-Type': 'application/json; charset=utf-8'
      };

      this._restApiClient.executeApiCall('PUT', path, httpHeaders, configuration, _callback);
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#getConfiguration
   * @description       Get a single configuration from an IoT Hub
   *
   * @param {string}    configurationId   The ID of the configuration you with to retrieve
   * @param {Function}  [done]            The optional callback which will be called with either an Error object
   *                                      or a module:azure-iothub.Configuration object with the configuration details.
   * @returns {Promise<ResultWithHttpResponse<Configuration>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}             The configurationId or done argument is falsy
   */
  getConfiguration(configurationId: string, done: HttpResponseCallback<Configuration>): void;
  getConfiguration(configurationId: string): Promise<ResultWithHttpResponse<Configuration>>;
  getConfiguration(configurationId: string, done?: HttpResponseCallback<Configuration>): Promise<ResultWithHttpResponse<Configuration>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_011: [The `getConfiguration` method shall throw a `ReferenceError` exception if `configurationId` is falsy. ]*/
      if (!configurationId) throw new ReferenceError('Argument \'configurationId\' cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_012: [The `getConfiguration` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      GET /configurations/<encodeURIComponent(configurationId)>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Request-Id: <guid>
      ```
      ]*/
      const path = `/configurations/${encodeURIComponent(configurationId)}${endpoint.versionQueryString()}`;
      this._restApiClient.executeApiCall('GET', path, null, null, _callback);
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#getConfigurations
   * @description       Get all configurations on an IoT Hub
   *
   * @param {Function}  [done]            The optional callback which will be called with either an Error object
   *                                      or an array of module:azure-iothub.Configuration objects
   *                                      for all the configurations.
   * @returns {Promise<ResultWithHttpResponse<Configuration[]>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}             The done argument is falsy
   */
  getConfigurations(done: HttpResponseCallback<Configuration[]>): void;
  getConfigurations(): Promise<ResultWithHttpResponse<Configuration[]>>;
  getConfigurations(done?: HttpResponseCallback<Configuration[]>): Promise<ResultWithHttpResponse<Configuration[]>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_014: [The `getConfigurations` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      GET /configurations?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Request-Id: <guid>
      ```
      ]*/
      const path = `/configurations${endpoint.versionQueryString()}`;
      this._restApiClient.executeApiCall('GET', path, null, null, _callback);
    }, done);
  }

  _updateConfiguration(configuration: Configuration, forceUpdateOrDone: boolean | HttpResponseCallback<any>, done?: HttpResponseCallback<any>): void {
    let forceUpdate: boolean;
    if (typeof (forceUpdateOrDone) === 'function') {
      forceUpdate = false;
      done = forceUpdateOrDone;
    } else {
      forceUpdate = forceUpdateOrDone;
    }

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_015: [The `updateConfiguration` method shall throw a `ReferenceError` exception if `configuration` or `done` is falsy. ]*/
    if (!configuration) throw new ReferenceError('Argument \'configuration\' cannot be falsy');
    if (!done) throw new ReferenceError('Argument \'done\' cannot be falsy');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_016: [The `updateConfiguration` method shall throw an `ArgumentError` exception if `forceUpdate` is falsy and `configuration.etag` is also falsy. ]*/
    if (!forceUpdate && !configuration.etag) {
      throw new ArgumentError('The ETag should be set while updating the Configuration.');
    }
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_017: [The `updateConfiguration` method shall throw an `ArgumentError` exception if `configuration.id` is falsy. ]*/
    if (!configuration.id) throw new ArgumentError('configuration object is missing id property');
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_018: [The `updateConfiguration` method shall set ``configuration.schemaVersion` to '1.0' if it is not already set. ]*/
    if (!configuration.schemaVersion) {
      configuration.schemaVersion = '1.0';
    }

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_019: [The `updateConfiguration` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    PUT </configurations/<encodeURIComponent(configurationId)>?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    If-Match: <etag | *>
    Request-Id: <guid>

    <configuration>
    ```
    ]*/
    const path = `/configurations/${encodeURIComponent(configuration.id)}${endpoint.versionQueryString()}`;

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_020: [If `forceUpdate` is not truthy, the `updateConfigurationMethod` shall put the `etag` parameter into the `If-Match` header value. ]*/
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_021: [If `forceUpdate` is truthy, the `updateConfiguration` method shall put `*` into the `If-Match` header value. ]*/
    const httpHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'If-Match': this.ensureQuoted(forceUpdate ? '*' : configuration.etag)
    };

    this._restApiClient.executeApiCall('PUT', path, httpHeaders, configuration, done);
  }

  /**
   * @method            module:azure-iothub.Registry#updateConfiguration
   * @description       Update a configuration in an IoT hub
   *
   * @param {Configuration} configuration An object of type module:azure-iothub.Configuration
   *                                      to add to the hub
   * @param {boolean}       forceUpdate   Set to true to force the update by ignoring the eTag
   *                                      in the Configuration object (optional. default: false)
   * @param {Function}      [done]        The optional function to call when the operation is
   *                                      complete. `done` will be called with three
   *                                      arguments: an Error object (can be null), the
   *                                      body of the response, and a transport-specific
   *                                      response object useful for logging or
   *                                      debugging.
   * @returns {Promise<ResultWithHttpResponse<any>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}             The configuration or done argument is falsy
   * @throws {ArgumentError}              The eTag is missing from the Configuration object,
   *                                      but forceUpdate is not set to true, or the configuration
   *                                      object is missing an id property.
   */
  updateConfiguration(configuration: Configuration, done: HttpResponseCallback<any>): void;
  updateConfiguration(configuration: Configuration, forceUpdate: boolean, done: HttpResponseCallback<any>): void;
  updateConfiguration(configuration: Configuration, forceUpdate: boolean): Promise<ResultWithHttpResponse<any>>;
  updateConfiguration(configuration: Configuration): Promise<ResultWithHttpResponse<any>>;
  updateConfiguration(configuration: Configuration, forceUpdateOrDone?: boolean | HttpResponseCallback<any>, done?: HttpResponseCallback<any>): Promise<ResultWithHttpResponse<any>> | void {
    const callback = done || ((typeof forceUpdateOrDone === 'function') ? forceUpdateOrDone : undefined);

    if (callback) {
      return this._updateConfiguration(configuration, forceUpdateOrDone, done);
    }

    return httpCallbackToPromise((_callback) => this._updateConfiguration(configuration, forceUpdateOrDone as boolean, _callback));
  }

  /**
   * @method            module:azure-iothub.Registry#removeConfiguration
   * @description       Remove a configuration with the given ID from an IoT Hub
   *
   * @param {String}    configurationId   ID of the configuration to remove
   * @param {Function}  [done]            The optional function to call when the operation is
   *                                      complete. `done` will be called with three
   *                                      arguments: an Error object (can be null), the
   *                                      body of the response, and a transport-specific
   *                                      response object useful for logging or
   *                                      debugging.
   * @returns {Promise<ResultWithHttpResponse<any>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}             The configurationId or done argument is falsy
   */
  removeConfiguration(configurationId: string, done: HttpResponseCallback<any>): void;
  removeConfiguration(configurationId: string): Promise<ResultWithHttpResponse<any>>;
  removeConfiguration(configurationId: string, done?: HttpResponseCallback<any>): Promise<ResultWithHttpResponse<any>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_022: [The `removeConfiguration` method shall throw a `ReferenceError` exception if `configurationId` or `done` is falsy. ]*/
      if (!configurationId) throw new ReferenceError('Argument \'configurationId\' cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_023: [The `removeConfiguration` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      DELETE /configurations/<encodeURIComponent(configurationId)>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Request-Id: <guid>
      ```
      ]*/
      const path = `/configurations/${encodeURIComponent(configurationId)}${endpoint.versionQueryString()}`;

      this._restApiClient.executeApiCall('DELETE', path, null, null, _callback);
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#applyConfigurationContentOnDevice
   * @description       Apply the given configuration to a device on an IoT Hub
   *
   * @param {String} deviceId                 ID of the device to apply the configuration to
   * @param {ConfigurationContent} content    The Configuration to apply
   * @param {Function} [done]                 The optional function to call when the operation is
   *                                          complete. `done` will be called with three
   *                                          arguments: an Error object (can be null), the
   *                                          body of the response, and a transport-specific
   *                                          response object useful for logging or
   *                                          debugging.
   * @returns {Promise<ResultWithHttpResponse<any>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}       If the deviceId, content, or done argument is falsy.
   */
  applyConfigurationContentOnDevice(deviceId: string, content: ConfigurationContent, done: HttpResponseCallback<any>): void;
  applyConfigurationContentOnDevice(deviceId: string, content: ConfigurationContent): Promise<ResultWithHttpResponse<any>>;
  applyConfigurationContentOnDevice(deviceId: string, content: ConfigurationContent, done?: HttpResponseCallback<any>): Promise<ResultWithHttpResponse<any>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_024: [The `applyConfigurationContentOnDevice` method shall throw a `ReferenceError` exception if `deviceId`, `content`, or `done` is falsy. ]*/
      if (!deviceId) throw new ReferenceError('Argument \'deviceId\' cannot be falsy');
      if (!content) throw new ReferenceError('Argument \'content\' cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_025: [The `applyConfigurationContentOnDevice` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      POST /devices/<encodeURIComponent(deviceId)>/applyConfigurationContent?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>

      <content>
      ```
      ]*/
      const path = `${endpoint.devicePath(encodeURIComponent(deviceId))}/applyConfigurationContent${endpoint.versionQueryString()}`;
      const httpHeaders = {
        'Content-Type': 'application/json; charset=utf-8'
      };

      this._restApiClient.executeApiCall('POST', path, httpHeaders, content, _callback);
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#addModule
   * @description       Add the given module to the registry.
   *
   * @param {Module} module         Module object to add to the registry.
   * @param {Function} [done]       The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), the
   *                                body of the response, and a transport-specific
   *                                response object useful for logging or
   *                                debugging.
   * @returns {Promise<ResultWithHttpResponse<any>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}       If the module or done argument is falsy.
   * @throws {ArgumentError}        If the module object is missing a deviceId or moduleId value.
   */
  addModule(module: Module, done: HttpResponseCallback<any>): void;
  addModule(module: Module): Promise<ResultWithHttpResponse<any>>;
  addModule(module: Module, done?: HttpResponseCallback<any>): Promise<ResultWithHttpResponse<any>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_026: [The `addModule` method shall throw a `ReferenceError` exception if `module` or `done` is falsy. ]*/
      if (!module) throw new ReferenceError('Argument \'module\' cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_027: [The `addModule` method shall throw an `ArgumentError` exception if `module.deviceId` or `module.moduleId` is falsy. ]*/
      if (!module.deviceId) throw new ArgumentError('deviceId property is missing from module object');
      if (!module.moduleId) throw new ArgumentError('moduleId property is missing from module object');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_028: [The `addModule` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      PUT /devices/<encodeURIComponent(module.deviceId)>/modules/<encodeURIComponent(module.moduleId)>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>

      <module>
      ```
      ]*/
      const preparedModule = JSON.parse(JSON.stringify(module));
      this._normalizeAuthentication(preparedModule);

      const path = `${endpoint.modulePath(encodeURIComponent(preparedModule.deviceId), encodeURIComponent(preparedModule.moduleId))}${endpoint.versionQueryString()}`;
      const httpHeaders = {
        'Content-Type': 'application/json; charset=utf-8'
      };

      this._restApiClient.executeApiCall('PUT', path, httpHeaders, preparedModule, _callback);
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#getModulesOnDevice
   * @description       Get a list of all modules on an IoT Hub device
   *
   * @param {String}    deviceId  ID of the device we're getting modules for
   * @param {Function}  [done]    The optional callback which will be called with either an Error object
   *                              or an array of module:azure-iothub.Module objects
   *                              for all the modules.
   *
   * @throws {ReferenceError}     If the deviceId or done argument is falsy.
   */
  getModulesOnDevice(deviceId: string, done: HttpResponseCallback<Module[]>): void;
  getModulesOnDevice(deviceId: string): Promise<ResultWithHttpResponse<Module[]>>;
  getModulesOnDevice(deviceId: string, done?: HttpResponseCallback<Module[]>): Promise<ResultWithHttpResponse<Module[]>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_029: [The `getModulesOnDevice` method shall throw a `ReferenceError` exception if `deviceId` or `done` is falsy. ]*/
      if (!deviceId) throw new ReferenceError('Argument \'deviceId\' cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_030: [The `getModulesOnDevice` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      GET /devices/<encodeURIComponent(deviceId)>/modules?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Request-Id: <guid>
      ```
      ]*/
      const path = `${endpoint.devicePath(encodeURIComponent(deviceId))}/modules${endpoint.versionQueryString()}`;
      this._restApiClient.executeApiCall('GET', path, null, null, _callback);
    }, done);
  }

  /**
   * @method            module:azure-iothub.Registry#getModule
   * @description       Get a single module from a device on an IoT Hub
   *
   * @param {String} deviceId     Device ID that owns the module.
   * @param {String} moduleId     Module ID to retrieve
   * @param {Function} [done]     The optional callback which will be called with either an Error object
   *                              or the module:azure-iothub.Module object for the requested module
   * @returns {Promise<ResultWithHttpResponse<Module>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}     If the deviceId, moduleId, or done argument is falsy.
   */
  getModule(deviceId: string, moduleId: string, done: HttpResponseCallback<Module>): void;
  getModule(deviceId: string, moduleId: string): Promise<ResultWithHttpResponse<Module>>;
  getModule(deviceId: string, moduleId: string, done?: HttpResponseCallback<Module>): Promise<ResultWithHttpResponse<Module>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_031: [The `getModule` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, or `done` is falsy. ]*/
      if (!deviceId) throw new ReferenceError('Argument \'deviceId\' cannot be falsy');
      if (!moduleId) throw new ReferenceError('Argument \'moduleId\' cannot be falsy');

      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_032: [The `getModule` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      get /devices/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Request-Id: <guid>
      ```
      ]*/
      const path = `${endpoint.modulePath(encodeURIComponent(deviceId), encodeURIComponent(moduleId))}${endpoint.versionQueryString()}`;
      this._restApiClient.executeApiCall('GET', path, null, null, _callback);
    }, done);
  }

  _updateModule(module: Module, forceUpdateOrDone: boolean | HttpResponseCallback<any>, done?: HttpResponseCallback<any>): void {
    let forceUpdate: boolean;
    if (typeof (forceUpdateOrDone) === 'function') {
      forceUpdate = false;
      done = forceUpdateOrDone;
    } else {
      forceUpdate = forceUpdateOrDone;
    }

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_033: [The `updateModule` method shall throw a `ReferenceError` exception if `module` or `done` is falsy. ]*/
    if (!module) throw new ReferenceError('Argument \'module\' cannot be falsy');
    if (!done) throw new ReferenceError('Argument \'done\' cannot be falsy');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_034: [The `updateModule` method shall throw an `ArgumentError` exception if `module.deviceId` or `module.moduleId` is falsy. ]*/
    if (!module.moduleId) throw new ArgumentError('moduleId property is missing from module object');
    if (!module.deviceId) throw new ArgumentError('deviceId property is missing from module object');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_035: [The `updateModule` method shall throw an `ArgumentError` exception if `forceUpdate` is falsy and `module.etag` is falsy. ]*/
    if (!forceUpdate && !module.etag) {
      throw new ArgumentError('The ETag should be set while updating the Module.');
    }

    const preparedModule = JSON.parse(JSON.stringify(module));
    this._normalizeAuthentication(preparedModule);

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_036: [If `forceUpdate` is not truthy, the `updateModule` shall put the `etag` parameter into the `If-Match` header value. ]*/
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_037: [If `forceUpdate` is truthy, the `updateModule` method shall put `*` into the `If-Match` header value. ]*/
    const httpHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'If-Match': this.ensureQuoted(forceUpdate ? '*' : preparedModule.etag)
    };

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_038: [The `updateModule` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    PUT /devices/<encodeURIComponent(module.deviceId)>/modules/<encodeURIComponent(module.moduleId)>?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    If-Match: <etag | *
    Request-Id: <guid>

    <module>
    ```
    ]*/

    const path = `${endpoint.modulePath(encodeURIComponent(preparedModule.deviceId), encodeURIComponent(preparedModule.moduleId))}${endpoint.versionQueryString()}`;
    this._restApiClient.executeApiCall('PUT', path, httpHeaders, preparedModule, done);
  }

  /**
   * @method            module:azure-iothub.Registry#updateModule
   * @description       Update the given module object in the registry
   *
   * @param {Module} module         Module object to update.
   * @param {boolean} forceUpdate   Set to true to force the update by ignoring the eTag
   *                                in the Module object (optional. default: false)
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), the
   *                                body of the response, and a transport-specific
   *                                response object useful for logging or
   *                                debugging.
   * @returns {Promise<ResultWithHttpResponse<any>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}       If the module or done argument is falsy.
   * @throws {ArgumentError}        If the module object is missing an etag and
   *                                forceUpdate is not set to true, or the module
   *                                object is missing it's deviceId or moduleId property.
   */
  updateModule(module: Module, done: TripleValueCallback<any, any>): void;
  updateModule(module: Module, forceUpdate: boolean, done: HttpResponseCallback<any>): void;
  updateModule(module: Module, forceUpdate: boolean): Promise<ResultWithHttpResponse<any>>;
  updateModule(module: Module): Promise<ResultWithHttpResponse<any>>;
  updateModule(module: Module, forceUpdateOrDone?: boolean | HttpResponseCallback<any>, done?: HttpResponseCallback<any>): Promise<ResultWithHttpResponse<any>> | void {
    const callback = done || ((typeof forceUpdateOrDone === 'function') ? forceUpdateOrDone : undefined);

    if (callback) {
      return this._updateModule(module, forceUpdateOrDone, done);
    }

    return httpCallbackToPromise((_callback) => {
      this._updateModule(module, forceUpdateOrDone, _callback);
    });
  }

  _removeModule(moduleOrDeviceId: Module | string, doneOrModuleId: HttpResponseCallback<any> | string, done?: HttpResponseCallback<any>): void {
    let moduleId: string;
    let deviceId: string;
    let etag: string;

    if (moduleOrDeviceId && ((moduleOrDeviceId as any).moduleId)) { // can't do "instanceof Module" at runtime because Module is an interface
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_041: [if a `Module` object is passed in, `removeModule` shall use the `deviceId`, `moduleId`, and `etag` from the `Module` object.]*/
      done = doneOrModuleId as TripleValueCallback<any, any>;
      let module = moduleOrDeviceId as Module;
      deviceId = module.deviceId;
      moduleId = module.moduleId;
      etag = module.etag;
    } else {
      /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_042: [if a `deviceId` and `moduleId` are passed in, `removeModule` shall use those values and the `etag` shall be `*`.]*/
      deviceId = moduleOrDeviceId as string;
      moduleId = doneOrModuleId as string;
      etag = '*';
    }

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_039: [The `removeModule` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, or `done` is falsy. ]*/
    if (!deviceId) throw new ReferenceError('\'deviceId\' cannot be falsy');
    if (!moduleId) throw new ReferenceError('\'moduleId\' cannot be falsy');
    if (!done) throw new ReferenceError('Argument \'done\' cannot be falsy');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_043: [The `removeModule` method shall throw an `ArgumentError` if `deviceId` or `moduleId` parameters are not strings.]*/
    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_044: [The `removeModule` method shall throw an `ArgumentError` if the `done` parameter is not a function.]*/
    if (typeof deviceId !== 'string') throw new ArgumentError('\'deviceId\' must be a string');
    if (typeof moduleId !== 'string') throw new ArgumentError('\'moduleId\' must be a string');
    if (typeof (done) !== 'function') throw new ArgumentError('\'done\' must be a function');

    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_040: [The `removeModule` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    DELETE /devices/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    Request-Id: <guid>
    If-Match: "<etag>"
    ```
    ]*/
    const httpHeaders = {
      'If-Match': this.ensureQuoted(etag)
    };

    const path = `${endpoint.modulePath(encodeURIComponent(deviceId), encodeURIComponent(moduleId))}${endpoint.versionQueryString()}`;

    this._restApiClient.executeApiCall('DELETE', path, httpHeaders, null, done);
  }

  /**
   * @method            module:azure-iothub.Registry#removeModule
   * @description       Remove the given module from the registry
   *
   * @param {String} deviceId       Device ID that owns the module
   * @param {String} moduleId       Module ID to remove
   * @param {Function}  [done]      The optional function to call when the operation is
   *                                complete. `done` will be called with three
   *                                arguments: an Error object (can be null), the
   *                                body of the response, and a transport-specific
   *                                response object useful for logging or
   *                                debugging.
   * @returns {Promise<ResultWithHttpResponse<any>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}       If the done deviceId, moduleId, or argument is falsy.
   */
  removeModule(module: Module, done: TripleValueCallback<any, any>): void;
  removeModule(deviceId: string, moduleId: string, done: TripleValueCallback<any, any>): void;
  removeModule(moduleOrDeviceId: Module | string, moduleId: string): Promise<ResultWithHttpResponse<any>>;
  removeModule(moduleOrDeviceId: Module | string): Promise<ResultWithHttpResponse<any>>;
  removeModule(moduleOrDeviceId: Module | string, doneOrModuleId?: HttpResponseCallback<any> | string, done?: HttpResponseCallback<any>): Promise<ResultWithHttpResponse<any>> | void {
    const callback = done || ((typeof doneOrModuleId === 'function') ? doneOrModuleId : undefined);

    if (callback) {
      return this._removeModule(moduleOrDeviceId, doneOrModuleId, callback as HttpResponseCallback<any>);
    }

    return httpCallbackToPromise((_callback) => {
      this._removeModule(moduleOrDeviceId, doneOrModuleId, _callback);
    });
  }

  private _bulkOperation(devices: Registry.DeviceDescription[], done: IncomingMessageCallback<any>): void {
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

  private _processBulkDevices(devices: Registry.DeviceDescription[], operation: Registry.BulkRegistryOperationType, force: boolean, forceTrueAlternative: Registry.BulkRegistryOperationType, forceFalseAlternative: Registry.BulkRegistryOperationType, done: IncomingMessageCallback<any>): void {
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
          this._normalizeAuthentication(preparedDevice);
          bulkArray.push(preparedDevice);
        }
      });

      this._bulkOperation(bulkArray, done);
    }
  }

  private _executeQueryFunc(sqlQuery: string, pageSize: number): (continuationToken: string, done: IncomingMessageCallback<any>) => void {
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

  private _normalizeAuthentication(deviceInfo: Registry.DeviceDescription): void {
    if (!deviceInfo.hasOwnProperty('authentication')) {
      /* Codes_SRS_NODE_IOTHUB_REGISTRY_06_028: [A device information with no authentication will be normalized with the following authentication:
      authentication : {
        type: 'sas',
        symmetricKey: {
          primaryKey: '',
          secondaryKey: ''
        }
      }
      ] */
      deviceInfo.authentication = {
        type: 'sas',
        symmetricKey: {
          primaryKey: '',
          secondaryKey: ''
        }
      };
      /* Codes_SRS_NODE_IOTHUB_REGISTRY_06_029: [** A device information with an authentication object that contains a `type` property is considered normalized.] */
    } else if (!deviceInfo.authentication.hasOwnProperty('type')) {
      if (deviceInfo.authentication.x509Thumbprint && (deviceInfo.authentication.x509Thumbprint.primaryThumbprint || deviceInfo.authentication.x509Thumbprint.secondaryThumbprint)) {
        /* Codes_SRS_NODE_IOTHUB_REGISTRY_06_030: [A device information with an authentication object that contains the x509Thumbprint property with at least one of `primaryThumbprint` or `secondaryThumbprint` sub-properties will be normalized with a `type` property with value "selfSigned".] */
        deviceInfo.authentication.type = 'selfSigned';
      } else {
        /* Codes_SRS_NODE_IOTHUB_REGISTRY_06_031: [A device information with an authentication object that doesn't contain the x509Thumbprint property will be normalized with a `type` property with value "sas".] */
        deviceInfo.authentication.type = 'sas';
      }
    }
  }

  private ensureQuoted(eTag: string): string {
    const tagLength = eTag.length;
    if (tagLength === 0) {
      return '""';
    } else if ((eTag.slice(0, 1) === '"') && (eTag.slice(tagLength - 1, tagLength) === '"')) {
      return eTag;
    }
    return '"' + eTag + '"';
  }

  /**
   * @method          module:azure-iothub.Registry.fromConnectionString
   * @description     Constructs a Registry object from the given connection string.
   * @static
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
   * @description       Constructs a Registry object from the given shared access signature.
   * @static
   *
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

  export type ResponseCallback = TripleValueCallback<any, any>;
  export type JobCallback = Callback<JobStatus>;

  export interface DeviceDescription {
    deviceId: string;
    capabilities?: Device.Capabilities;
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
