import { DeviceMethodRequest, DeviceMethodResponse } from '.';
export interface DeviceMethodExchange {
    request: DeviceMethodRequest;
    response: DeviceMethodResponse;
}
export declare function createDeviceMethodExchange(request: DeviceMethodRequest, response: DeviceMethodResponse): DeviceMethodExchange;
