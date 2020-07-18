import { AuthenticationProvider } from 'azure-iot-common';
import { MethodParams, MethodCallback, MethodResult } from '.';
/**
 * @private
 */
export declare class MethodClient {
    private _authProvider;
    private _restApiClient;
    private _options;
    private _httpHeaders;
    constructor(authProvider: AuthenticationProvider);
    invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams, callback: MethodCallback): void;
    invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams): Promise<MethodResult>;
    setOptions(options: any): void;
    private _init;
}
