import { EventEmitter } from 'events';
import { ErrorCallback, Callback } from 'azure-iot-common';
import { PollingTransport, RegistrationRequest, DeviceRegistrationResult } from './interfaces';
/**
 * @private
 */
export declare class PollingStateMachine extends EventEmitter {
    private _fsm;
    private _pollingTimer;
    private _queryTimer;
    private _transport;
    private _currentOperationCallback;
    constructor(transport: PollingTransport);
    register(request: RegistrationRequest, callback: Callback<DeviceRegistrationResult>): void;
    register(request: RegistrationRequest): Promise<DeviceRegistrationResult>;
    cancel(callback: ErrorCallback): void;
    cancel(): Promise<void>;
    disconnect(callback: ErrorCallback): void;
    disconnect(): Promise<void>;
}
