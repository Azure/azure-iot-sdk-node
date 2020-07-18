// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var events_1 = require("events");
var traverse = require("traverse");
var dbg = require("debug");
var debug = dbg('azure-iot-device:Twin');
var azure_iot_common_1 = require("azure-iot-common");
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
 *  @fires Twin#properties.desired[.path]
 *
 */
var Twin = /** @class */ (function (_super) {
    __extends(Twin, _super);
    /**
     * The constructor should not be used directly and instead the SDK user should use the {@link Client#getTwin} method to obtain a valid `Twin` object.
     * @constructor
     * @private
     * @param transport    The transport to use in order to communicate with the Azure IoT hub.
     * @param retryPolicy  The retry policy to apply when encountering an error.
     * @param maxTimeout   The maximum time allowed for the twin to retry before the operation is considered failed.
     */
    function Twin(transport, retryPolicy, maxTimeout) {
        var _this = _super.call(this) || this;
        _this._transport = transport;
        _this._retryPolicy = retryPolicy;
        _this._maxOperationTimeout = maxTimeout;
        _this.desiredPropertiesUpdatesEnabled = false;
        _this.on('newListener', _this._handleNewListener.bind(_this));
        /*Codes_SRS_NODE_DEVICE_TWIN_16_001: [The `Twin` constructor shall subscribe to the `twinDesiredPropertiesUpdate` event off the `transport` object.]*/
        _this._transport.on('twinDesiredPropertiesUpdate', _this._onDesiredPropertiesUpdate.bind(_this));
        return _this;
    }
    Twin.prototype.get = function (callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            var retryOp = new azure_iot_common_1.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                _this._clearCachedProperties();
                /*Codes_SRS_NODE_DEVICE_TWIN_16_002: [The `get` method shall call the `getTwin` method of the `Transport` object with a callback.]*/
                _this._transport.getTwin(function (err, twinProperties) {
                    if (err) {
                        /*Codes_SRS_NODE_DEVICE_TWIN_16_003: [If the callback passed to the `getTwin` method is called with an error, the `callback` passed to the call to the `get` method shall be called with that error.]*/
                        opCallback(err);
                    }
                    else {
                        /*Codes_SRS_NODE_DEVICE_TWIN_16_004: [If the callback passed to the `getTwin` method is called with no error and a `TwinProperties` object, these properties shall be merged with the current instance properties.]*/
                        _this._mergePatch(_this.properties.desired, twinProperties.desired);
                        _this._mergePatch(_this.properties.reported, twinProperties.reported);
                        /*Codes_SRS_NODE_DEVICE_TWIN_16_006: [For each desired property that is part of the `TwinProperties` object received, an event named after the path to this property shall be fired and passed the property value as argument.]*/
                        _this._fireChangeEvents(_this.properties.desired);
                        /*Codes_SRS_NODE_DEVICE_TWIN_16_005: [Once the properties have been merged the `callback` method passed to the call to `get` shall be called with a first argument that is `null` and a second argument that is the current `Twin` instance (`this`).]*/
                        opCallback(null, _this);
                    }
                });
            }, _callback);
        }, callback);
    };
    /**
     * @private
     */
    Twin.prototype.setRetryPolicy = function (policy) {
        /*Codes_SRS_NODE_DEVICE_TWIN_16_014: [the `retryPolicy` object passed to the `setRetryPolicy` method shall be used to retry any subsequent operation (`get`, `properties.reported.update` or `enableTwinDesiredPropertiesUpdates`).]*/
        this._retryPolicy = policy;
    };
    /**
     * @private
     */
    Twin.prototype.enableTwinDesiredPropertiesUpdates = function (callback) {
        var _this = this;
        var retryOp = new azure_iot_common_1.RetryOperation(this._retryPolicy, this._maxOperationTimeout);
        retryOp.retry(function (opCallback) {
            _this._transport.enableTwinDesiredPropertiesUpdates(function (err) {
                _this.desiredPropertiesUpdatesEnabled = !err;
                opCallback(err);
            });
        }, callback);
    };
    // Note: Since we currently don't keep track of listeners, so we don't "disable" the twin properties updates when no one is listening.
    // This is a shortcoming that should be fixed.
    // private _disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void {
    //   this._transport.disableTwinDesiredPropertiesUpdates(callback);
    // }
    Twin.prototype._updateReportedProperties = function (state, done) {
        var _this = this;
        var retryOp = new azure_iot_common_1.RetryOperation(this._retryPolicy, this._maxOperationTimeout);
        retryOp.retry(function (opCallback) {
            /*Codes_SRS_NODE_DEVICE_TWIN_16_007: [The `update` method shall call the `updateReportedProperties` method of the `Transport` object and pass it the patch object and a callback accepting an error as argument.]*/
            _this._transport.updateTwinReportedProperties(state, function (err) {
                if (err) {
                    /*Codes_SRS_NODE_DEVICE_TWIN_16_008: [If the callback passed to the transport is called with an error, the `callback` argument of the `update` method shall be called with that error.]*/
                    opCallback(err);
                }
                else {
                    /*Codes_SRS_NODE_DEVICE_TWIN_18_031: [If the callback passed to the transport is called with no error, the  `properties.reported.update` shall merge the contents of the patch object into `properties.reported`]*/
                    /*Codes_SRS_NODE_DEVICE_TWIN_18_032: [When merging the patch, if any properties are set to `null`, `properties.reported.update` shall delete that property from `properties.reported`.]*/
                    _this._mergePatch(_this.properties.reported, state);
                    /*Codes_SRS_NODE_DEVICE_TWIN_16_009: [Once the properties have been merged the `callback` argument of the `update` method shall be called with no argument.]*/
                    opCallback();
                }
            });
        }, done);
    };
    /* Codes_SRS_NODE_DEVICE_TWIN_18_031: [** `properties.reported.update` shall merge the contents of the patch object into `properties.reported` **]** */
    Twin.prototype._mergePatch = function (dest, patch) {
        _.merge(dest, patch);
        /* Codes_SRS_NODE_DEVICE_TWIN_18_032: [** When merging the patch, if any properties are set to `null`, `properties.reported.update` shall delete that property from `properties.reported`. **]** */
        traverse(dest).forEach(function (prop) {
            if (prop === null) {
                this.remove();
            }
        });
    };
    Twin.prototype._clearCachedProperties = function () {
        var self = this;
        this.properties = {
            reported: {
                update: function (state, done) {
                    self._updateReportedProperties(state, done);
                }
            },
            desired: {}
        };
    };
    /* Codes_SRS_NODE_DEVICE_TWIN_18_039: [** After merging a GET result, the `Twin` object shall recursively fire property changed events for every changed property. **]** */
    /* Codes_SRS_NODE_DEVICE_TWIN_18_040: [** After merging a PATCH result, the `Twin` object shall recursively fire property changed events for every changed property. **]** */
    Twin.prototype._fireChangeEvents = function (desiredProperties) {
        var self = this;
        this.emit(Twin.desiredPath, desiredProperties);
        traverse(desiredProperties).forEach(function () {
            var path = this.path.join('.');
            if (path) {
                /* Codes_SRS_NODE_DEVICE_TWIN_18_041: [** When firing a property changed event, the `Twin` object shall name the event from the property using dot notation starting with 'properties.desired.' **]** */
                /* Codes_SRS_NODE_DEVICE_TWIN_18_042: [** When firing a property changed event, the `Twin` object shall pass the changed value of the property as the event parameter **]** */
                self.emit(Twin.desiredPath + '.' + path, _.at(desiredProperties, path)[0]);
            }
        });
    };
    Twin.prototype._onDesiredPropertiesUpdate = function (patch) {
        /*Codes_SRS_NODE_DEVICE_TWIN_16_012: [When a `twinDesiredPropertiesUpdates` event is emitted by the transport, the property patch passed as argument to the event handler shall be merged with the current desired properties.]*/
        this._mergePatch(this.properties.desired, patch);
        /*Codes_SRS_NODE_DEVICE_TWIN_16_013: [Recursively for each desired property that is part of the patch received, an event named using the convention `properties.desired[.path]` shall be fired with an argument containing the value of the protperty.]*/
        this._fireChangeEvents(patch);
    };
    /* Codes_SRS_NODE_DEVICE_TWIN_18_045: [** If a property is already set when a handler is added for that property, the `Twin` object shall fire a property changed event for the property. **]*  */
    Twin.prototype._handleNewListener = function (eventName) {
        var _this = this;
        var self = this;
        if (eventName.indexOf(Twin.desiredPath) === 0) {
            var propertyValue_1 = _.at(this, eventName)[0];
            /*Codes_SRS_NODE_DEVICE_TWIN_18_045: [If a property is already set when a handler is added for that property, the `Twin` object shall fire a property changed event for the property.]*/
            if (propertyValue_1) {
                process.nextTick(function () {
                    self.emit(eventName, propertyValue_1);
                });
            }
            /*Codes_SRS_NODE_DEVICE_TWIN_16_010: [When a listener is added for the first time on an event which name starts with `properties.desired`, the twin shall call the `enableTwinDesiredPropertiesUpdates` method of the `Transport` object.]*/
            this.enableTwinDesiredPropertiesUpdates(function (err) {
                if (err) {
                    debug('error enabling desired properties updates: ' + err.toString());
                    /*Codes_SRS_NODE_DEVICE_TWIN_16_011: [If the callback passed to the transport is called with an error, that error shall be emitted by the Twin object.]*/
                    _this.emit('error', err);
                }
                else {
                    debug('desired properties updates enabled');
                }
            });
        }
    };
    Twin.errorEvent = 'error';
    Twin.desiredPath = 'properties.desired';
    return Twin;
}(events_1.EventEmitter));
exports.Twin = Twin;
//# sourceMappingURL=twin.js.map