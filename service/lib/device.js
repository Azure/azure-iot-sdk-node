// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
/**
 * Creates a representation of a device for use with the [device identity registry]{@link azure-iothub.Registry} APIs.
 *
 * **This class is deprecated** because the [device identity registry]{@link azure-iothub.Registry} can work directly with JSON objects
 * containing a partial description of the device, not necessarily the full object. On top of that initially this class was shipped with a typo
 * on the `symmetricKey` property name (it was pascal-cased instead of camel-cased). The SDK is keeping this class around in order not to break existing code
 * but this will be removed in a future major version update and customers should instead use plain JSON objects.
 *
 * @deprecated
 */
/*Codes_SRS_NODE_SERVICE_DEVICE_16_001: [The constructor shall accept a `null` or `undefined` value as argument and create an empty `Device` object.]*/
var Device = /** @class */ (function () {
    /**
     * Instantiate a new {@link azure-iothub.Device} object.
     * @param jsonData An optional JSON representation of the device, which will be mapped to properties in the object. If no argument is provided, Device properties will be assigned default values.
     */
    function Device(jsonData) {
        this.deviceId = null;
        this.generationId = null;
        this.etag = null;
        this.connectionState = 'disconnected';
        this.status = 'enabled';
        this.statusReason = null;
        this.connectionStateUpdatedTime = null;
        this.statusUpdatedTime = null;
        this.lastActivityTime = null;
        this.cloudToDeviceMessageCount = '0';
        this.capabilities = {};
        this.authentication = {
            symmetricKey: {
                primaryKey: null,
                secondaryKey: null
            },
            x509Thumbprint: {
                primaryThumbprint: null,
                secondaryThumbprint: null
            }
        };
        /*Codes_SRS_NODE_SERVICE_DEVICE_16_002: [If the `deviceDescription` argument is provided as a string, it shall be parsed as JSON and the properties of the new `Device` object shall be populated with the values provided in the `deviceDescription` JSON string.]*/
        /*Codes_SRS_NODE_SERVICE_DEVICE_16_003: [If the `deviceDescription` argument if provided as an object, the properties of the new `Device` object shall be populated with the values provided in the `deviceDescription` JSON string.]*/
        if (jsonData) {
            var userProps = (typeof jsonData === 'string') ? JSON.parse(jsonData) : jsonData;
            if (!userProps.deviceId) {
                /*Codes_SRS_NODE_SERVICE_DEVICE_16_004: [The constructor shall throw a `ReferenceError` if the `deviceDescription` argument doesn't contain a `deviceId` property.]*/
                throw new ReferenceError('The \'deviceId\' property cannot be \'' + userProps.deviceId + '\'');
            }
            _.merge(this, userProps);
        }
        Object.defineProperty(this.authentication, 'SymmetricKey', {
            enumerable: true,
            get: function () {
                /*Codes_SRS_NODE_SERVICE_DEVICE_16_005: [The `authentication.SymmetricKey` property shall return the content of the `authentication.symmetricKey` property (the latter being the valid property returned by the IoT hub in the device description).]*/
                return this.symmetricKey;
            }
        });
    }
    return Device;
}());
exports.Device = Device;
//# sourceMappingURL=device.js.map