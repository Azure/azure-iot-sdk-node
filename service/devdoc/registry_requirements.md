# azure-iothub.Registry Requirements

## Overview
`Registry` represents an IoT hub’s device identity service, known as the Registry.  A consumer can add, remove, update, or read device metadata from the Device Registry.
## Example usage

```javascript
'use strict';
var Registry = require('azure-iothub').Registry;

function print(err) {
  console.log(err.toString());
}

var connectionString = '[Connection string goes here]';
var registry = Registry.fromConnectionString(connectionString);

registry.create({deviceId: 'dev1'}, function (err, dev) {
  if (err) print(err);
  else {
    console.log(dev.deviceId);
    registry.get('dev1', function (err, dev) {
      if (err) print(err);
      else {
        console.log(dev.deviceId);
        registry.delete('dev1', function(err) {
          console.log('dev1 deleted');
        });
      }
    });
  }
});
```

## Constructors/Factory methods

### Registry(config, restApiClient) [constructor]
The `Registry` constructor initializes a new instance of a `Registry` object that is used to conduct operations on the device registry.

**SRS_NODE_IOTHUB_REGISTRY_16_023: [** The `Registry` constructor shall throw a `ReferenceError` if the `config` object is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_05_001: [** The `Registry` constructor shall throw an `ArgumentError` if the `config` object is missing one or more of the following properties:
- `host`: the IoT Hub hostname
- `sharedAccessSignature`: shared access signature with the permissions for the desired operations.
 **]**

**SRS_NODE_IOTHUB_REGISTRY_16_024: [** The `Registry` constructor shall use the `restApiClient` provided as a second argument if it is provided. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_025: [** The `Registry` constructor shall use `azure-iothub.RestApiClient` if no `restApiClient` argument is provided. **]**

### fromConnectionString(value) [static]
The `fromConnectionString` static method returns a new instance of the `Registry` object.

**SRS_NODE_IOTHUB_REGISTRY_05_008: [** The `fromConnectionString` method shall throw `ReferenceError` if the value argument is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_05_009: [** The `fromConnectionString` method shall derive and transform the needed parts from the connection string in order to create a `config` object for the constructor (see `SRS_NODE_IOTHUB_REGISTRY_05_001`). **]**

**SRS_NODE_IOTHUB_REGISTRY_05_010: [** The `fromConnectionString` method shall return a new instance of the `Registry` object. **]**

### fromSharedAccessSignature(value) [static]
The `fromSharedAccessSignature` static method returns a new instance of the `Registry` object.

**SRS_NODE_IOTHUB_REGISTRY_05_011: [** The `fromSharedAccessSignature` method shall throw `ReferenceError` if the value argument is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_05_012: [** The `fromSharedAccessSignature` method shall derive and transform the needed parts from the shared access signature in order to create a `config` object for the constructor (see `SRS_NODE_IOTHUB_REGISTRY_05_001`). **]**

**SRS_NODE_IOTHUB_REGISTRY_05_013: [** The `fromSharedAccessSignature` method shall return a new instance of the `Registry` object. **]**

## CRUD operation for the device registry

### normalize authentication
With 2017-06-30 api release crud device information MUST contain authentication specification

**SRS_NODE_IOTHUB_REGISTRY_06_028: [** A device information with no authentication will be normalized with the following authentication:
```
authentication : {
  type: 'sas',
  symmetricKey: {
    primaryKey: '',
    secondaryKey: ''
  }
}
```
**]**

**SRS_NODE_IOTHUB_REGISTRY_06_029: [** A device information with an authentication object that contains a `type` property is considered normalized. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_030: [** A device information with an authentication object that contains an `x509Thumbprint` property with at least one of `primaryThumbprint` or `secondaryThumbprint` sub-properties will be normalized with a `type` property with value "selfSigned". **]**

**SRS_NODE_IOTHUB_REGISTRY_06_031: [** A device information with an authentication object that doesn't contain the x509Thumbprint property will be normalized with a `type` property with value "sas". **]**

### create(deviceInfo, done)
The `create` method creates a device with the given device properties.

**SRS_NODE_IOTHUB_REGISTRY_07_001: [** The `create` method shall throw `ReferenceError` if the `deviceInfo` argument is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_07_001: [** The `create` method shall throw `ArgumentError` if the `deviceInfo` argument does not contain a `deviceId` property. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_026: [** The `create` method shall construct an HTTP request using information supplied by the caller, as follows:
```
PUT /devices/<encodeURIComponent(deviceInfo.deviceId)>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>

<deviceInfo>
```
**]**

### addDevices(devices, done)
The `addDevices` method adds an array of devices with the given device properties.

**SRS_NODE_IOTHUB_REGISTRY_06_004: [** The `addDevices` method shall throw `ReferenceError` if the `devices` argument is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_021: [** The `addDevices` method shall throw `ArgumentError` if devices is NOT an array. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_009: [** The `addDevices` method shall utilize an importMode = `create`. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_010: [** The `addDevices` method shall throw `ArgumentError` if any elements of devices do NOT contain a `deviceId` property. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_014: [** The `addDevices` method shall throw `ArgumentError` if devices.length == 0  or is greater than 100. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_011: [** The `addDevices` method shall construct an HTTP request using information supplied by the caller, as follows:
```
POST /devices?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>

<stringified array supplied by the argument devices annotated with importMode property and deviceId property replaced by id>
```
**]**

As an example of the content for two simple devices we would get:
```
[
 {"status":"enabled","authentication":{"symmetricKey":{"primaryKey":"","secondaryKey":""}},"id":"device1","importMode":"create"},
 {"status":"enabled","authentication":{"symmetricKey":{"primaryKey":"","secondaryKey":""}},"id":"device2","importMode":"create"}
]
```

### update(deviceInfo, done)
The `update` method updates an existing device identity with the given device properties.

**SRS_NODE_IOTHUB_REGISTRY_16_043: [** The `update` method shall throw `ReferenceError` if the `deviceInfo` argument is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_07_003: [** The `update` method shall throw `ArgumentError` if the first argument does not contain a `deviceId` property. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_027: [** The `update` method shall construct an HTTP request using information supplied by the caller, as follows:
```
PUT /devices/<encodeURIComponent(deviceInfo.deviceId)>?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>
If-Match: <deviceInfo.eTag>

<deviceInfo>
```
**]**


### updateDevices(devices, forceUpdate, done)
The `updateDevices` method updates existing devices with the given device properties.

**SRS_NODE_IOTHUB_REGISTRY_06_025: [** The `updateDevices` method shall throw `ReferenceError` if the `devices` argument is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_020: [** The `updateDevices` method shall throw `ArgumentError` if devices is NOT an array. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_024: [** The `updateDevices` method shall throw `ReferenceError` if the `forceUpdate` parameter is NOT typeof boolean. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_026: [** The `updateDevices` method shall throw `ReferenceError` if the `forceUpdate` parameter is null or undefined. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_008: [** If the `forceUpdate` parameter is true importMode will be set to `Update` otherwise it will be set to `UpdateIfMatchETag`. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_015: [** The `updateDevices` method shall throw `ArgumentError` if devices.length == 0  or is greater than 100. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_012: [** The `updateDevices` method shall throw `ArgumentError` if any elements of devices do NOT contain a `deviceId` property. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_013: [** The `updateDevices` method shall construct an HTTP request using information supplied by the caller, as follows:
```
POST /devices?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>

<list supplied by the argument devices annotated with importMode property and deviceId property replaced by id>
```
**]**

### get(deviceId, done)
The `get` method requests information about the device with the given ID.

**SRS_NODE_IOTHUB_REGISTRY_05_006: [** The `get` method shall throw `ReferenceError` if the supplied deviceId is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_028: [** The `get` method shall construct an HTTP request using information supplied by the caller, as follows:
```
GET /devices/<encodeURIComponent(deviceInfo.deviceId)>?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Request-Id: <guid>
```
**]**

### list(done)
The `list` method requests information about the first 1000 devices registered in an IoT hub’s identity service.

**SRS_NODE_IOTHUB_REGISTRY_16_029: [** The `list` method shall construct an HTTP request using information supplied by the caller, as follows:
```
GET /devices?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Request-Id: <guid>
```
**]**


### delete(deviceId, done)
The `delete` method removes a device with the given ID.

**SRS_NODE_IOTHUB_REGISTRY_07_007: [** The `delete` method shall throw `ReferenceError` if the supplied deviceId is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_030: [** The `delete` method shall construct an HTTP request using information supplied by the caller, as follows:
```
DELETE /devices/<encodeURIComponent(deviceInfo.deviceId)>?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
If-Match: *
Request-Id: <guid>
```
**]**

### removeDevices(devices, forceRemove, done)
The `removeDevices` method will take an array of devices and delete them from the hub.  If forceRemove is true the devices will be removed irrespective of any eTag.

**SRS_NODE_IOTHUB_REGISTRY_06_006: [** The `removeDevices` method shall throw `ReferenceError` if the deviceInfo is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_019: [** The `removeDevices` method shall throw `ArgumentError` if devices is NOT an array. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_023: [** The `removeDevices` method shall throw `ReferenceError` if the `forceRemove` parameter is NOT typeof boolean. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_027: [** The `removeDevices` method shall throw `ReferenceError` if the `forceRemove` parameter is null or undefined. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_007: [** If the `forceRemove` parameter is true then importMode will be set to `Delete` otherwise it will be set to `DeleteIfMatchETag`. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_016: [** The `removeDevices` method shall throw `ArgumentError` if devices.length == 0  or is greater than 100. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_017: [** The `removeDevices` method shall throw `ArgumentError` if any elements of devices do NOT contain a `deviceId` property. **]**

**SRS_NODE_IOTHUB_REGISTRY_06_018: [** The `removeDevices` method shall construct an HTTP request using information supplied by the caller, as follows:
```
POST /devices?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>

<stringified array supplied by the argument devices annotated with importMode property and deviceId property replaced by id>
```
**]**

## Bulk Import/Export of devices

### importDevicesFromBlob(inputBlobContainerUri, outputBlobContainerUri, done)
The `importDevicesFromBlob` imports a list of devices from a blob named devices.txt found at the input URI given as a parameter, and output logs from the import job in a blob at found at the output URI given as a parameter.

**SRS_NODE_IOTHUB_REGISTRY_16_001: [** A `ReferenceError` shall be thrown if `inputBlobContainerUri` is falsy **]**

**SRS_NODE_IOTHUB_REGISTRY_16_002: [** A `ReferenceError` shall be thrown if `outputBlobContainerUri` is falsy **]**

**SRS_NODE_IOTHUB_REGISTRY_16_031: [** The `importDeviceFromBlob` method shall construct an HTTP request using information supplied by the caller, as follows:
```
POST /jobs/create?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>

{
  "type": "import",
  "inputBlobContainerUri": "<input container Uri given as parameter>",
  "outputBlobContainerUri": "<output container Uri given as parameter>"
}
```
**]**

### exportDevicesToBlob(outputBlobContainerUri, excludeKeys, done)
The `exportDevicesToBlob` exports a list of devices in a blob named devices.txt and logs from the export job at the output URI given as a parameter given as a parameter the export will contain security keys if the excludeKeys is false.

**SRS_NODE_IOTHUB_REGISTRY_16_004: [** A `ReferenceError` shall be thrown if outputBlobContainerUri is falsy **]**

**SRS_NODE_IOTHUB_REGISTRY_16_032: [** The `exportDeviceToBlob` method shall construct an HTTP request using information supplied by the caller, as follows:
```
POST /jobs/create?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>

{
  "type": "export",
  "outputBlobContainerUri": "<output container Uri given as parameter>",
  "excludeKeysInExport": "<excludeKeys Boolean given as parameter>"
}
```
**]**

### listJobs(done)
The `listJobs` method will obtain a list of recent bulk import/export jobs (including the active one, if any).

**SRS_NODE_IOTHUB_REGISTRY_16_037: [** The `listJobs` method shall construct an HTTP request using information supplied by the caller, as follows:
```
GET /jobs?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Request-Id: <guid>
```
**]**

### getJob(jobId, done)
The `getJob` method will obtain status information of the bulk import/export job identified by the `jobId` parameter.

**SRS_NODE_IOTHUB_REGISTRY_16_006: [** A `ReferenceError` shall be thrown if jobId is falsy **]**

**SRS_NODE_IOTHUB_REGISTRY_16_038: [** The `getJob` method shall construct an HTTP request using information supplied by the caller, as follows:
```
GET /jobs/<jobId>?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Request-Id: <guid>
```
**]**

### cancelJob(jobId, done)
The `cancelJob` method will cancel the bulk import/export job identified by the `jobId` parameter.

**SRS_NODE_IOTHUB_REGISTRY_16_012: [** A `ReferenceError` shall be thrown if the jobId is falsy **]**

**SRS_NODE_IOTHUB_REGISTRY_16_039: [** The `cancelJob` method shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /jobs/<jobId>?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Request-Id: <guid>
```
**]**

## Device Twin operations

### getTwin(deviceId, done)
The `getTwin` method retrieves the latest Device Twin state in the device registry.

**SRS_NODE_IOTHUB_REGISTRY_16_019: [** The `getTwin` method shall throw a `ReferenceError` if the `deviceId` parameter is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_020: [** The `getTwin` method shall throw a `ReferenceError` if the `done` parameter is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_036: [** The `getTwin` method shall call the `done` callback with a `twin` object updated with the latest property values stored in the IoT Hub service. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_049: [** The `getTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
```
GET /twins/<encodeURIComponent(twin.deviceId)>?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Request-Id: <guid>
```
**]**

### updateDeviceTwin(deviceId, patch, etag, done)
The `updateDeviceTwin` method updates the device twin identified with the `deviceId` argument with the properties and tags contained in the `patch` object.

**SRS_NODE_IOTHUB_REGISTRY_16_044: [** The `updateDeviceTwin` method shall throw a `ReferenceError` if the `deviceId` argument is `undefined`, `null` or an empty string. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_045: [** The `updateDeviceTwin` method shall throw a `ReferenceError` if the `patch` argument is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_046: [** The `updateDeviceTwin` method shall throw a `ReferenceError` if the `etag` argument is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_050: [** The `updateDeviceTwin` method shall call the `done` callback with a `twin` object updated with the latest property values stored in the IoT Hub service. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_048: [** The `updateDeviceTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
```
PATCH /twins/<encodeURIComponent(deviceId)>?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>
If-Match: <etag>

<patch>
```
**]**

### createQuery(sqlQuery, pageSize)
The `createQuery` method initializes a new instance of a `DeviceQuery` object with the `sqlQuery` and `pageSize` arguments.

**SRS_NODE_IOTHUB_REGISTRY_16_051: [** The `createQuery` method shall throw a `ReferenceError` if the `sqlQuery` argument is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_052: [** The `createQuery` method shall throw a `TypeError` if the `sqlQuery` argument is not a string. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_053: [** The `createQuery` method shall throw a `TypeError` if the `pageSize` argument is not `null`, `undefined` or a number. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_054: [** The `createQuery` method shall return a new `Query` instance initialized with the `sqlQuery` and the `pageSize` argument if specified. **]**

### _executeQueryFunc(sqlQuery, pageSize)
The `_executeQueryFunc` method runs a SQL query against the device databases and calls the `done` callback with the results.

**SRS_NODE_IOTHUB_REGISTRY_16_057: [** The `_executeQueryFunc` method shall construct an HTTP request as follows:
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
```
**]**

### getRegistryStatistics(done)
The `getRegistryStatistics` method retrieves the count of devices (enabled, disabled and total) currently in the device identity registry.

**SRS_NODE_IOTHUB_REGISTRY_16_058: [** The `getRegistryStatics` method shall construct an HTTP request using information supplied by the caller as follows:
```
GET /statistics/devices?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Request-Id: <guid>
```
**]**

## Module Twins

### getModuleTwin(deviceId: string, moduleId: string, done: (err: Error, twin?: Twin, response?: any) => void): void;

**SRS_NODE_IOTHUB_REGISTRY_18_001: [** The `getModuleTwin` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_002: [** The `getModuleTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
```
  GET /twins/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
  Authorization: <config.sharedAccessSignature>
  Request-Id: <guid>
```
**]**

**SRS_NODE_IOTHUB_REGISTRY_18_003: [** The `getModuleTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service. **]**

### updateModuleTwin(deviceId: string, moduleId: string, patch: any, etag: string, done: Registry.ResponseCallback): void;

**SRS_NODE_IOTHUB_REGISTRY_18_004: [** The `updateModuleTwin` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, `patch`, `etag`,or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_005: [** The `updateModuleTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
```
PATCH /twins/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
Authorization: <config.sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>
If-Match: <etag>
<patch>
```
**]**

**SRS_NODE_IOTHUB_REGISTRY_18_006: [** The `updateModuleTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service. **]**

## Device configuration

### addConfiguration(configuration: Configuration, done: Registry.ResponseCallback): void;

**SRS_NODE_IOTHUB_REGISTRY_18_007: [** The `addConfiguration` method shall throw a `ReferenceError` exception if `configuration` or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_008: [** The `addConfiguration` method shall throw an `ArgumentError` exception if `configuration.id` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_009: [** The `addConfiguration` method shall set `configuration.schemaVersion` to '1.0' if it is not already set. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_010: [** The `addConfiguration` method shall construct an HTTP request using information supplied by the caller, as follows:
```
PUT /configurations/<encodeURIComponent(configuration.id)>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>

<configuration>
```
**]**

### getConfiguration(configurationId: string, done: Registry.ResponseCallback): void;

**SRS_NODE_IOTHUB_REGISTRY_18_011: [** The `getConfiguration` method shall throw a `ReferenceError` exception if `configurationId` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_012: [** The `getConfiguration` method shall construct an HTTP request using information supplied by the caller, as follows:
```
GET /configurations/<encodeURIComponent(configurationId)>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Request-Id: <guid>
```
**]**

### getConfigurations(done: Registry.ResponseCallback): void;

**SRS_NODE_IOTHUB_REGISTRY_18_013: [** The `getConfigurations` method shall throw a `ReferenceError` exception if `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_014: [** The `getConfigurations` method shall construct an HTTP request using information supplied by the caller, as follows:
```
GET /configurations?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Request-Id: <guid>
```
**]**

### updateConfiguration(configuration: Configuration, done: Registry.ResponseCallback): void;
### updateConfiguration(configuration: Configuration, forceUpdate: boolean, done: Registry.ResponseCallback): void;
### updateConfiguration(configuration: Configuration, forceUpdateOrDone: boolean | Registry.ResponseCallback, done?: Registry.ResponseCallback): void;

**SRS_NODE_IOTHUB_REGISTRY_18_015: [** The `updateConfiguration` method shall throw a `ReferenceError` exception if `configuration` or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_016: [** The `updateConfiguration` method shall throw an `ArgumentError` exception if `forceUpdate` is falsy and `configuration.etag` is also falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_017: [** The `updateConfiguration` method shall throw an `ArgumentError` exception if `configuration.id` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_018: [** The `updateConfiguration` method shall set ``configuration.schemaVersion` to '1.0' if it is not already set. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_020: [** If `forceUpdate` is not truthy, the `updateConfigurationMethod` shall put the `etag` parameter into the `If-Match` header value. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_021: [** If `forceUpdate` is truthy, the `updateConfiguration` method shall put `*` into the `If-Match` header value. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_019: [** The `updateConfiguration` method shall construct an HTTP request using information supplied by the caller, as follows:
```
PUT </configurations/<encodeURIComponent(configurationId)>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Content-Type: application/json; charset=utf-8
If-Match: <etag | *>
Request-Id: <guid>

<configuration>
```
**]**

### removeConfiguration(configurationId: string, done: Registry.ResponseCallback): void;

**SRS_NODE_IOTHUB_REGISTRY_18_022: [** The `removeConfiguration` method shall throw a `ReferenceError` exception if `configurationId` or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_023: [** The `removeConfiguration` method shall construct an HTTP request using information supplied by the caller, as follows:
```
DELETE /configurations/<encodeURIComponent(configurationId)>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Request-Id: <guid>
```
**]**

### applyConfigurationContentOnDevice(deviceId: string, content: ConfigurationContent, done: Registry.ResponseCallback): void;

**SRS_NODE_IOTHUB_REGISTRY_18_024: [** The `applyConfigurationContentOnDevice` method shall throw a `ReferenceError` exception if `deviceId`, `content`, or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_025: [** The `applyConfigurationContentOnDevice` method shall construct an HTTP request using information supplied by the caller, as follows:
```
POST /devices/<encodeURIComponent(deviceId)>/applyConfigurationContent?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>

<content>
```
**]**

## Module CRUD

### addModule(module: Module, done: Registry.ResponseCallback): void;

**SRS_NODE_IOTHUB_REGISTRY_18_026: [** The `addModule` method shall throw a `ReferenceError` exception if `module` or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_027: [** The `addModule` method shall throw an `ArgumentError` exception if `module.deviceId` or `module.moduleId` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_028: [** The `addModule` method shall construct an HTTP request using information supplied by the caller, as follows:
```
PUT /devices/<encodeURIComponent(module.deviceId)>/modules/<encodeURIComponent(module.moduleId)>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Content-Type: application/json; charset=utf-8
Request-Id: <guid>

<module>
```
**]**

### getModulesOnDevice(deviceId: string, done: (err: Error, modules?: Module[], response?: any) => void): void;

**SRS_NODE_IOTHUB_REGISTRY_18_029: [** The `getModulesOnDevice` method shall throw a `ReferenceError` exception if `deviceId` or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_030: [** The `getModulesOnDevice` method shall construct an HTTP request using information supplied by the caller, as follows:
```
GET /devices/<encodeURIComponent(deviceId)>/modules?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Request-Id: <guid>
```
**]**

### getModule(deviceId: string, moduleId: string, done: (err: Error, module?: Module, response?: any) => void): void;

**SRS_NODE_IOTHUB_REGISTRY_18_031: [** The `getModule` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_032: [** The `getModule` method shall construct an HTTP request using information supplied by the caller, as follows:
```
get /devices/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Request-Id: <guid>
```
**]**

### updateModule(module: Module, done: Registry.ResponseCallback): void;
### updateModule(module: Module, forceUpdate: boolean, done: Registry.ResponseCallback): void;
### updateModule(module: Module, forceUpdateOrDone: boolean | Registry.ResponseCallback, done?: Registry.ResponseCallback): void;

**SRS_NODE_IOTHUB_REGISTRY_18_033: [** The `updateModule` method shall throw a `ReferenceError` exception if `module` or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_034: [** The `updateModule` method shall throw an `ArgumentError` exception if `module.deviceId` or `module.moduleId` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_035: [** The `updateModule` method shall throw an `ArgumentError` exception if `forceUpdate` is falsy and `module.etag` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_036: [** If `forceUpdate` is not truthy, the `updateModule` shall put the `etag` parameter into the `If-Match` header value. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_037: [** If `forceUpdate` is truthy, the `updateModule` method shall put `*` into the `If-Match` header value. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_038: [** The `updateModule` method shall construct an HTTP request using information supplied by the caller, as follows:
```
PUT /devices/<encodeURIComponent(module.deviceId)>/modules/<encodeURIComponent(module.moduleId)>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Content-Type: application/json; charset=utf-8
If-Match: <etag | *
Request-Id: <guid>

<module>
```
**]**

### removeModule(module: Module, done: Registry.ResponseCallback): void;
### removeModule(deviceId: string, moduleId: string, done: Registry.ResponseCallback): void;
### removeModule(moduleOrDeviceId: Module | string, doneOrModuleId: Registry.ResponseCallback | string, done?: Registry.ResponseCallback): void;

**SRS_NODE_IOTHUB_REGISTRY_18_041: [** if a `Module` object is passed in, `removeModule` shall use the `deviceId`, `moduleId`, and `etag` from the `Module` object. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_042: [** if a `deviceId` and `moduleId` are passed in, `removeModule` shall use those values and the `etag` shall be `*`. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_039: [** The `removeModule` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, or `done` is falsy. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_043: [** The `removeModule` method shall throw an `ArgumentError` if `deviceId` or `moduleId` parameters are not strings. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_044: [** The `removeModule` method shall throw an `ArgumentError` if the `done` parameter is not a function. **]**

**SRS_NODE_IOTHUB_REGISTRY_18_040: [** The `removeModule` method shall construct an HTTP request using information supplied by the caller, as follows:
```
DELETE /devices/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Request-Id: <guid>
If-Match: "<etag>"
```
**]**

## All HTTP requests
All HTTP requests to the registry API should implement the following requirements:

**SRS_NODE_IOTHUB_REGISTRY_16_040: [** All requests shall contain a `User-Agent` header that uniquely identifies the SDK and SDK version used. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_041: [** All requests shall contain a `Request-Id` header that uniquely identifies the request and allows tracing of requests/responses in the logs. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_042: [** All requests shall contain a `Authorization` header that contains a valid shared access key. **]**

**SRS_NODE_IOTHUB_REGISTRY_16_033: [** If any registry operation method encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript `Error` object with a text description of the error (err.message). **]**

**SRS_NODE_IOTHUB_REGISTRY_16_035: [** When any registry operation method receives an HTTP response with a status code >= 300, it shall invoke the `done` callback function with an error translated using the requirements detailed in `registry_http_errors_requirements.md` **]**

**SRS_NODE_IOTHUB_REGISTRY_16_034: [** When any registry operation receives an HTTP response with a status code < 300, it shall invoke the `done` callback function with the following arguments:
- `err`: `null`
- `result`: A javascript object parsed from the body of the HTTP response
- `response`: the Node.js `http.ServerResponse` object returned by the transport
 **]**
