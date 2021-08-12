import { JSONValue } from '.';
import { DeviceMethodRequest, DeviceMethodResponse } from '../device_method';
import { ErrorCallback } from 'azure-iot-common';

export class CommandRequest {
    /**
     * The request identifier supplied by the service for this command call.
     */
    requestId: string;

    /**
     * The name of the command being called.
     */
    commandName: string;

    /**
     * The name of the component corresponding to the command being called.
     */
    componentName?: string;

    /**
     * The payload of this command call.
     */
    payload: JSONValue;

    constructor(methodRequest: DeviceMethodRequest) {
        this.requestId = methodRequest.requestId;
        this.payload = methodRequest.payload;
        const splitMethod = methodRequest.methodName.split('*');
        if (splitMethod.length > 1) {
            this.componentName = splitMethod[0];
            this.commandName = splitMethod.slice(1).join('*');
        } else {
            this.commandName = splitMethod[0];
        }
    }
}

export class CommandResponse {
    private methodSend: (status: number, payload?: any | ErrorCallback, done?: ErrorCallback) => Promise<void> | void;

    constructor(methodResponse: DeviceMethodResponse) {
        this.methodSend = methodResponse.send.bind(methodResponse);
    }

    /**
     * Sends a response to the service for a command request.
     *
     * @param {number}    status   A numeric status code to be sent back to the service
     * @param {JSONValue} payload  A json-serializable object representing the payload of command response.
     * @param {function}  callback A callback function which will be called once the response has been sent to the service.
     *                             If an error occurs, an error object is passed as the first argument to the callback.
     *                             If the callback is not specified, send() will return a Promise.
     */
    send(status: number): Promise<void>;
    send(status: number, payload: JSONValue): Promise<void>;
    send(status: number, callback: ErrorCallback): void;
    send(status: number, payload: JSONValue, callback: ErrorCallback): void;
    send(status: number, payloadOrCallback?: JSONValue | ErrorCallback, callback?: ErrorCallback): Promise<void> | void {
        return this.methodSend(status, payloadOrCallback, callback);
    }
}
