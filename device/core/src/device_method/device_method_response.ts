// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { DeviceTransport } from '../internal_client';
import { ErrorCallback, errorCallbackToPromise } from 'azure-iot-common';

/**
 * a {@link azure-iot-device.DeviceMethodResponse} object is provided to the user with each {@link azure-iot-device.DeviceMethodRequest} allowing the user to construct and send a
 * well-formatted response back to the service for each device method call.
 * An instance of this class is passed as the second parameter to the callback registered via {@link azure-iot-device.Client.onDeviceMethod}.
 */
export class DeviceMethodResponse {
  /**
   * The request identifier supplied by the service for this device method call.
   */
  requestId: string;
  /**
   * Boolean indicating whether the response has been sent already.
   */
  isResponseComplete: boolean = false;
  /**
   * Status code indicating whether the method succeeded (200) or not (any other number that is not 200).
   */
  status: number;
  /**
   * The payload of the response, sent back to the caller on the service side.
   */
  payload: any;
  /**
   * @private
   * An object that implements the interface expected of a transport object, e.g., {@link Http}.
   */
  private _transport: DeviceTransport;

  constructor(requestId: string, transport: DeviceTransport) {
    // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_002: [ DeviceMethodRequest shall throw an Error if requestId is an empty string. ]
    if (typeof (requestId) === 'string' && requestId.length === 0) {
      throw new Error('requestId must not be an empty string');
    }

    // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_001: [ DeviceMethodRequest shall throw a ReferenceError if requestId is falsy or is not a string. ]
    if (typeof (requestId) !== 'string') {
      throw new ReferenceError('requestId must be a string');
    }

    // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_006: [ DeviceMethodResponse shall throw a ReferenceError if transport is falsy. ]
    if (!transport) throw new ReferenceError('transport is \'' + transport + '\'');

    this.requestId = requestId;
    this.isResponseComplete = false;
    this.status = null;
    this.payload = null;
    this._transport = transport;
  }

  /**
   * @method            module:azure-iot-device.deviceMethod.DeviceMethodResponse#send
   * @description       Sends the device method's response back to the service via
   *                    the underlying transport object using the status parameter
   *                    as the status of the method call.
   *
   * @param {Number}    status      A numeric status code to be sent back to the
   *                                service.
   * @param {Object}    [payload]   [optional] The payload of the method response.
   * @param {Function}  [done]      [optional] A callback function which will be
   *                                called once the response has been sent back to
   *                                the service. An error object is passed as an
   *                                argument to the function in case an error
   *                                occurs. If callback is not specified, a Promise
   *                                will be returned.
   *
   * @throws {ReferenceError}       If the `status` parameter is not a number.
   * @throws {Error}                If this response has already been sent to the
   *                                service in a previous call to it. This method
   *                                should be called only once.
   */
  send(status: number, payload?: any | ErrorCallback, done?: ErrorCallback): Promise<void> | void {
    if (typeof (payload) === 'function') {
      if (done !== undefined) {
        throw new Error('Callback must be the last argument');
      } else {
        done = payload;
        payload = null;
      }
    }

    return errorCallbackToPromise((_callback) => {
      // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_009: [ DeviceMethodResponse.send shall throw an Error object if it is called more than once for the same request. ]
      if (this.isResponseComplete) {
        throw new Error('This response has already ended. Cannot end the same response more than once.');
      }

      if (typeof (status) !== 'number') {
        // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_007: [ DeviceMethodResponse.end shall throw a ReferenceError if status is undefined or not a number. ]
        throw new ReferenceError('"status" is "' + status + '". Expected a number.');
      }



      this.status = status;
      this.payload = payload;

      this.isResponseComplete = true;
      // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_008: [ DeviceMethodResponse.send shall notify the service and supply the response for the request along with the status by calling sendMethodResponse on the underlying transport object. ]
      // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_010: [ DeviceMethodResponse.send shall invoke the callback specified by done if it is not falsy. ]
      // Codes_SRS_NODE_DEVICE_METHOD_RESPONSE_13_011: [ DeviceMethodResponse.send shall pass the status of sending the response to the service to done. ]
      this._transport.sendMethodResponse(this, _callback);
    }, done);
  }
}
