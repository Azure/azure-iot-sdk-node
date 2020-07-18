import { DeviceIdentity } from './device';
import { Registry } from './registry';
import { IncomingMessageCallback, ResultWithIncomingMessage } from './interfaces';
/**
 * @private
 */
export interface TwinData {
    deviceId: string;
    moduleId?: string;
    etag: string;
    tags: {
        [key: string]: any;
    };
    properties: {
        /**
         * Reported properties: those are written to by the device and read by the service.
         */
        reported: {
            [key: string]: any;
        };
        /**
         * Desired properties: those are written to by the service and read by the device.
         */
        desired: {
            [key: string]: any;
        };
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
 * The recommended way to obtain a {@link azure-iothub.Twin} for a specific device is to use the {@link azure-iothub.Registry.getTwin} method.
 */
export declare class Twin implements TwinData {
    /**
     * Unique identifier of the device identity associated with the twin, as it exists in the device identity registry.
     */
    deviceId: string;
    /**
     * Module identifier for the module associated with the twin, as it exists in the device identity registry.
     */
    moduleId?: string;
    /**
     * Tag used in optimistic concurrency to avoid multiple parallel editions of the device twin.
     */
    etag: string;
    /**
     * Collection of key/value pairs that is available only on the service side and can be used in queries to find specific devices.
     */
    tags: {
        [key: string]: string;
    };
    /**
     * The desired and reported properties dictionnaries (respectively in `properties.desired` and `properties.reported`).
     */
    properties: {
        /**
         * Reported properties: those are written to by the device and read by the service.
         */
        reported: {
            [key: string]: any;
        };
        /**
         * Desired properties: those are written to by the service and read by the device.
         */
        desired: {
            [key: string]: any;
        };
    };
    private _registry;
    /**
     * Instantiates a new {@link azure-iothub.Twin}. The recommended way to get a new {@link azure-iothub.Twin} object is to use the {@link azure-iothub.Registry.getTwin} method.
     * @constructor
     * @param {string|Object}  device      A device identifier string or an object describing the device. If an Object,
     *                                     it must contain a deviceId property.
     * @param {Registry}       registryClient   The HTTP registry client used to execute REST API calls.
     */
    constructor(device: DeviceIdentity | string, registryClient: Registry);
    /**
     * @method            module:azure-iothub.Twin.get
     * @description       Gets the latest version of this device twin from the IoT Hub service.
     * @param {Function}  [done]      The optional function to call when the operation is
     *                                complete. `done` will be called with three
     *                                arguments: an Error object (can be null), a
     *                                {@link module:azure-iothub.Twin|Twin}
     *                                object representing the created device
     *                                identity, and a transport-specific response
     *                                object useful for logging or debugging.
     * @returns {Promise<ResultWithIncomingMessage<Twin>> | void} Promise if no callback function was passed, void otherwise.
     */
    get(done: IncomingMessageCallback<Twin>): void;
    get(): Promise<ResultWithIncomingMessage<Twin>>;
    /**
     * @method            module:azure-iothub.Twin.update
     * @description       Update the device twin with the patch provided as argument.
     * @param {Object}    patch       Object containing the new values to apply to this device twin.
     * @param {Function}  [done]      The optional function to call when the operation is
     *                                complete. `done` will be called with three
     *                                arguments: an Error object (can be null), a
     *                                {@link module:azure-iothub.Twin|Twin}
     *                                object representing the created device
     *                                identity, and a transport-specific response
     *                                object useful for logging or debugging.
     * @returns {Promise<ResultWithIncomingMessage<Twin>> | void} Promise if no callback function was passed, void otherwise.
     */
    update(patch: any, done: IncomingMessageCallback<Twin>): void;
    update(patch: any): Promise<ResultWithIncomingMessage<Twin>>;
    toJSON(): object;
}
