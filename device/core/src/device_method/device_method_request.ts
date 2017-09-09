// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { Client } from '../client';

/**
 * @class           module:azure-iot-device.deviceMethod.DeviceMethodRequest
 * @classdesc       Represents the data passed in from the service to the device
 *                  when a device method is called from the cloud.
 *                  An instance of this class is passed to the callback registered via
 *                  {@link module:azure-iot-device.Client#onDeviceMethod}.
 * @instance {string}  requestId         The request identifier supplied by the
 *                                    service for this device method call.
 * @instance {string}  methodName        The name of the method to be called.
 * @instance {Buffer}  body              A Node `Buffer` representing the payload
 *                                    of the method call request.
 */
export class DeviceMethodRequest implements Client.DeviceMethodRequest {
  requestId: string;
  methodName: string;
  payload: any;

  constructor(requestId: string, methodName: string, body?: any) {
    // Codes_SRS_NODE_DEVICE_METHOD_REQUEST_13_002: [ DeviceMethodRequest shall throw an Error if requestId is an empty string. ]
    if (typeof(requestId) === 'string' && requestId.length === 0) {
      throw new Error('requestId must not be an empty string');
    }
    // Codes_SRS_NODE_DEVICE_METHOD_REQUEST_13_001: [ DeviceMethodRequest shall throw a ReferenceError if requestId is falsy or is not a string. ]
    if (typeof(requestId) !== 'string') {
      throw new ReferenceError('requestId must be a string');
    }

    // Codes_SRS_NODE_DEVICE_METHOD_REQUEST_13_004: [ DeviceMethodRequest shall throw an Error if methodName is an empty string. ]
    if (typeof(methodName) === 'string' && methodName.length === 0) {
      throw new Error('methodName must not be an empty string');
    }
    // Codes_SRS_NODE_DEVICE_METHOD_REQUEST_13_003: [ DeviceMethodRequest shall throw a ReferenceError if methodName is falsy or is not a string. ]
    if (typeof(methodName) !== 'string') {
      throw new ReferenceError('methodName must be a string');
    }

    this.requestId = requestId;
    this.methodName = methodName;
    this.payload = JSON.parse(body.toString());
  }
}
