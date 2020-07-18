import { EventEmitter } from 'events';
import { RetryPolicy, Callback } from 'azure-iot-common';
import { DeviceTransport } from './internal_client';
/**
 * Contains the desired and reported properties for the Twin.
 */
export interface TwinProperties {
    desired: {
        [key: string]: any;
    };
    reported: {
        [key: string]: any;
    };
}
/**
 * A Device Twin is document describing the state of a device that is stored by an Azure IoT hub and is available even if the device is offline.
 * It is built around 3 sections:
 *   - Tags: key/value pairs only accessible from the service side
 *   - Desired Properties: updated by a service and received by the device
 *   - Reported Properties: updated by the device and received by the service.
 *
 * Note that although it is a possibility, desired and reported properties do not have to match
 * and that the logic to sync these two collections, if necessary, is left to the user of the SDK.
 *
 * For more information see {@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins|Understanding Device Twins}.
 *
 *  @fires Twin#properties.desired[.path]
 *
 */
export declare class Twin extends EventEmitter {
    static errorEvent: string;
    static desiredPath: string;
    /**
     * properties.desired events.
     *
     * @event Twin#properties.desired[.path]
     * @type {object}
     */
    /**
     * The desired and reported properties dictionaries (respectively in `properties.desired` and `properties.reported`).
     */
    properties: TwinProperties;
    desiredPropertiesUpdatesEnabled: boolean;
    private _transport;
    private _retryPolicy;
    private _maxOperationTimeout;
    /**
     * The constructor should not be used directly and instead the SDK user should use the {@link Client#getTwin} method to obtain a valid `Twin` object.
     * @constructor
     * @private
     * @param transport    The transport to use in order to communicate with the Azure IoT hub.
     * @param retryPolicy  The retry policy to apply when encountering an error.
     * @param maxTimeout   The maximum time allowed for the twin to retry before the operation is considered failed.
     */
    constructor(transport: DeviceTransport, retryPolicy: RetryPolicy, maxTimeout: number);
    /**
     * Gets the whole twin from the service.
     *
     * @param [callback] optional function that shall be called back with either the twin or an error if the transport fails to retrieve the twin.
     * @returns {Promise<Twin> | void} Promise if no callback function was passed, void otherwise.
     */
    get(callback: Callback<Twin>): void;
    get(): Promise<Twin>;
    /**
     * @private
     */
    setRetryPolicy(policy: RetryPolicy): void;
    /**
     * @private
     */
    enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
    private _updateReportedProperties;
    private _mergePatch;
    private _clearCachedProperties;
    private _fireChangeEvents;
    private _onDesiredPropertiesUpdate;
    private _handleNewListener;
}
