/**
 * @private
 */
export interface DeviceIdentity {
    deviceId: string;
    generationId?: string;
    etag?: string;
    connectionState?: Device.ConnectionState;
    status?: Device.DeviceStatus;
    statusReason?: string;
    connectionStateUpdatedTime?: string;
    statusUpdatedTime?: string;
    lastActivityTime?: string;
    cloudToDeviceMessageCount?: string;
    authentication?: Device.Authentication;
    capabilities?: Device.Capabilities;
    deviceScope?: string;
}
/**
 * Creates a representation of a device for use with the [device identity registry]{@link azure-iothub.Registry} APIs.
 *
 * **This class is deprecated** because the [device identity registry]{@link azure-iothub.Registry} can work directly with JSON objects
 * containing a partial description of the device, not necessarily the full object. On top of that initially this class was shipped with a typo
 * on the `symmetricKey` property name (it was pascal-cased instead of camel-cased). The SDK is keeping this class around in order not to break existing code
 * but this will be removed in a future major version update and customers should instead use plain JSON objects.
 *
 * @deprecated
 */
export declare class Device implements DeviceIdentity {
    /**
     * Unique device identifier as it exists in the Azure IoT hub device registry.
     */
    deviceId: string;
    /**
     * Used to disambiguate devices that have been deleted/recreated with the same `deviceId`
     */
    generationId?: string;
    /**
     * Weak entity tag assigned to this device identity description
     */
    etag?: string;
    /**
     * Whether the device is 'connected' or 'disconnected'. It is not recommended to use this property to determine if the device is actually connected right now though,
     * since the device connection may have timed out and the IoT hub may not have detected it, or if the device is using HTTPS to connect.
     * If you have a need to monitor device connections, the recommneded way is to use the [operations monitoring]{@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-operations-monitoring} feature of your hub.
     */
    connectionState?: Device.ConnectionState;
    /**
     * 'enabled' (device authorized to connect, can send/receive messages) or 'disabled'.
     */
    status?: Device.DeviceStatus;
    /**
     * 128-character string set when the device is disabled.
     */
    statusReason?: string;
    /**
     * Timestamp representing the last time `connectionState` changed.
     */
    connectionStateUpdatedTime?: string;
    /**
     * Timestamp representing the last time `status` changed.
     */
    statusUpdatedTime?: string;
    /**
     * Timestamp representing the last time the device authenticated, sent a message, or received a message.
     */
    lastActivityTime?: string;
    /**
     * Number of c2d messages waiting to by delivered to the device.
     */
    cloudToDeviceMessageCount?: string;
    /**
     * Contains the symmetric keys used to authenticate this device.
     */
    authentication?: Device.Authentication;
    /**
     * Contains the capabilities of this device.
     */
    capabilities?: Device.Capabilities;
    /**
     * Instantiate a new {@link azure-iothub.Device} object.
     * @param jsonData An optional JSON representation of the device, which will be mapped to properties in the object. If no argument is provided, Device properties will be assigned default values.
     */
    constructor(jsonData?: any);
}
export declare namespace Device {
    interface _SymmetricKey {
        primaryKey: string;
        secondaryKey: string;
    }
    interface Authentication {
        SymmetricKey?: _SymmetricKey;
        symmetricKey?: _SymmetricKey;
        x509Thumbprint?: X509Thumbprints;
    }
    interface X509Thumbprints {
        primaryThumbprint?: string;
        secondaryThumbprint?: string;
    }
    interface Capabilities {
        iotEdge?: boolean;
        [x: string]: any;
    }
    type ConnectionState = 'connected' | 'disconnected';
    type DeviceStatus = 'enabled' | 'disabled';
}
