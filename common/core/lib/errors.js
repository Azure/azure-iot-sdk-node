/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Error thrown when an argument is invalid.
 *
 * @augments {Error}
 */
var ArgumentError = /** @class */ (function (_super) {
    __extends(ArgumentError, _super);
    function ArgumentError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'ArgumentError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        // Set the prototype explicitly.
        // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(_this, ArgumentError.prototype);
        return _this;
    }
    return ArgumentError;
}(Error));
exports.ArgumentError = ArgumentError;
/**
 * Error thrown when an argument has a value that is out of the admissible range.
 *
 * @augments {Error}
 */
var ArgumentOutOfRangeError = /** @class */ (function (_super) {
    __extends(ArgumentOutOfRangeError, _super);
    function ArgumentOutOfRangeError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'ArgumentOutOfRangeError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, ArgumentOutOfRangeError.prototype);
        return _this;
    }
    return ArgumentOutOfRangeError;
}(Error));
exports.ArgumentOutOfRangeError = ArgumentOutOfRangeError;
/**
 * Error thrown when the message queue for a device is full.
 *
 * @augments {Error}
 */
var DeviceMaximumQueueDepthExceededError = /** @class */ (function (_super) {
    __extends(DeviceMaximumQueueDepthExceededError, _super);
    function DeviceMaximumQueueDepthExceededError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'DeviceMaximumQueueDepthExceededError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, DeviceMaximumQueueDepthExceededError.prototype);
        return _this;
    }
    return DeviceMaximumQueueDepthExceededError;
}(Error));
exports.DeviceMaximumQueueDepthExceededError = DeviceMaximumQueueDepthExceededError;
/**
 * Error thrown when a device cannot be found in the IoT Hub instance registry.
 *
 * @augments {Error}
 */
var DeviceNotFoundError = /** @class */ (function (_super) {
    __extends(DeviceNotFoundError, _super);
    function DeviceNotFoundError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'DeviceNotFoundError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, DeviceNotFoundError.prototype);
        return _this;
    }
    return DeviceNotFoundError;
}(Error));
exports.DeviceNotFoundError = DeviceNotFoundError;
/**
 * Error thrown when a string that is supposed to have a specific formatting is not formatted properly.
 *
 * @augments {Error}
 */
var FormatError = /** @class */ (function (_super) {
    __extends(FormatError, _super);
    function FormatError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'FormatError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, FormatError.prototype);
        return _this;
    }
    return FormatError;
}(Error));
exports.FormatError = FormatError;
/**
 * Error thrown when the connection parameters are wrong and the server refused the connection.
 *
 * @augments {Error}
 */
var UnauthorizedError = /** @class */ (function (_super) {
    __extends(UnauthorizedError, _super);
    function UnauthorizedError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'UnauthorizedError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, UnauthorizedError.prototype);
        return _this;
    }
    return UnauthorizedError;
}(Error));
exports.UnauthorizedError = UnauthorizedError;
/**
 * Error thrown when a feature is not implemented yet but the placeholder is present.
 *
 * @augments {Error}
 */
var NotImplementedError = /** @class */ (function (_super) {
    __extends(NotImplementedError, _super);
    function NotImplementedError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'NotImplementedError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, NotImplementedError.prototype);
        return _this;
    }
    return NotImplementedError;
}(Error));
exports.NotImplementedError = NotImplementedError;
/**
 * Error thrown when the device is disconnected and the operation cannot be completed.
 *
 * @augments {Error}
 */
var NotConnectedError = /** @class */ (function (_super) {
    __extends(NotConnectedError, _super);
    function NotConnectedError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'NotConnectedError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, NotConnectedError.prototype);
        return _this;
    }
    return NotConnectedError;
}(Error));
exports.NotConnectedError = NotConnectedError;
/**
 * Error thrown the the Azure IoT hub quota has been exceeded. Quotas are reset periodically, this operation will have to wait until then.
 * To learn more about quotas, see {@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-quotas-throttling|Azure IoT Hub quotas and throttling}
 *
 * @augments {Error}
 */
var IotHubQuotaExceededError = /** @class */ (function (_super) {
    __extends(IotHubQuotaExceededError, _super);
    function IotHubQuotaExceededError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'IotHubQuotaExceededError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, IotHubQuotaExceededError.prototype);
        return _this;
    }
    return IotHubQuotaExceededError;
}(Error));
exports.IotHubQuotaExceededError = IotHubQuotaExceededError;
/**
 * Error thrown when the message sent is too large: the maximum size is 256Kb.
 *
 * @augments {Error}
 */
var MessageTooLargeError = /** @class */ (function (_super) {
    __extends(MessageTooLargeError, _super);
    function MessageTooLargeError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'MessageTooLargeError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, MessageTooLargeError.prototype);
        return _this;
    }
    return MessageTooLargeError;
}(Error));
exports.MessageTooLargeError = MessageTooLargeError;
/**
 * Error thrown when an internal server error occured. You may have found a bug?
 *
 * @augments {Error}
 */
var InternalServerError = /** @class */ (function (_super) {
    __extends(InternalServerError, _super);
    function InternalServerError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'InternalServerError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, InternalServerError.prototype);
        return _this;
    }
    return InternalServerError;
}(Error));
exports.InternalServerError = InternalServerError;
/**
 * Error thrown when the service is unavailable. The operation should be retried.
 *
 * @augments {Error}
 */
var ServiceUnavailableError = /** @class */ (function (_super) {
    __extends(ServiceUnavailableError, _super);
    function ServiceUnavailableError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'ServiceUnavailableError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, ServiceUnavailableError.prototype);
        return _this;
    }
    return ServiceUnavailableError;
}(Error));
exports.ServiceUnavailableError = ServiceUnavailableError;
/**
 * Error thrown when the Azure IoT hub was not found.
 *
 * @augments {Error}
 */
var IotHubNotFoundError = /** @class */ (function (_super) {
    __extends(IotHubNotFoundError, _super);
    function IotHubNotFoundError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'IotHubNotFoundError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, IotHubNotFoundError.prototype);
        return _this;
    }
    return IotHubNotFoundError;
}(Error));
exports.IotHubNotFoundError = IotHubNotFoundError;
/**
 * Error thrown when IoT Hub has been suspended.
 *
 * @augments {Error}
 */
var IoTHubSuspendedError = /** @class */ (function (_super) {
    __extends(IoTHubSuspendedError, _super);
    function IoTHubSuspendedError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'IoTHubSuspendedError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, IoTHubSuspendedError.prototype);
        return _this;
    }
    return IoTHubSuspendedError;
}(Error));
exports.IoTHubSuspendedError = IoTHubSuspendedError;
/**
 * Error thrown when the job with the specified identifier was not found.
 *
 * @augments {Error}
 */
var JobNotFoundError = /** @class */ (function (_super) {
    __extends(JobNotFoundError, _super);
    function JobNotFoundError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'JobNotFoundError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, JobNotFoundError.prototype);
        return _this;
    }
    return JobNotFoundError;
}(Error));
exports.JobNotFoundError = JobNotFoundError;
/**
 * Error thrown when the maximum number of devices on a specific hub has been reached.
 *
 * @augments {Error}
 */
var TooManyDevicesError = /** @class */ (function (_super) {
    __extends(TooManyDevicesError, _super);
    function TooManyDevicesError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'TooManyDevicesError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, TooManyDevicesError.prototype);
        return _this;
    }
    return TooManyDevicesError;
}(Error));
exports.TooManyDevicesError = TooManyDevicesError;
/**
 * Error thrown when IoT Hub is throttled due to excessive activity.
 * To learn more about quotas, see {@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-quotas-throttling|Azure IoT Hub quotas and throttling}
 *
 * @augments {Error}
 */
var ThrottlingError = /** @class */ (function (_super) {
    __extends(ThrottlingError, _super);
    function ThrottlingError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'ThrottlingError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, ThrottlingError.prototype);
        return _this;
    }
    return ThrottlingError;
}(Error));
exports.ThrottlingError = ThrottlingError;
/**
 * Error thrown when the device id used for device creation already exists in the Device Identity Registry.
 *
 * @augments {Error}
 */
var DeviceAlreadyExistsError = /** @class */ (function (_super) {
    __extends(DeviceAlreadyExistsError, _super);
    function DeviceAlreadyExistsError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'DeviceAlreadyExistsError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, DeviceAlreadyExistsError.prototype);
        return _this;
    }
    return DeviceAlreadyExistsError;
}(Error));
exports.DeviceAlreadyExistsError = DeviceAlreadyExistsError;
/**
 * Error thrown when settling a message fails because the lock token associated with the message is lost.
 *
 * @augments {Error}
 */
var DeviceMessageLockLostError = /** @class */ (function (_super) {
    __extends(DeviceMessageLockLostError, _super);
    function DeviceMessageLockLostError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'DeviceMessageLockLostError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, DeviceMessageLockLostError.prototype);
        return _this;
    }
    return DeviceMessageLockLostError;
}(Error));
exports.DeviceMessageLockLostError = DeviceMessageLockLostError;
/**
 * Error thrown when the eTag specified is incorrectly formatted or out of date.
 *
 * @augments {Error}
 */
var InvalidEtagError = /** @class */ (function (_super) {
    __extends(InvalidEtagError, _super);
    function InvalidEtagError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'InvalidEtagError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, InvalidEtagError.prototype);
        return _this;
    }
    return InvalidEtagError;
}(Error));
exports.InvalidEtagError = InvalidEtagError;
/**
 * Error thrown when an operation is attempted but is not allowed.
 *
 * @augments {Error}
 */
var InvalidOperationError = /** @class */ (function (_super) {
    __extends(InvalidOperationError, _super);
    function InvalidOperationError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'InvalidOperationError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, InvalidOperationError.prototype);
        return _this;
    }
    return InvalidOperationError;
}(Error));
exports.InvalidOperationError = InvalidOperationError;
/**
 * Error thrown when a condition that should have been met in order to execute an operation was not.
 *
 * @augments {Error}
 */
var PreconditionFailedError = /** @class */ (function (_super) {
    __extends(PreconditionFailedError, _super);
    function PreconditionFailedError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'PreconditionFailedError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, PreconditionFailedError.prototype);
        return _this;
    }
    return PreconditionFailedError;
}(Error));
exports.PreconditionFailedError = PreconditionFailedError;
/**
 * Error thrown when a timeout occurs
 *
 * @augments {Error}
 */
var TimeoutError = /** @class */ (function (_super) {
    __extends(TimeoutError, _super);
    function TimeoutError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'TimeoutError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, TimeoutError.prototype);
        return _this;
    }
    return TimeoutError;
}(Error));
exports.TimeoutError = TimeoutError;
/**
 * Error thrown when a device sends a bad response to a device method call.
 *
 * @augments {Error}
 */
var BadDeviceResponseError = /** @class */ (function (_super) {
    __extends(BadDeviceResponseError, _super);
    function BadDeviceResponseError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'BadDeviceResponseError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, BadDeviceResponseError.prototype);
        return _this;
    }
    return BadDeviceResponseError;
}(Error));
exports.BadDeviceResponseError = BadDeviceResponseError;
/**
 * Error thrown when the IoT Hub instance doesn't process the device method call in time.
 *
 * @augments {Error}
 */
var GatewayTimeoutError = /** @class */ (function (_super) {
    __extends(GatewayTimeoutError, _super);
    function GatewayTimeoutError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'GatewayTimeoutError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, GatewayTimeoutError.prototype);
        return _this;
    }
    return GatewayTimeoutError;
}(Error));
exports.GatewayTimeoutError = GatewayTimeoutError;
/**
 * Error thrown when the device doesn't process the method call in time.
 *
 * @augments {Error}
 */
var DeviceTimeoutError = /** @class */ (function (_super) {
    __extends(DeviceTimeoutError, _super);
    function DeviceTimeoutError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'DeviceTimeoutError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, DeviceTimeoutError.prototype);
        return _this;
    }
    return DeviceTimeoutError;
}(Error));
exports.DeviceTimeoutError = DeviceTimeoutError;
/**
 * Error thrown when the c2d feature stopped working at the transport level, requiring the client to retry starting it.
 *
 * @augments {Error}
 */
var CloudToDeviceDetachedError = /** @class */ (function (_super) {
    __extends(CloudToDeviceDetachedError, _super);
    function CloudToDeviceDetachedError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'CloudToDeviceDetachedError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, CloudToDeviceDetachedError.prototype);
        return _this;
    }
    return CloudToDeviceDetachedError;
}(Error));
exports.CloudToDeviceDetachedError = CloudToDeviceDetachedError;
/**
 * Error thrown when the device methods feature stopped working at the transport level, requiring the client to retry starting it.
 *
 * @augments {Error}
 */
var DeviceMethodsDetachedError = /** @class */ (function (_super) {
    __extends(DeviceMethodsDetachedError, _super);
    function DeviceMethodsDetachedError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'DeviceMethodsDetachedError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, DeviceMethodsDetachedError.prototype);
        return _this;
    }
    return DeviceMethodsDetachedError;
}(Error));
exports.DeviceMethodsDetachedError = DeviceMethodsDetachedError;
/**
 * Error thrown when the twin feature stopped working at the transport level, requiring the client to retry starting it.
 *
 * @augments {Error}
 */
var TwinDetachedError = /** @class */ (function (_super) {
    __extends(TwinDetachedError, _super);
    function TwinDetachedError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'TwinDetachedError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, TwinDetachedError.prototype);
        return _this;
    }
    return TwinDetachedError;
}(Error));
exports.TwinDetachedError = TwinDetachedError;
/**
 * Generic error thrown when a twin request fails with an unknown error code.
 *
 * @augments {Error}
 */
var TwinRequestError = /** @class */ (function (_super) {
    __extends(TwinRequestError, _super);
    function TwinRequestError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'TwinRequestError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, TwinRequestError.prototype);
        return _this;
    }
    return TwinRequestError;
}(Error));
exports.TwinRequestError = TwinRequestError;
/**
 * Error thrown when any operation (local or remote) is cancelled
 *
 * @augments {Error}
 */
var OperationCancelledError = /** @class */ (function (_super) {
    __extends(OperationCancelledError, _super);
    function OperationCancelledError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'OperationCancelledError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, OperationCancelledError.prototype);
        return _this;
    }
    return OperationCancelledError;
}(Error));
exports.OperationCancelledError = OperationCancelledError;
/**
 * Error thrown when a DPS registration operation fails
 *
 * @augments {Error}
 */
var DeviceRegistrationFailedError = /** @class */ (function (_super) {
    __extends(DeviceRegistrationFailedError, _super);
    function DeviceRegistrationFailedError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'ProvisioningRegistrationFailedError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, DeviceRegistrationFailedError.prototype);
        return _this;
    }
    return DeviceRegistrationFailedError;
}(Error));
exports.DeviceRegistrationFailedError = DeviceRegistrationFailedError;
/**
 * Error thrown when a low level security device/driver fails.
 *
 * @augments {Error}
 */
var SecurityDeviceError = /** @class */ (function (_super) {
    __extends(SecurityDeviceError, _super);
    function SecurityDeviceError(message) {
        var _this = 
        /* istanbul ignore next */
        _super.call(this, message) || this;
        _this.name = 'SecurityDeviceError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        Object.setPrototypeOf(_this, SecurityDeviceError.prototype);
        return _this;
    }
    return SecurityDeviceError;
}(Error));
exports.SecurityDeviceError = SecurityDeviceError;
//# sourceMappingURL=errors.js.map