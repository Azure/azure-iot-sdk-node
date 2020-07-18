// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var https_1 = require("https");
var azure_iot_http_base_1 = require("azure-iot-http-base");
var ConnectionString = require("./connection_string");
var twin_1 = require("./twin");
var query_1 = require("./query");
var device_1 = require("./device");
var azure_iot_common_2 = require("azure-iot-common");
// tslint:disable-next-line:no-var-requires
var packageJson = require('../package.json');
var ArgumentError = azure_iot_common_1.errors.ArgumentError;
/**
 * The Registry class provides access to the IoT Hub device identity service.
 * Users of the SDK should instantiate this class with one of the factory methods:
 * {@link azure-iothub.Registry.fromConnectionString|fromConnectionString} or {@link azure-iothub.Registry.fromSharedAccessSignature|fromSharedAccessSignature}.
 *
 * The protocol used for device identity registry operations is HTTPS.
 */
/*Codes_SRS_NODE_IOTHUB_REGISTRY_05_001: [The Registry constructor shall accept a transport object]*/
var Registry = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param {Object}  config      An object containing the necessary information to connect to the IoT Hub instance:
     *                              - host: the hostname for the IoT Hub instance
     *                              - sharedAccessSignature: A shared access signature with valid access rights and expiry.
     */
    function Registry(config, restApiClient) {
        if (!config) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_023: [The `Registry` constructor shall throw a `ReferenceError` if the config object is falsy.]*/
            throw new ReferenceError('The \'config\' parameter cannot be \'' + config + '\'');
        }
        else if (!config.host || !config.sharedAccessSignature) {
            /*SRS_NODE_IOTHUB_REGISTRY_05_001: [** The `Registry` constructor shall throw an `ArgumentException` if the config object is missing one or more of the following properties:
            - `host`: the IoT Hub hostname
            - `sharedAccessSignature`: shared access signature with the permissions for the desired operations.]*/
            throw new ArgumentError('The \'config\' argument is missing either the host or the sharedAccessSignature property');
        }
        /*SRS_NODE_IOTHUB_REGISTRY_16_024: [The `Registry` constructor shall use the `restApiClient` provided as a second argument if it is provided.]*/
        /*SRS_NODE_IOTHUB_REGISTRY_16_025: [The `Registry` constructor shall use `azure-iothub.RestApiClient` if no `restApiClient` argument is provided.]*/
        // This httpRequestBuilder parameter is used only for unit-testing purposes and should not be used in other situations.
        this._restApiClient = restApiClient || new azure_iot_http_base_1.RestApiClient(config, packageJson.name + '/' + packageJson.version);
        if (this._restApiClient.setOptions) {
            this._restApiClient.setOptions({ http: { agent: new https_1.Agent({ keepAlive: true }) } });
        }
    }
    Registry.prototype.create = function (deviceInfo, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            if (!deviceInfo) {
                /*Codes_SRS_NODE_IOTHUB_REGISTRY_07_001: [The `create` method shall throw `ReferenceError` if the `deviceInfo` argument is falsy. **]*/
                throw new ReferenceError('deviceInfo cannot be \'' + deviceInfo + '\'');
            }
            else if (!deviceInfo.deviceId) {
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
            var path = azure_iot_common_1.endpoint.devicePath(encodeURIComponent(deviceInfo.deviceId)) + azure_iot_common_1.endpoint.versionQueryString();
            var httpHeaders = {
                'Content-Type': 'application/json; charset=utf-8'
            };
            var normalizedDeviceInfo = JSON.parse(JSON.stringify(deviceInfo));
            _this._normalizeAuthentication(normalizedDeviceInfo);
            _this._restApiClient.executeApiCall('PUT', path, httpHeaders, normalizedDeviceInfo, function (err, device, httpResponse) {
                if (err) {
                    _callback(err);
                }
                else {
                    _callback(null, new device_1.Device(device), httpResponse);
                }
            });
        }, done);
    };
    Registry.prototype.update = function (deviceInfo, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            if (!deviceInfo) {
                /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_043: [The `update` method shall throw `ReferenceError` if the `deviceInfo` argument is falsy.]*/
                throw new ReferenceError('deviceInfo cannot be \'' + deviceInfo + '\'');
            }
            else if (!deviceInfo.deviceId) {
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
            var path = azure_iot_common_1.endpoint.devicePath(encodeURIComponent(deviceInfo.deviceId)) + azure_iot_common_1.endpoint.versionQueryString();
            var httpHeaders = {
                'Content-Type': 'application/json; charset=utf-8',
                'If-Match': _this.ensureQuoted('*')
            };
            var normalizedDeviceInfo = JSON.parse(JSON.stringify(deviceInfo));
            _this._normalizeAuthentication(normalizedDeviceInfo);
            _this._restApiClient.executeApiCall('PUT', path, httpHeaders, normalizedDeviceInfo, function (err, device, httpResponse) {
                if (err) {
                    _callback(err);
                }
                else {
                    _callback(null, new device_1.Device(device), httpResponse);
                }
            });
        }, done);
    };
    Registry.prototype.get = function (deviceId, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
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
            var path = azure_iot_common_1.endpoint.devicePath(encodeURIComponent(deviceId)) + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, function (err, device, httpResponse) {
                if (err) {
                    _callback(err);
                }
                else {
                    _callback(null, new device_1.Device(device), httpResponse);
                }
            });
        }, done);
    };
    Registry.prototype.list = function (done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_029: [The `list` method shall construct an HTTP request using information supplied by the caller, as follows:
               ```
               GET /devices?api-version=<version> HTTP/1.1
               Authorization: <config.sharedAccessSignature>
               Request-Id: <guid>
               ```]*/
            var path = azure_iot_common_1.endpoint.devicePath('') + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, function (err, devices, httpResponse) {
                if (err) {
                    _callback(err);
                }
                else {
                    _callback(null, devices ? devices.map(function (device) { return new device_1.Device(device); }) : [], httpResponse);
                }
            });
        }, done);
    };
    Registry.prototype.delete = function (deviceId, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
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
            var path = azure_iot_common_1.endpoint.devicePath(encodeURIComponent(deviceId)) + azure_iot_common_1.endpoint.versionQueryString();
            var httpHeaders = {
                'If-Match': _this.ensureQuoted('*')
            };
            _this._restApiClient.executeApiCall('DELETE', path, httpHeaders, null, _callback);
        }, done);
    };
    Registry.prototype.addDevices = function (devices, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            _this._processBulkDevices(devices, 'create', null, null, null, _callback);
        }, done);
    };
    Registry.prototype.updateDevices = function (devices, forceUpdate, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            _this._processBulkDevices(devices, null, forceUpdate, 'Update', 'UpdateIfMatchETag', _callback);
        }, done);
    };
    Registry.prototype.removeDevices = function (devices, forceRemove, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            _this._processBulkDevices(devices, null, forceRemove, 'Delete', 'DeleteIfMatchETag', _callback);
        }, done);
    };
    Registry.prototype.importDevicesFromBlob = function (inputBlobContainerUri, outputBlobContainerUri, done) {
        var _this = this;
        return azure_iot_common_2.callbackToPromise(function (_callback) {
            /* Codes_SRS_NODE_IOTHUB_REGISTRY_16_001: [A ReferenceError shall be thrown if importBlobContainerUri is falsy] */
            if (!inputBlobContainerUri)
                throw new ReferenceError('inputBlobContainerUri cannot be falsy');
            /* Codes_SRS_NODE_IOTHUB_REGISTRY_16_002: [A ReferenceError shall be thrown if exportBlobContainerUri is falsy] */
            if (!outputBlobContainerUri)
                throw new ReferenceError('outputBlobContainerUri cannot be falsy');
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
            var path = '/jobs/create' + azure_iot_common_1.endpoint.versionQueryString();
            var httpHeaders = {
                'Content-Type': 'application/json; charset=utf-8'
            };
            var importRequest = {
                'type': 'import',
                'inputBlobContainerUri': inputBlobContainerUri,
                'outputBlobContainerUri': outputBlobContainerUri
            };
            _this._restApiClient.executeApiCall('POST', path, httpHeaders, importRequest, _callback);
        }, done);
    };
    Registry.prototype.importDevicesFromBlobByIdentity = function (inputBlobContainerUri, outputBlobContainerUri, done) {
        var _this = this;
        return azure_iot_common_2.callbackToPromise(function (_callback) {
            /* Codes_SRS_NODE_IOTHUB_REGISTRY_07_001: [A ReferenceError shall be thrown if importBlobContainerUri is falsy] */
            if (!inputBlobContainerUri)
                throw new ReferenceError('inputBlobContainerUri cannot be falsy');
            /* Codes_SRS_NODE_IOTHUB_REGISTRY_07_002: [A ReferenceError shall be thrown if exportBlobContainerUri is falsy] */
            if (!outputBlobContainerUri)
                throw new ReferenceError('outputBlobContainerUri cannot be falsy');
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
            var path = '/jobs/create' + azure_iot_common_1.endpoint.versionQueryStringLimitedAvailability();
            var httpHeaders = {
                'Content-Type': 'application/json; charset=utf-8'
            };
            var importRequest = {
                'type': 'import',
                'inputBlobContainerUri': inputBlobContainerUri,
                'outputBlobContainerUri': outputBlobContainerUri,
                'storageAuthenticationType': 'IdentityBased'
            };
            _this._restApiClient.executeApiCall('POST', path, httpHeaders, importRequest, _callback);
        }, done);
    };
    Registry.prototype.exportDevicesToBlob = function (outputBlobContainerUri, excludeKeys, done) {
        var _this = this;
        return azure_iot_common_2.callbackToPromise(function (_callback) {
            /* Codes_SRS_NODE_IOTHUB_REGISTRY_16_004: [A ReferenceError shall be thrown if outputBlobContainerUri is falsy] */
            if (!outputBlobContainerUri)
                throw new ReferenceError('outputBlobContainerUri cannot be falsy');
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
            var path = '/jobs/create' + azure_iot_common_1.endpoint.versionQueryString();
            var httpHeaders = {
                'Content-Type': 'application/json; charset=utf-8'
            };
            var exportRequest = {
                'type': 'export',
                'outputBlobContainerUri': outputBlobContainerUri,
                'excludeKeysInExport': excludeKeys
            };
            _this._restApiClient.executeApiCall('POST', path, httpHeaders, exportRequest, _callback);
        }, done);
    };
    Registry.prototype.exportDevicesToBlobByIdentity = function (outputBlobContainerUri, excludeKeys, done) {
        var _this = this;
        return azure_iot_common_2.callbackToPromise(function (_callback) {
            /* Codes_SRS_NODE_IOTHUB_REGISTRY_07_004: [A ReferenceError shall be thrown if outputBlobContainerUri is falsy] */
            if (!outputBlobContainerUri)
                throw new ReferenceError('outputBlobContainerUri cannot be falsy');
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
            var path = '/jobs/create' + azure_iot_common_1.endpoint.versionQueryStringLimitedAvailability();
            var httpHeaders = {
                'Content-Type': 'application/json; charset=utf-8'
            };
            var exportRequest = {
                'type': 'export',
                'outputBlobContainerUri': outputBlobContainerUri,
                'excludeKeysInExport': excludeKeys,
                'storageAuthenticationType': 'IdentityBased'
            };
            _this._restApiClient.executeApiCall('POST', path, httpHeaders, exportRequest, _callback);
        }, done);
    };
    Registry.prototype.listJobs = function (done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_037: [The `listJobs` method shall construct an HTTP request using information supplied by the caller, as follows:
                ```
                GET /jobs?api-version=<version> HTTP/1.1
                Authorization: <config.sharedAccessSignature>
                Request-Id: <guid>
                ```]*/
            var path = '/jobs' + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, _callback);
        }, done);
    };
    Registry.prototype.getJob = function (jobId, done) {
        var _this = this;
        return azure_iot_common_2.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_006: [A ReferenceError shall be thrown if jobId is falsy] */
            if (!jobId)
                throw new ReferenceError('jobId cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_038: [The `getJob` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
            GET /jobs/<jobId>?api-version=<version> HTTP/1.1
            Authorization: <config.sharedAccessSignature>
            Request-Id: <guid>
            ```]*/
            var path = '/jobs/' + jobId + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, _callback);
        }, done);
    };
    Registry.prototype.cancelJob = function (jobId, done) {
        var _this = this;
        return azure_iot_common_2.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_012: [A ReferenceError shall be thrown if the jobId is falsy] */
            if (!jobId)
                throw new ReferenceError('jobId cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_039: [The `cancelJob` method shall construct an HTTP request using information supplied by the caller as follows:
            ```
            DELETE /jobs/<jobId>?api-version=<version> HTTP/1.1
            Authorization: <config.sharedAccessSignature>
            Request-Id: <guid>
            ```]*/
            var path = '/jobs/' + jobId + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('DELETE', path, null, null, _callback);
        }, done);
    };
    Registry.prototype.getTwin = function (deviceId, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_019: [The `getTwin` method shall throw a `ReferenceError` if the `deviceId` parameter is falsy.]*/
            if (!deviceId)
                throw new ReferenceError('the \'deviceId\' cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_049: [The `getTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
            GET /twins/<encodeURIComponent(deviceId)>?api-version=<version> HTTP/1.1
            Authorization: <config.sharedAccessSignature>
            Request-Id: <guid>
            ```]*/
            var path = '/twins/' + encodeURIComponent(deviceId) + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, function (err, newTwin, response) {
                if (err) {
                    _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_036: [The `getTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service.]*/
                    _callback(null, new twin_1.Twin(newTwin, _this), response);
                }
            });
        }, done);
    };
    Registry.prototype.getModuleTwin = function (deviceId, moduleId, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_001: [The `getModuleTwin` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, or `done` is falsy. ]*/
            if (!deviceId)
                throw new ReferenceError('Argument \'deviceId\' cannot be falsy');
            if (!moduleId)
                throw new ReferenceError('Argument \'moduleId\' cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_002: [The `getModuleTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
              GET /twins/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
              Authorization: <config.sharedAccessSignature>
              Request-Id: <guid>
            ```
            ]*/
            var path = "/twins/" + encodeURIComponent(deviceId) + "/modules/" + encodeURIComponent(moduleId) + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, function (err, newTwin, response) {
                if (err) {
                    _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_003: [The `getModuleTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service. ]*/
                    _callback(null, new twin_1.Twin(newTwin, _this), response);
                }
            });
        }, done);
    };
    Registry.prototype.updateTwin = function (deviceId, patch, etag, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_044: [The `updateTwin` method shall throw a `ReferenceError` if the `deviceId` argument is `undefined`, `null` or an empty string.]*/
            if (deviceId === null || deviceId === undefined || deviceId === '')
                throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_045: [The `updateTwin` method shall throw a `ReferenceError` if the `patch` argument is falsy.]*/
            if (!patch)
                throw new ReferenceError('patch cannot be \'' + patch + '\'');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_046: [The `updateTwin` method shall throw a `ReferenceError` if the `etag` argument is falsy.]*/
            if (!etag)
                throw new ReferenceError('etag cannot be \'' + etag + '\'');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_048: [The `updateTwin` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
            PATCH /twins/<encodeURIComponent(deviceId)>?api-version=<version> HTTP/1.1
            Authorization: <config.sharedAccessSignature>
            Content-Type: application/json; charset=utf-8
            Request-Id: <guid>
            If-Match: <etag>
      
            <patch>
            ```]*/
            var path = '/twins/' + encodeURIComponent(deviceId) + azure_iot_common_1.endpoint.versionQueryString();
            var headers = {
                'Content-Type': 'application/json; charset=utf-8',
                'If-Match': _this.ensureQuoted(etag)
            };
            _this._restApiClient.executeApiCall('PATCH', path, headers, patch, function (err, newTwin, response) {
                if (err) {
                    _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_050: [The `updateTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service.]*/
                    _callback(null, new twin_1.Twin(newTwin, _this), response);
                }
            });
        }, done);
    };
    Registry.prototype.updateModuleTwin = function (deviceId, moduleId, patch, etag, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_004: [The `updateModuleTwin` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, `patch`, `etag`,or `done` is falsy. ]*/
            if (!deviceId)
                throw new ReferenceError('Argument \'deviceId\' cannot be falsy');
            if (!moduleId)
                throw new ReferenceError('Argument \'moduleId\' cannot be falsy');
            if (!patch)
                throw new ReferenceError('Argument \'patch\' cannot be falsy');
            if (!etag)
                throw new ReferenceError('Argument \'etag\' cannot be falsy');
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
            var path = "/twins/" + encodeURIComponent(deviceId) + "/modules/" + encodeURIComponent(moduleId) + azure_iot_common_1.endpoint.versionQueryString();
            var headers = {
                'Content-Type': 'application/json; charset=utf-8',
                'If-Match': _this.ensureQuoted(etag)
            };
            _this._restApiClient.executeApiCall('PATCH', path, headers, patch, function (err, newTwin, response) {
                if (err) {
                    _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_006: [The `updateModuleTwin` method shall call the `done` callback with a `Twin` object updated with the latest property values stored in the IoT Hub service. ]*/
                    _callback(null, new twin_1.Twin(newTwin, _this), response);
                }
            });
        }, done);
    };
    /**
     * @method              module:azure-iothub.Registry#createQuery
     * @description         Creates a query that can be run on the IoT Hub instance to find information about devices or jobs.
     * @param {String}      sqlQuery   The query written as an SQL string.
     * @param {Number}      pageSize   The desired number of results per page (optional. default: 1000, max: 10000).
     *
     * @throws {ReferenceError}        If the sqlQuery argument is falsy.
     * @throws {TypeError}             If the sqlQuery argument is not a string or the pageSize argument not a number, null or undefined.
     */
    Registry.prototype.createQuery = function (sqlQuery, pageSize) {
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_051: [The `createQuery` method shall throw a `ReferenceError` if the `sqlQuery` argument is falsy.]*/
        if (!sqlQuery)
            throw new ReferenceError('sqlQuery cannot be \'' + sqlQuery + '\'');
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_052: [The `createQuery` method shall throw a `TypeError` if the `sqlQuery` argument is not a string.]*/
        if (typeof sqlQuery !== 'string')
            throw new TypeError('sqlQuery must be a string');
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_053: [The `createQuery` method shall throw a `TypeError` if the `pageSize` argument is not `null`, `undefined` or a number.]*/
        if (pageSize !== null && pageSize !== undefined && typeof pageSize !== 'number')
            throw new TypeError('pageSize must be a number or be null or undefined');
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_16_054: [The `createQuery` method shall return a new `Query` instance initialized with the `sqlQuery` and the `pageSize` argument if specified.]*/
        return new query_1.Query(this._executeQueryFunc(sqlQuery, pageSize), this);
    };
    Registry.prototype.getRegistryStatistics = function (done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            var path = '/statistics/devices' + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, {}, null, _callback);
        }, done);
    };
    Registry.prototype.addConfiguration = function (configuration, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_007: [The `addConfiguration` method shall throw a `ReferenceError` exception if `configuration` or `done` is falsy. ]*/
            if (!configuration)
                throw new ReferenceError('configuration cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_008: [The `addConfiguration` method shall throw an `ArgumentError` exception if `configuration.id` is falsy. ]*/
            if (!configuration.id)
                throw new ArgumentError('configuration object is missing id property');
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
            var path = "/configurations/" + encodeURIComponent(configuration.id) + azure_iot_common_1.endpoint.versionQueryString();
            var httpHeaders = {
                'Content-Type': 'application/json; charset=utf-8'
            };
            _this._restApiClient.executeApiCall('PUT', path, httpHeaders, configuration, _callback);
        }, done);
    };
    Registry.prototype.getConfiguration = function (configurationId, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_011: [The `getConfiguration` method shall throw a `ReferenceError` exception if `configurationId` is falsy. ]*/
            if (!configurationId)
                throw new ReferenceError('Argument \'configurationId\' cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_012: [The `getConfiguration` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
            GET /configurations/<encodeURIComponent(configurationId)>?api-version=<version> HTTP/1.1
            Authorization: <sharedAccessSignature>
            Request-Id: <guid>
            ```
            ]*/
            var path = "/configurations/" + encodeURIComponent(configurationId) + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, _callback);
        }, done);
    };
    Registry.prototype.getConfigurations = function (done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_014: [The `getConfigurations` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
            GET /configurations?api-version=<version> HTTP/1.1
            Authorization: <sharedAccessSignature>
            Request-Id: <guid>
            ```
            ]*/
            var path = "/configurations" + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, _callback);
        }, done);
    };
    Registry.prototype._updateConfiguration = function (configuration, forceUpdateOrDone, done) {
        var forceUpdate;
        if (typeof (forceUpdateOrDone) === 'function') {
            forceUpdate = false;
            done = forceUpdateOrDone;
        }
        else {
            forceUpdate = forceUpdateOrDone;
        }
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_015: [The `updateConfiguration` method shall throw a `ReferenceError` exception if `configuration` or `done` is falsy. ]*/
        if (!configuration)
            throw new ReferenceError('Argument \'configuration\' cannot be falsy');
        if (!done)
            throw new ReferenceError('Argument \'done\' cannot be falsy');
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_016: [The `updateConfiguration` method shall throw an `ArgumentError` exception if `forceUpdate` is falsy and `configuration.etag` is also falsy. ]*/
        if (!forceUpdate && !configuration.etag) {
            throw new ArgumentError('The ETag should be set while updating the Configuration.');
        }
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_017: [The `updateConfiguration` method shall throw an `ArgumentError` exception if `configuration.id` is falsy. ]*/
        if (!configuration.id)
            throw new ArgumentError('configuration object is missing id property');
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
        var path = "/configurations/" + encodeURIComponent(configuration.id) + azure_iot_common_1.endpoint.versionQueryString();
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_020: [If `forceUpdate` is not truthy, the `updateConfigurationMethod` shall put the `etag` parameter into the `If-Match` header value. ]*/
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_021: [If `forceUpdate` is truthy, the `updateConfiguration` method shall put `*` into the `If-Match` header value. ]*/
        var httpHeaders = {
            'Content-Type': 'application/json; charset=utf-8',
            'If-Match': this.ensureQuoted(forceUpdate ? '*' : configuration.etag)
        };
        this._restApiClient.executeApiCall('PUT', path, httpHeaders, configuration, done);
    };
    Registry.prototype.updateConfiguration = function (configuration, forceUpdateOrDone, done) {
        var _this = this;
        var callback = done || ((typeof forceUpdateOrDone === 'function') ? forceUpdateOrDone : undefined);
        if (callback) {
            return this._updateConfiguration(configuration, forceUpdateOrDone, done);
        }
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) { return _this._updateConfiguration(configuration, forceUpdateOrDone, _callback); });
    };
    Registry.prototype.removeConfiguration = function (configurationId, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_022: [The `removeConfiguration` method shall throw a `ReferenceError` exception if `configurationId` or `done` is falsy. ]*/
            if (!configurationId)
                throw new ReferenceError('Argument \'configurationId\' cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_023: [The `removeConfiguration` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
            DELETE /configurations/<encodeURIComponent(configurationId)>?api-version=<version> HTTP/1.1
            Authorization: <sharedAccessSignature>
            Request-Id: <guid>
            ```
            ]*/
            var path = "/configurations/" + encodeURIComponent(configurationId) + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('DELETE', path, null, null, _callback);
        }, done);
    };
    Registry.prototype.applyConfigurationContentOnDevice = function (deviceId, content, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_024: [The `applyConfigurationContentOnDevice` method shall throw a `ReferenceError` exception if `deviceId`, `content`, or `done` is falsy. ]*/
            if (!deviceId)
                throw new ReferenceError('Argument \'deviceId\' cannot be falsy');
            if (!content)
                throw new ReferenceError('Argument \'content\' cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_025: [The `applyConfigurationContentOnDevice` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
            POST /devices/<encodeURIComponent(deviceId)>/applyConfigurationContent?api-version=<version> HTTP/1.1
            Authorization: <sharedAccessSignature>
            Content-Type: application/json; charset=utf-8
            Request-Id: <guid>
      
            <content>
            ```
            ]*/
            var path = azure_iot_common_1.endpoint.devicePath(encodeURIComponent(deviceId)) + "/applyConfigurationContent" + azure_iot_common_1.endpoint.versionQueryString();
            var httpHeaders = {
                'Content-Type': 'application/json; charset=utf-8'
            };
            _this._restApiClient.executeApiCall('POST', path, httpHeaders, content, _callback);
        }, done);
    };
    Registry.prototype.addModule = function (module, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_026: [The `addModule` method shall throw a `ReferenceError` exception if `module` or `done` is falsy. ]*/
            if (!module)
                throw new ReferenceError('Argument \'module\' cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_027: [The `addModule` method shall throw an `ArgumentError` exception if `module.deviceId` or `module.moduleId` is falsy. ]*/
            if (!module.deviceId)
                throw new ArgumentError('deviceId property is missing from module object');
            if (!module.moduleId)
                throw new ArgumentError('moduleId property is missing from module object');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_028: [The `addModule` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
            PUT /devices/<encodeURIComponent(module.deviceId)>/modules/<encodeURIComponent(module.moduleId)>?api-version=<version> HTTP/1.1
            Authorization: <sharedAccessSignature>
            Content-Type: application/json; charset=utf-8
            Request-Id: <guid>
      
            <module>
            ```
            ]*/
            var preparedModule = JSON.parse(JSON.stringify(module));
            _this._normalizeAuthentication(preparedModule);
            var path = "" + azure_iot_common_1.endpoint.modulePath(encodeURIComponent(preparedModule.deviceId), encodeURIComponent(preparedModule.moduleId)) + azure_iot_common_1.endpoint.versionQueryString();
            var httpHeaders = {
                'Content-Type': 'application/json; charset=utf-8'
            };
            _this._restApiClient.executeApiCall('PUT', path, httpHeaders, preparedModule, _callback);
        }, done);
    };
    Registry.prototype.getModulesOnDevice = function (deviceId, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_029: [The `getModulesOnDevice` method shall throw a `ReferenceError` exception if `deviceId` or `done` is falsy. ]*/
            if (!deviceId)
                throw new ReferenceError('Argument \'deviceId\' cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_030: [The `getModulesOnDevice` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
            GET /devices/<encodeURIComponent(deviceId)>/modules?api-version=<version> HTTP/1.1
            Authorization: <sharedAccessSignature>
            Request-Id: <guid>
            ```
            ]*/
            var path = azure_iot_common_1.endpoint.devicePath(encodeURIComponent(deviceId)) + "/modules" + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, _callback);
        }, done);
    };
    Registry.prototype.getModule = function (deviceId, moduleId, done) {
        var _this = this;
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_031: [The `getModule` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, or `done` is falsy. ]*/
            if (!deviceId)
                throw new ReferenceError('Argument \'deviceId\' cannot be falsy');
            if (!moduleId)
                throw new ReferenceError('Argument \'moduleId\' cannot be falsy');
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_032: [The `getModule` method shall construct an HTTP request using information supplied by the caller, as follows:
            ```
            get /devices/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
            Authorization: <sharedAccessSignature>
            Request-Id: <guid>
            ```
            ]*/
            var path = "" + azure_iot_common_1.endpoint.modulePath(encodeURIComponent(deviceId), encodeURIComponent(moduleId)) + azure_iot_common_1.endpoint.versionQueryString();
            _this._restApiClient.executeApiCall('GET', path, null, null, _callback);
        }, done);
    };
    Registry.prototype._updateModule = function (module, forceUpdateOrDone, done) {
        var forceUpdate;
        if (typeof (forceUpdateOrDone) === 'function') {
            forceUpdate = false;
            done = forceUpdateOrDone;
        }
        else {
            forceUpdate = forceUpdateOrDone;
        }
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_033: [The `updateModule` method shall throw a `ReferenceError` exception if `module` or `done` is falsy. ]*/
        if (!module)
            throw new ReferenceError('Argument \'module\' cannot be falsy');
        if (!done)
            throw new ReferenceError('Argument \'done\' cannot be falsy');
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_034: [The `updateModule` method shall throw an `ArgumentError` exception if `module.deviceId` or `module.moduleId` is falsy. ]*/
        if (!module.moduleId)
            throw new ArgumentError('moduleId property is missing from module object');
        if (!module.deviceId)
            throw new ArgumentError('deviceId property is missing from module object');
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_035: [The `updateModule` method shall throw an `ArgumentError` exception if `forceUpdate` is falsy and `module.etag` is falsy. ]*/
        if (!forceUpdate && !module.etag) {
            throw new ArgumentError('The ETag should be set while updating the Module.');
        }
        var preparedModule = JSON.parse(JSON.stringify(module));
        this._normalizeAuthentication(preparedModule);
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_036: [If `forceUpdate` is not truthy, the `updateModule` shall put the `etag` parameter into the `If-Match` header value. ]*/
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_037: [If `forceUpdate` is truthy, the `updateModule` method shall put `*` into the `If-Match` header value. ]*/
        var httpHeaders = {
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
        var path = "" + azure_iot_common_1.endpoint.modulePath(encodeURIComponent(preparedModule.deviceId), encodeURIComponent(preparedModule.moduleId)) + azure_iot_common_1.endpoint.versionQueryString();
        this._restApiClient.executeApiCall('PUT', path, httpHeaders, preparedModule, done);
    };
    Registry.prototype.updateModule = function (module, forceUpdateOrDone, done) {
        var _this = this;
        var callback = done || ((typeof forceUpdateOrDone === 'function') ? forceUpdateOrDone : undefined);
        if (callback) {
            return this._updateModule(module, forceUpdateOrDone, done);
        }
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            _this._updateModule(module, forceUpdateOrDone, _callback);
        });
    };
    Registry.prototype._removeModule = function (moduleOrDeviceId, doneOrModuleId, done) {
        var moduleId;
        var deviceId;
        var etag;
        if (moduleOrDeviceId && (moduleOrDeviceId.moduleId)) { // can't do "instanceof Module" at runtime because Module is an interface
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_041: [if a `Module` object is passed in, `removeModule` shall use the `deviceId`, `moduleId`, and `etag` from the `Module` object.]*/
            done = doneOrModuleId;
            var module_1 = moduleOrDeviceId;
            deviceId = module_1.deviceId;
            moduleId = module_1.moduleId;
            etag = module_1.etag;
        }
        else {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_042: [if a `deviceId` and `moduleId` are passed in, `removeModule` shall use those values and the `etag` shall be `*`.]*/
            deviceId = moduleOrDeviceId;
            moduleId = doneOrModuleId;
            etag = '*';
        }
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_039: [The `removeModule` method shall throw a `ReferenceError` exception if `deviceId`, `moduleId`, or `done` is falsy. ]*/
        if (!deviceId)
            throw new ReferenceError('\'deviceId\' cannot be falsy');
        if (!moduleId)
            throw new ReferenceError('\'moduleId\' cannot be falsy');
        if (!done)
            throw new ReferenceError('Argument \'done\' cannot be falsy');
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_043: [The `removeModule` method shall throw an `ArgumentError` if `deviceId` or `moduleId` parameters are not strings.]*/
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_044: [The `removeModule` method shall throw an `ArgumentError` if the `done` parameter is not a function.]*/
        if (typeof deviceId !== 'string')
            throw new ArgumentError('\'deviceId\' must be a string');
        if (typeof moduleId !== 'string')
            throw new ArgumentError('\'moduleId\' must be a string');
        if (typeof (done) !== 'function')
            throw new ArgumentError('\'done\' must be a function');
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_18_040: [The `removeModule` method shall construct an HTTP request using information supplied by the caller, as follows:
        ```
        DELETE /devices/<encodeURIComponent(deviceId)>/modules/<encodeURIComponent(moduleId)>?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        Request-Id: <guid>
        If-Match: "<etag>"
        ```
        ]*/
        var httpHeaders = {
            'If-Match': this.ensureQuoted(etag)
        };
        var path = "" + azure_iot_common_1.endpoint.modulePath(encodeURIComponent(deviceId), encodeURIComponent(moduleId)) + azure_iot_common_1.endpoint.versionQueryString();
        this._restApiClient.executeApiCall('DELETE', path, httpHeaders, null, done);
    };
    Registry.prototype.removeModule = function (moduleOrDeviceId, doneOrModuleId, done) {
        var _this = this;
        var callback = done || ((typeof doneOrModuleId === 'function') ? doneOrModuleId : undefined);
        if (callback) {
            return this._removeModule(moduleOrDeviceId, doneOrModuleId, callback);
        }
        return azure_iot_common_2.httpCallbackToPromise(function (_callback) {
            _this._removeModule(moduleOrDeviceId, doneOrModuleId, _callback);
        });
    };
    Registry.prototype._bulkOperation = function (devices, done) {
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
        var path = '/devices' + azure_iot_common_1.endpoint.versionQueryString();
        var httpHeaders = {
            'Content-Type': 'application/json; charset=utf-8'
        };
        this._restApiClient.executeApiCall('POST', path, httpHeaders, devices, done);
    };
    Registry.prototype._processBulkDevices = function (devices, operation, force, forceTrueAlternative, forceFalseAlternative, done) {
        var _this = this;
        if (!devices) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_004: [The `addDevices` method shall throw `ReferenceError` if the `devices` argument is falsy.]*/
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_025: [The `updateDevices` method shall throw `ReferenceError` if the `devices` argument is falsy.]*/
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_006: [The `removeDevices` method shall throw `ReferenceError` if the deviceInfo is falsy.]*/
            throw new ReferenceError('devices cannot be \'' + devices + '\'');
        }
        else if (!Array.isArray(devices)) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_021: [The `addDevices` method shall throw `ArgumentError` if devices is NOT an array.]*/
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_020: [The `updateDevices` method shall throw `ArgumentError` if devices is NOT an array.]*/
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_019: [The `removeDevices` method shall throw `ArgumentError` if devices is NOT an array.]*/
            throw new ArgumentError('devices must be an array');
        }
        else if ((devices.length === 0) || (devices.length > 100)) {
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_014: [The `addDevices` method shall throw `ArgumentError` if devices.length == 0  or is greater than 100.]*/
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_015: [The `updateDevices` method shall throw `ArgumentError` if devices.length == 0  or is greater than 100.]*/
            /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_016: [The `removeDevices` method shall throw `ArgumentError` if devices.length == 0  or is greater than 100.]*/
            throw new ArgumentError('The device array has an invalid size of ' + devices.length);
        }
        else {
            var importMode_1;
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
                }
                else {
                    /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_008: [If the `forceUpdate` parameter is true importMode will be set to `Update` otherwise it will be set to `UpdateIfMatchETag`.]*/
                    /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_007: [If the `forceRemove` parameter is true then importMode will be set to `Delete` otherwise it will be set to `DeleteIfMatchETag`.]*/
                    importMode_1 = force ? forceTrueAlternative : forceFalseAlternative;
                }
            }
            else {
                /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_009: [The `addDevices` method shall utilize an importMode = `create`.]*/
                importMode_1 = operation;
            }
            var bulkArray_1 = [];
            devices.forEach(function (currentDevice) {
                if (!currentDevice.deviceId) {
                    /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_010: [The `addDevices` method shall throw `ArgumentError` if any elements of devices do NOT contain a `deviceId` property.]*/
                    /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_012: [The `updateDevices` method shall throw `ArgumentError` if any elements of devices do NOT contain a `deviceId` property.]*/
                    /*Codes_SRS_NODE_IOTHUB_REGISTRY_06_017: [The `removeDevices` method shall throw `ArgumentError` if any elements of devices do NOT contain a `deviceId` property.]*/
                    throw new ArgumentError('The object is missing the property: deviceId');
                }
                else {
                    //
                    // And now remove the device id and put it back as id.
                    //
                    var actualDeviceId = currentDevice.deviceId;
                    var preparedDevice = JSON.parse(JSON.stringify(currentDevice));
                    delete preparedDevice.deviceId;
                    preparedDevice.id = actualDeviceId;
                    preparedDevice.importMode = importMode_1;
                    _this._normalizeAuthentication(preparedDevice);
                    bulkArray_1.push(preparedDevice);
                }
            });
            this._bulkOperation(bulkArray_1, done);
        }
    };
    Registry.prototype._executeQueryFunc = function (sqlQuery, pageSize) {
        var _this = this;
        return function (continuationToken, done) {
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
            var path = '/devices/query' + azure_iot_common_1.endpoint.versionQueryString();
            var headers = {
                'Content-Type': 'application/json; charset=utf-8'
            };
            if (continuationToken) {
                headers['x-ms-continuation'] = continuationToken;
            }
            if (pageSize) {
                headers['x-ms-max-item-count'] = pageSize;
            }
            var query = {
                query: sqlQuery
            };
            _this._restApiClient.executeApiCall('POST', path, headers, query, done);
        };
    };
    Registry.prototype._normalizeAuthentication = function (deviceInfo) {
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
        }
        else if (!deviceInfo.authentication.hasOwnProperty('type')) {
            if (deviceInfo.authentication.x509Thumbprint && (deviceInfo.authentication.x509Thumbprint.primaryThumbprint || deviceInfo.authentication.x509Thumbprint.secondaryThumbprint)) {
                /* Codes_SRS_NODE_IOTHUB_REGISTRY_06_030: [A device information with an authentication object that contains the x509Thumbprint property with at least one of `primaryThumbprint` or `secondaryThumbprint` sub-properties will be normalized with a `type` property with value "selfSigned".] */
                deviceInfo.authentication.type = 'selfSigned';
            }
            else {
                /* Codes_SRS_NODE_IOTHUB_REGISTRY_06_031: [A device information with an authentication object that doesn't contain the x509Thumbprint property will be normalized with a `type` property with value "sas".] */
                deviceInfo.authentication.type = 'sas';
            }
        }
    };
    Registry.prototype.ensureQuoted = function (eTag) {
        var tagLength = eTag.length;
        if (tagLength === 0) {
            return '""';
        }
        else if ((eTag.slice(0, 1) === '"') && (eTag.slice(tagLength - 1, tagLength) === '"')) {
            return eTag;
        }
        return '"' + eTag + '"';
    };
    /**
     * @method          module:azure-iothub.Registry.fromConnectionString
     * @description     Constructs a Registry object from the given connection string.
     * @static
     * @param {String}  value       A connection string which encapsulates the
     *                              appropriate (read and/or write) Registry
     *                              permissions.
     * @returns {module:azure-iothub.Registry}
     */
    Registry.fromConnectionString = function (value) {
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_008: [The `fromConnectionString` method shall throw `ReferenceError` if the value argument is falsy.]*/
        if (!value)
            throw new ReferenceError('value is \'' + value + '\'');
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_009: [The `fromConnectionString` method shall derive and transform the needed parts from the connection string in order to create a `config` object for the constructor (see `SRS_NODE_IOTHUB_REGISTRY_05_001`).]*/
        var cn = ConnectionString.parse(value);
        var config = {
            host: cn.HostName,
            sharedAccessSignature: azure_iot_common_1.SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, Date.now())
        };
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_010: [The `fromConnectionString` method shall return a new instance of the `Registry` object.]*/
        return new Registry(config);
    };
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
    Registry.fromSharedAccessSignature = function (value) {
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_011: [The `fromSharedAccessSignature` method shall throw ReferenceError if the value argument is falsy.]*/
        if (!value)
            throw new ReferenceError('value is \'' + value + '\'');
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_012: [The `fromSharedAccessSignature` method shall derive and transform the needed parts from the shared access signature in order to create a `config` object for the constructor (see `SRS_NODE_IOTHUB_REGISTRY_05_001`).]*/
        var sas = azure_iot_common_1.SharedAccessSignature.parse(value);
        var config = {
            host: sas.sr,
            sharedAccessSignature: sas.toString()
        };
        /*Codes_SRS_NODE_IOTHUB_REGISTRY_05_013: [The fromSharedAccessSignature method shall return a new instance of the `Registry` object.]*/
        return new Registry(config);
    };
    return Registry;
}());
exports.Registry = Registry;
//# sourceMappingURL=registry.js.map