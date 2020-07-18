import { Callback } from 'azure-iot-common';
export { DeviceMethodRequest } from './device_method_request';
export { DeviceMethodResponse } from './device_method_response';
export { DeviceMethodExchange, createDeviceMethodExchange } from './device_method_exchange';
export { MethodClient } from './method_client';
export interface MethodParams {
    methodName: string;
    payload: any;
    connectTimeoutInSeconds: number;
    responseTimeoutInSeconds: number;
}
export interface MethodResult {
    status: number;
    payload: any;
}
export declare type MethodCallback = Callback<MethodResult>;
