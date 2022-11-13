/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

/**
 * Error thrown when an argument is invalid.
 *
 * @augments {Error}
 */
export class ArgumentError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'ArgumentError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    // Set the prototype explicitly.
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, ArgumentError.prototype);
  }
}

/**
 * Error thrown when an argument has a value that is out of the admissible range.
 *
 * @augments {Error}
 */
export class ArgumentOutOfRangeError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'ArgumentOutOfRangeError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ArgumentOutOfRangeError.prototype);
  }
}

/**
 * Error thrown when the message queue for a device is full.
 *
 * @augments {Error}
 */
export class DeviceMaximumQueueDepthExceededError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'DeviceMaximumQueueDepthExceededError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DeviceMaximumQueueDepthExceededError.prototype);
  }
}

/**
 * Error thrown when a device cannot be found in the IoT Hub instance registry.
 *
 * @augments {Error}
 */
export class DeviceNotFoundError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'DeviceNotFoundError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DeviceNotFoundError.prototype);
  }
}

/**
 * Error thrown when a string that is supposed to have a specific formatting is not formatted properly.
 *
 * @augments {Error}
 */
export class FormatError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'FormatError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, FormatError.prototype);
  }
}

/**
 * Error thrown when the connection parameters are wrong and the server refused the connection.
 *
 * @augments {Error}
 */
export class UnauthorizedError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'UnauthorizedError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Error thrown when a feature is not implemented yet but the placeholder is present.
 *
 * @augments {Error}
 */
export class NotImplementedError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'NotImplementedError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}

/**
 * Error thrown when the device is disconnected and the operation cannot be completed.
 *
 * @augments {Error}
 */
export class NotConnectedError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'NotConnectedError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, NotConnectedError.prototype);
  }
}

/**
 * Error thrown the the Azure IoT hub quota has been exceeded. Quotas are reset periodically, this operation will have to wait until then.
 * To learn more about quotas, see {@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-quotas-throttling|Azure IoT Hub quotas and throttling}
 *
 * @augments {Error}
 */
export class IotHubQuotaExceededError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'IotHubQuotaExceededError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, IotHubQuotaExceededError.prototype);
  }
}

/**
 * Error thrown when the message sent is too large: the maximum size is 256Kb.
 *
 * @augments {Error}
 */
export class MessageTooLargeError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'MessageTooLargeError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, MessageTooLargeError.prototype);
  }
}

/**
 * Error thrown when an internal server error occurred. You may have found a bug?
 *
 * @augments {Error}
 */
export class InternalServerError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'InternalServerError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * Error thrown when the service is unavailable. The operation should be retried.
 *
 * @augments {Error}
 */
export class ServiceUnavailableError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'ServiceUnavailableError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Error thrown when the Azure IoT hub was not found.
 *
 * @augments {Error}
 */
export class IotHubNotFoundError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'IotHubNotFoundError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, IotHubNotFoundError.prototype);
  }
}

/**
 * Error thrown when IoT Hub has been suspended.
 *
 * @augments {Error}
 */
export class IoTHubSuspendedError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'IoTHubSuspendedError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, IoTHubSuspendedError.prototype);
  }
}

/**
 * Error thrown when the job with the specified identifier was not found.
 *
 * @augments {Error}
 */
export class JobNotFoundError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'JobNotFoundError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, JobNotFoundError.prototype);
  }
}

/**
 * Error thrown when the maximum number of devices on a specific hub has been reached.
 *
 * @augments {Error}
 */
export class TooManyDevicesError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'TooManyDevicesError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, TooManyDevicesError.prototype);
  }
}

/**
 * Error thrown when IoT Hub is throttled due to excessive activity.
 * To learn more about quotas, see {@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-quotas-throttling|Azure IoT Hub quotas and throttling}
 *
 * @augments {Error}
 */
export class ThrottlingError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'ThrottlingError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ThrottlingError.prototype);
  }
}

/**
 * Error thrown when the device id used for device creation already exists in the Device Identity Registry.
 *
 * @augments {Error}
 */
export class DeviceAlreadyExistsError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'DeviceAlreadyExistsError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DeviceAlreadyExistsError.prototype);
  }
}

/**
 * Error thrown when settling a message fails because the lock token associated with the message is lost.
 *
 * @augments {Error}
 */
export class DeviceMessageLockLostError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'DeviceMessageLockLostError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DeviceMessageLockLostError.prototype);
  }
}

/**
 * Error thrown when the eTag specified is incorrectly formatted or out of date.
 *
 * @augments {Error}
 */
export class InvalidEtagError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'InvalidEtagError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidEtagError.prototype);
  }
}

/**
 * Error thrown when an operation is attempted but is not allowed.
 *
 * @augments {Error}
 */
export class InvalidOperationError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'InvalidOperationError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, InvalidOperationError.prototype);
  }
}

/**
 * Error thrown when a condition that should have been met in order to execute an operation was not.
 *
 * @augments {Error}
 */
export class PreconditionFailedError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'PreconditionFailedError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, PreconditionFailedError.prototype);
  }
}

/**
 * Error thrown when a timeout occurs
 *
 * @augments {Error}
 */
export class TimeoutError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'TimeoutError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown when a device sends a bad response to a device method call.
 *
 * @augments {Error}
 */
export class BadDeviceResponseError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'BadDeviceResponseError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, BadDeviceResponseError.prototype);
  }
}

/**
 * Error thrown when the IoT Hub instance doesn't process the device method call in time.
 *
 * @augments {Error}
 */

export class GatewayTimeoutError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'GatewayTimeoutError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, GatewayTimeoutError.prototype);
  }
}

/**
 * Error thrown when the device doesn't process the method call in time.
 *
 * @augments {Error}
 */
export class DeviceTimeoutError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'DeviceTimeoutError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DeviceTimeoutError.prototype);
  }
}

/**
 * Error thrown when the c2d feature stopped working at the transport level, requiring the client to retry starting it.
 *
 * @augments {Error}
 */
export class CloudToDeviceDetachedError extends Error {
  innerError: Error;
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'CloudToDeviceDetachedError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, CloudToDeviceDetachedError.prototype);
  }
}

/**
 * Error thrown when the device methods feature stopped working at the transport level, requiring the client to retry starting it.
 *
 * @augments {Error}
 */
export class DeviceMethodsDetachedError extends Error {
  innerError: Error;
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'DeviceMethodsDetachedError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DeviceMethodsDetachedError.prototype);
  }
}

/**
 * Error thrown when the twin feature stopped working at the transport level, requiring the client to retry starting it.
 *
 * @augments {Error}
 */
export class TwinDetachedError extends Error {
  innerError: Error;
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'TwinDetachedError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, TwinDetachedError.prototype);
  }
}

/**
 * Generic error thrown when a twin request fails with an unknown error code.
 *
 * @augments {Error}
 */
export class TwinRequestError extends Error {
  transportError: any;
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'TwinRequestError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, TwinRequestError.prototype);
  }
}

/**
 * Error thrown when any operation (local or remote) is cancelled
 *
 * @augments {Error}
 */
export class OperationCancelledError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'OperationCancelledError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, OperationCancelledError.prototype);
  }
}

/**
 * Error thrown when a DPS registration operation fails
 *
 * @augments {Error}
 */
export class DeviceRegistrationFailedError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'ProvisioningRegistrationFailedError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, DeviceRegistrationFailedError.prototype);
  }
}

/**
 * Error thrown when a low level security device/driver fails.
 *
 * @augments {Error}
 */
export class SecurityDeviceError extends Error {
  constructor(message?: string) {
    /* istanbul ignore next */
    super(message);
    this.name = 'SecurityDeviceError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, SecurityDeviceError.prototype);
  }
}
