import { EventEmitter } from 'events';
import { AuthenticationProvider } from 'azure-iot-common';
import { MethodMessage, DeviceMethodResponse } from 'azure-iot-device';
import { Amqp as BaseAmqpClient } from 'azure-iot-amqp-base';
/**
 * @private
 */
export declare class AmqpDeviceMethodClient extends EventEmitter {
    private _authenticationProvider;
    private _amqpClient;
    private _methodEndpoint;
    private _fsm;
    private _senderLink;
    private _receiverLink;
    constructor(authenticationProvider: AuthenticationProvider, amqpClient: BaseAmqpClient);
    attach(callback: (err: Error) => void): void;
    detach(callback: (err: Error) => void): void;
    forceDetach(): void;
    sendMethodResponse(response: DeviceMethodResponse, callback?: (err?: Error, result?: any) => void): void;
    onDeviceMethod(methodName: string, callback: (request: MethodMessage, response: DeviceMethodResponse) => void): void;
}
