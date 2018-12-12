// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

require('es5-shim');
var assert = require('chai').assert;
var createDeviceMethodExchange = require('../../lib/device_method').createDeviceMethodExchange;
var DeviceMethodResponse = require('../../lib/device_method').DeviceMethodResponse;
var DeviceMethodRequest = require('../../lib/device_method').DeviceMethodRequest;

describe("DeviceMethodRequest", function() {
    describe("#createDeviceMethodExchange", function() {
        it("creates exchange successfully", function() {
            const request = new DeviceMethodRequest("requestId", "methodName");
            const response = new DeviceMethodResponse("otherRequestId", {});
            const exchange = createDeviceMethodExchange(request, response);
            assert.deepEqual(request, exchange.request);
            assert.deepEqual(response, exchange.response);
        });
    });
});