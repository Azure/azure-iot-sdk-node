// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
/**
 * a {@link azure-iot-device.DeviceMethodResponse} object is provided to the user with each {@link azure-iot-device.DeviceMethodRequest} allowing the user to construct and send a
 * well-formatted response back to the service for each device method call.
 * An instance of this class is passed as the second parameter to the callback registered via {@link azure-iot-device.Client.onDeviceMethod}.
 */
var DeviceMethodResponse = /** @class */ (function () {
    function DeviceMethodResponse(requestId, transport) {
        /**
         * Boolean indicating whether the response has been sent already.
         */
        this.isResponseComplete = false;
        // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_002: [ DeviceMethodRequest shall throw an Error if requestId is an empty string. ]
        if (typeof (requestId) === 'string' && requestId.length === 0) {
            throw new Error('requestId must not be an empty string');
        }
        // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_001: [ DeviceMethodRequest shall throw a ReferenceError if requestId is falsy or is not a string. ]
        if (typeof (requestId) !== 'string') {
            throw new ReferenceError('requestId must be a string');
        }
        // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_006: [ DeviceMethodResponse shall throw a ReferenceError if transport is falsy. ]
        if (!transport)
            throw new ReferenceError('transport is \'' + transport + '\'');
        this.requestId = requestId;
        this.isResponseComplete = false;
        this.status = null;
        this.payload = null;
        this._transport = transport;
    }
    DeviceMethodResponse.prototype.send = function (status, payload, done) {
        var _this = this;
        if (typeof (payload) === 'function') {
            if (done !== undefined) {
                throw new Error('Callback must be the last argument');
            }
            else {
                done = payload;
                payload = null;
            }
        }
        return azure_iot_common_1.errorCallbackToPromise(function (_callback) {
            // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_009: [ DeviceMethodResponse.send shall throw an Error object if it is called more than once for the same request. ]
            if (_this.isResponseComplete) {
                throw new Error('This response has already ended. Cannot end the same response more than once.');
            }
            if (typeof (status) !== 'number') {
                // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_007: [ DeviceMethodResponse.end shall throw a ReferenceError if status is undefined or not a number. ]
                throw new ReferenceError('"status" is "' + status + '". Expected a number.');
            }
            _this.status = status;
            _this.payload = payload;
            _this.isResponseComplete = true;
            // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_008: [ DeviceMethodResponse.send shall notify the service and supply the response for the request along with the status by calling sendMethodResponse on the underlying transport object. ]
            // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_010: [ DeviceMethodResponse.send shall invoke the callback specified by done if it is not falsy. ]
            // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_011: [ DeviceMethodResponse.send shall pass the status of sending the response to the service to done. ]
            _this._transport.sendMethodResponse(_this, _callback);
        }, done);
    };
    return DeviceMethodResponse;
}());
exports.DeviceMethodResponse = DeviceMethodResponse;
//# sourceMappingURL=device_method_response.js.map