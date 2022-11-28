// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let assert = require('chai').assert;
let createDeviceMethodExchange = require('../../dist/device_method').createDeviceMethodExchange;
let DeviceMethodResponse = require('../../dist/device_method').DeviceMethodResponse;
let DeviceMethodRequest = require('../../dist/device_method').DeviceMethodRequest;

describe("DeviceMethodRequest", function () {
    describe("#createDeviceMethodExchange", function () {
        it("creates exchange successfully", function () {
            const request = new DeviceMethodRequest("requestId", "methodName");
            const response = new DeviceMethodResponse("otherRequestId", {});
            const exchange = createDeviceMethodExchange(request, response);
            assert.deepEqual(request, exchange.request);
            assert.deepEqual(response, exchange.response);
        });
    });
});
