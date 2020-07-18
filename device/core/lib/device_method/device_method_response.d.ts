import { DeviceTransport } from '../internal_client';
import { ErrorCallback } from 'azure-iot-common';
/**
 * a {@link azure-iot-device.DeviceMethodResponse} object is provided to the user with each {@link azure-iot-device.DeviceMethodRequest} allowing the user to construct and send a
 * well-formatted response back to the service for each device method call.
 * An instance of this class is passed as the second parameter to the callback registered via {@link azure-iot-device.Client.onDeviceMethod}.
 */
export declare class DeviceMethodResponse {
    /**
     * The request identifier supplied by the service for this device method call.
     */
    requestId: string;
    /**
     * Boolean indicating whether the response has been sent already.
     */
    isResponseComplete: boolean;
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
    private _transport;
    constructor(requestId: string, transport: DeviceTransport);
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
    send(status: number, payload: any, done: ErrorCallback): void;
    send(status: number, done: ErrorCallback): void;
    send(status: number, payload?: any): Promise<void>;
}
