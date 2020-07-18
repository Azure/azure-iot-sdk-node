import { SharedAccessSignature, ResultWithHttpResponse } from 'azure-iot-common';
import { RestApiClient } from 'azure-iot-http-base';
import { Twin } from './twin';
import { Query } from './query';
import { Configuration, ConfigurationContent } from './configuration';
import { Device } from './device';
import { Module } from './module';
import { TripleValueCallback, Callback, HttpResponseCallback } from 'azure-iot-common';
/**
 * The Registry class provides access to the IoT Hub device identity service.
 * Users of the SDK should instantiate this class with one of the factory methods:
 * {@link azure-iothub.Registry.fromConnectionString|fromConnectionString} or {@link azure-iothub.Registry.fromSharedAccessSignature|fromSharedAccessSignature}.
 *
 * The protocol used for device identity registry operations is HTTPS.
 */
export declare class Registry {
    private _restApiClient;
    /**
     * @private
     * @constructor
     * @param {Object}  config      An object containing the necessary information to connect to the IoT Hub instance:
     *                              - host: the hostname for the IoT Hub instance
     *                              - sharedAccessSignature: A shared access signature with valid access rights and expiry.
     */
    constructor(config: Registry.TransportConfig, restApiClient?: RestApiClient);
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
    /**
     * @method              module:azure-iothub.Registry#listJobs
     * @description         List the last import/export jobs (including the active one, if any).
     * @param {Function}    [done]  The optional function to call with two arguments: an error object if an error happened,
     *                              (null otherwise) and the list of past jobs as an argument.
     * @returns {Promise<ResultWithHttpResponse<any>> | void} Promise if no callback function was passed, void otherwise.
     */
    listJobs(done: HttpResponseCallback<any>): void;
    listJobs(): Promise<ResultWithHttpResponse<any>>;
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
    /**
     * @method              module:azure-iothub.Registry#createQuery
     * @description         Creates a query that can be run on the IoT Hub instance to find information about devices or jobs.
     * @param {String}      sqlQuery   The query written as an SQL string.
     * @param {Number}      pageSize   The desired number of results per page (optional. default: 1000, max: 10000).
     *
     * @throws {ReferenceError}        If the sqlQuery argument is falsy.
     * @throws {TypeError}             If the sqlQuery argument is not a string or the pageSize argument not a number, null or undefined.
     */
    createQuery(sqlQuery: string, pageSize?: number): Query;
    /**
     * @method                module:azure-iothub.Registry#getRegistryStatistics
     * @description           Gets statistics about the devices in the device identity registry.
     * @param {Function}      [done]   The optional callback that will be called with either an Error object or
     *                                 the device registry statistics.
     * @returns {Promise<ResultWithHttpResponse<Registry.RegistryStatistics>> | void} Promise if no callback function was passed, void otherwise.
     */
    getRegistryStatistics(done: HttpResponseCallback<Registry.RegistryStatistics>): void;
    getRegistryStatistics(): Promise<ResultWithHttpResponse<Registry.RegistryStatistics>>;
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
    _updateConfiguration(configuration: Configuration, forceUpdateOrDone: boolean | HttpResponseCallback<any>, done?: HttpResponseCallback<any>): void;
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
    _updateModule(module: Module, forceUpdateOrDone: boolean | HttpResponseCallback<any>, done?: HttpResponseCallback<any>): void;
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
    _removeModule(moduleOrDeviceId: Module | string, doneOrModuleId: HttpResponseCallback<any> | string, done?: HttpResponseCallback<any>): void;
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
    private _bulkOperation;
    private _processBulkDevices;
    private _executeQueryFunc;
    private _normalizeAuthentication;
    private ensureQuoted;
    /**
     * @method          module:azure-iothub.Registry.fromConnectionString
     * @description     Constructs a Registry object from the given connection string.
     * @static
     * @param {String}  value       A connection string which encapsulates the
     *                              appropriate (read and/or write) Registry
     *                              permissions.
     * @returns {module:azure-iothub.Registry}
     */
    static fromConnectionString(value: string): Registry;
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
    static fromSharedAccessSignature(value: string): Registry;
}
export declare namespace Registry {
    interface TransportConfig {
        host: string;
        sharedAccessSignature: string | SharedAccessSignature;
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
    type ResponseCallback = TripleValueCallback<any, any>;
    type JobCallback = Callback<JobStatus>;
    interface DeviceDescription {
        deviceId: string;
        capabilities?: Device.Capabilities;
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
    type BulkRegistryOperationType = 'create' | 'Update' | 'UpdateIfMatchETag' | 'Delete' | 'DeleteIfMatchETag';
}
