/**
 * Represents the data passed in from the service to the device when a device method is called from the cloud.
 * An instance of this class is passed to the callback registered via {@link azure-iot-device.Client.onDeviceMethod}.
 */
export declare class DeviceMethodRequest {
    /**
     * The request identifier supplied by the service for this device method call.
     */
    requestId: string;
    /**
     * The name of the method to be called.
     */
    methodName: string;
    /**
     * A Node `Buffer` representing the payload of the method call request.
     */
    payload: any;
    constructor(requestId: string, methodName: string, body?: any);
}
