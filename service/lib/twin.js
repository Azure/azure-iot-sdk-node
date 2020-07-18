// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var _ = require("lodash");
var interfaces_1 = require("./interfaces");
/**
 * A Device Twin is document describing the state of a device that is stored by an Azure IoT hub and is available even if the device is offline.
 * It is built around 3 sections:
 *   - Tags: key/value pairs only accessible from the service side
 *   - Desired Properties: updated by a service and received by the device
 *   - Reported Properties: updated by the device and received by the service.
 *
 * Note that although it is a possibility, desired and reported properties do not have to match
 * and that the logic to sync these two collections, if necessary, is left to the user of the SDK.
 *
 * For more information see {@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins|Understanding Device Twins}.
 *
 * The recommended way to obtain a {@link azure-iothub.Twin} for a specific device is to use the {@link azure-iothub.Registry.getTwin} method.
 */
var Twin = /** @class */ (function () {
    /**
     * Instantiates a new {@link azure-iothub.Twin}. The recommended way to get a new {@link azure-iothub.Twin} object is to use the {@link azure-iothub.Registry.getTwin} method.
     * @constructor
     * @param {string|Object}  device      A device identifier string or an object describing the device. If an Object,
     *                                     it must contain a deviceId property.
     * @param {Registry}       registryClient   The HTTP registry client used to execute REST API calls.
     */
    function Twin(device, registryClient) {
        /*Codes_SRS_NODE_IOTHUB_TWIN_16_002: [The `Twin(device, registryClient)` constructor shall throw a `ReferenceError` if `device` is falsy.]*/
        if (device === null || device === undefined || device === '')
            throw new ReferenceError('\'device\' cannot be \'' + device + '\'');
        /*Codes_SRS_NODE_IOTHUB_TWIN_16_003: [The `Twin(device, registryClient)` constructor shall throw a `ReferenceError` if `registryClient` is falsy.]*/
        if (!registryClient)
            throw new ReferenceError('\'registryClient\' cannot be \'' + registryClient + '\'');
        if (typeof (device) === 'string') {
            /*Codes_SRS_NODE_IOTHUB_TWIN_16_001: [The `Twin(device, registryClient)` constructor shall initialize an empty instance of a `Twin` object and set the `deviceId` base property to the `device` argument if it is a `string`.]*/
            this.deviceId = device;
        }
        else {
            if (!device.deviceId) {
                /*Codes_SRS_NODE_IOTHUB_TWIN_16_007: [The `Twin(device, registryClient)` constructor shall throw an `ArgumentError` if `device` is an object and does not have a `deviceId` property.]*/
                throw new azure_iot_common_1.errors.ArgumentError('\'device\' must have a deviceId property');
            }
            else {
                /*Codes_SRS_NODE_IOTHUB_TWIN_16_006: [The `Twin(device, registryClient)` constructor shall initialize an empty instance of a `Twin` object and set the properties of the created object to the properties described in the `device` argument if it's an `object`.]*/
                _.merge(this, device);
            }
        }
        /*Codes_SRS_NODE_IOTHUB_TWIN_16_005: [The `Twin(device, registryClient)` constructor shall set the `Twin.etag` to `*`.]*/
        this.etag = this.etag || '*';
        this.tags = this.tags || {};
        this.properties = _.assign({ desired: {} }, this.properties);
        this._registry = registryClient;
    }
    Twin.prototype.get = function (done) {
        var _this = this;
        return azure_iot_common_1.tripleValueCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_TWIN_16_020: [If `this.moduleId` is falsy, the `get` method shall call the `getTwin` method of the `Registry` instance stored in `_registry` property with the following parameters:
                - `this.deviceId`
                - `done`]*/
            /*Codes_SRS_NODE_IOTHUB_TWIN_18_001: [If `this.moduleId` is not falsy, the `get` method shall call the `getModuleTwin` method of the `Registry` instance stored in `_registry` property with the following parameters:
            - `this.deviceId`
            - `this.moduleId`
            - `done`]*/
            var get;
            if (_this.moduleId) {
                get = function (done) { return _this._registry.getModuleTwin(_this.deviceId, _this.moduleId, done); };
            }
            else {
                get = function (done) { return _this._registry.getTwin(_this.deviceId, done); };
            }
            get(function (err, result, response) {
                if (err) {
                    /*Codes_SRS_NODE_IOTHUB_TWIN_16_022: [The method shall call the `_callback ` callback with an `Error` object if the request failed]*/
                    _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_IOTHUB_TWIN_16_021: [The method shall copy properties, tags, and etag in the twin returned in the callback of the `Registry` method call into its parent object.]*/
                    _this.properties = result.properties;
                    _this.tags = result.tags;
                    _this.etag = result.etag;
                    /*Codes_SRS_NODE_IOTHUB_TWIN_16_023: [The method shall call the `_callback` callback with a `null` error object, its parent instance as a second argument and the transport `response` object as a third argument if the request succeeded.]*/
                    _callback(null, _this, response);
                }
            });
        }, function (t, i) { return interfaces_1.createResultWithIncomingMessage(t, i); }, done);
    };
    Twin.prototype.update = function (patch, done) {
        var _this = this;
        return azure_iot_common_1.tripleValueCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_TWIN_16_019: [If `this.moduleId` is falsy, The `update` method shall call the `updateTwin` method of the `Registry` instance stored in `_registry` property with the following parameters:
            - `this.deviceId`
            - `patch`
            - `this.etag`
            - `done`]*/
            /*Codes_SRS_NODE_IOTHUB_TWIN_18_002: [If `this.moduleId` is not falsy, the `update` method shall call the `updateModuleTwin` method of the `Registry` instance stored in `_registry` property with the following parameters:
            - `this.deviceId`
            - `this.moduleId`
            - `patch`
            - `this.etag`
            - `done`]*/
            var update;
            if (_this.moduleId) {
                update = function (done) { return _this._registry.updateModuleTwin(_this.deviceId, _this.moduleId, patch, _this.etag, done); };
            }
            else {
                update = function (done) { return _this._registry.updateTwin(_this.deviceId, patch, _this.etag, done); };
            }
            update(function (err, result, response) {
                if (err) {
                    /*Codes_SRS_NODE_IOTHUB_TWIN_16_022: [The method shall call the `_callback` callback with an `Error` object if the request failed]*/
                    _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_IOTHUB_TWIN_16_021: [The method shall copy properties, tags, and etag in the twin returned in the callback of the `Registry` method call into its parent object.]*/
                    _this.properties = result.properties;
                    _this.tags = result.tags;
                    _this.etag = result.etag;
                    /*Codes_SRS_NODE_IOTHUB_TWIN_16_023: [The method shall call the `_callback` callback with a `null` error object, its parent instance as a second argument and the transport `response` object as a third argument if the request succeeded.]*/
                    _callback(null, _this, response);
                }
            });
        }, function (t, r) { return interfaces_1.createResultWithIncomingMessage(t, r); }, done);
    };
    /*Codes_SRS_NODE_IOTHUB_TWIN_16_015: [The `toJSON` method shall return a copy of the `Twin` object that doesn't contain the `_registry` private property.]*/
    Twin.prototype.toJSON = function () {
        // The registry object has a reference to https which has circular references, so we need to remove it from the JSON.
        var serializable = {};
        _.merge(serializable, this);
        serializable._registry = undefined;
        return serializable;
    };
    return Twin;
}());
exports.Twin = Twin;
//# sourceMappingURL=twin.js.map