// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Represents the data passed in from the service to the device when a device method is called from the cloud.
 * An instance of this class is passed to the callback registered via {@link azure-iot-device.Client.onDeviceMethod}.
 */
var DeviceMethodRequest = /** @class */ (function () {
    function DeviceMethodRequest(requestId, methodName, body) {
        // Codes_SRS_NODE_DEVICE_METHOD_REQUEST_13_002: [ DeviceMethodRequest shall throw an Error if requestId is an empty string. ]
        if (typeof (requestId) === 'string' && requestId.length === 0) {
            throw new Error('requestId must not be an empty string');
        }
        // Codes_SRS_NODE_DEVICE_METHOD_REQUEST_13_001: [ DeviceMethodRequest shall throw a ReferenceError if requestId is falsy or is not a string. ]
        if (typeof (requestId) !== 'string') {
            throw new ReferenceError('requestId must be a string');
        }
        // Codes_SRS_NODE_DEVICE_METHOD_REQUEST_13_004: [ DeviceMethodRequest shall throw an Error if methodName is an empty string. ]
        if (typeof (methodName) === 'string' && methodName.length === 0) {
            throw new Error('methodName must not be an empty string');
        }
        // Codes_SRS_NODE_DEVICE_METHOD_REQUEST_13_003: [ DeviceMethodRequest shall throw a ReferenceError if methodName is falsy or is not a string. ]
        if (typeof (methodName) !== 'string') {
            throw new ReferenceError('methodName must be a string');
        }
        this.requestId = requestId;
        this.methodName = methodName;
        if (body) {
            this.payload = JSON.parse(body.toString());
        }
    }
    return DeviceMethodRequest;
}());
exports.DeviceMethodRequest = DeviceMethodRequest;
//# sourceMappingURL=device_method_request.js.map