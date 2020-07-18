/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
/**
 * Error thrown when an argument is invalid.
 *
 * @augments {Error}
 */
export declare class ArgumentError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when an argument has a value that is out of the admissible range.
 *
 * @augments {Error}
 */
export declare class ArgumentOutOfRangeError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the message queue for a device is full.
 *
 * @augments {Error}
 */
export declare class DeviceMaximumQueueDepthExceededError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when a device cannot be found in the IoT Hub instance registry.
 *
 * @augments {Error}
 */
export declare class DeviceNotFoundError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when a string that is supposed to have a specific formatting is not formatted properly.
 *
 * @augments {Error}
 */
export declare class FormatError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the connection parameters are wrong and the server refused the connection.
 *
 * @augments {Error}
 */
export declare class UnauthorizedError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when a feature is not implemented yet but the placeholder is present.
 *
 * @augments {Error}
 */
export declare class NotImplementedError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the device is disconnected and the operation cannot be completed.
 *
 * @augments {Error}
 */
export declare class NotConnectedError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown the the Azure IoT hub quota has been exceeded. Quotas are reset periodically, this operation will have to wait until then.
 * To learn more about quotas, see {@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-quotas-throttling|Azure IoT Hub quotas and throttling}
 *
 * @augments {Error}
 */
export declare class IotHubQuotaExceededError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the message sent is too large: the maximum size is 256Kb.
 *
 * @augments {Error}
 */
export declare class MessageTooLargeError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when an internal server error occured. You may have found a bug?
 *
 * @augments {Error}
 */
export declare class InternalServerError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the service is unavailable. The operation should be retried.
 *
 * @augments {Error}
 */
export declare class ServiceUnavailableError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the Azure IoT hub was not found.
 *
 * @augments {Error}
 */
export declare class IotHubNotFoundError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when IoT Hub has been suspended.
 *
 * @augments {Error}
 */
export declare class IoTHubSuspendedError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the job with the specified identifier was not found.
 *
 * @augments {Error}
 */
export declare class JobNotFoundError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the maximum number of devices on a specific hub has been reached.
 *
 * @augments {Error}
 */
export declare class TooManyDevicesError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when IoT Hub is throttled due to excessive activity.
 * To learn more about quotas, see {@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-quotas-throttling|Azure IoT Hub quotas and throttling}
 *
 * @augments {Error}
 */
export declare class ThrottlingError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the device id used for device creation already exists in the Device Identity Registry.
 *
 * @augments {Error}
 */
export declare class DeviceAlreadyExistsError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when settling a message fails because the lock token associated with the message is lost.
 *
 * @augments {Error}
 */
export declare class DeviceMessageLockLostError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the eTag specified is incorrectly formatted or out of date.
 *
 * @augments {Error}
 */
export declare class InvalidEtagError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when an operation is attempted but is not allowed.
 *
 * @augments {Error}
 */
export declare class InvalidOperationError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when a condition that should have been met in order to execute an operation was not.
 *
 * @augments {Error}
 */
export declare class PreconditionFailedError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when a timeout occurs
 *
 * @augments {Error}
 */
export declare class TimeoutError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when a device sends a bad response to a device method call.
 *
 * @augments {Error}
 */
export declare class BadDeviceResponseError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the IoT Hub instance doesn't process the device method call in time.
 *
 * @augments {Error}
 */
export declare class GatewayTimeoutError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the device doesn't process the method call in time.
 *
 * @augments {Error}
 */
export declare class DeviceTimeoutError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when the c2d feature stopped working at the transport level, requiring the client to retry starting it.
 *
 * @augments {Error}
 */
export declare class CloudToDeviceDetachedError extends Error {
    innerError: Error;
    constructor(message?: string);
}
/**
 * Error thrown when the device methods feature stopped working at the transport level, requiring the client to retry starting it.
 *
 * @augments {Error}
 */
export declare class DeviceMethodsDetachedError extends Error {
    innerError: Error;
    constructor(message?: string);
}
/**
 * Error thrown when the twin feature stopped working at the transport level, requiring the client to retry starting it.
 *
 * @augments {Error}
 */
export declare class TwinDetachedError extends Error {
    innerError: Error;
    constructor(message?: string);
}
/**
 * Generic error thrown when a twin request fails with an unknown error code.
 *
 * @augments {Error}
 */
export declare class TwinRequestError extends Error {
    transportError: any;
    constructor(message?: string);
}
/**
 * Error thrown when any operation (local or remote) is cancelled
 *
 * @augments {Error}
 */
export declare class OperationCancelledError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when a DPS registration operation fails
 *
 * @augments {Error}
 */
export declare class DeviceRegistrationFailedError extends Error {
    constructor(message?: string);
}
/**
 * Error thrown when a low level security device/driver fails.
 *
 * @augments {Error}
 */
export declare class SecurityDeviceError extends Error {
    constructor(message?: string);
}
