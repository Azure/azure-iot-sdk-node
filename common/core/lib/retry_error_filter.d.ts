/**
 * @private
 * Associates error types with a boolean value indicating whether it can be retried (true) or if it is fatal (false)
 */
export interface ErrorFilter {
    ArgumentError: boolean;
    ArgumentOutOfRangeError: boolean;
    DeviceMaximumQueueDepthExceededError: boolean;
    DeviceNotFoundError: boolean;
    FormatError: boolean;
    UnauthorizedError: boolean;
    NotImplementedError: boolean;
    NotConnectedError: boolean;
    IotHubQuotaExceededError: boolean;
    MessageTooLargeError: boolean;
    InternalServerError: boolean;
    ServiceUnavailableError: boolean;
    IotHubNotFoundError: boolean;
    IoTHubSuspendedError: boolean;
    JobNotFoundError: boolean;
    TooManyDevicesError: boolean;
    ThrottlingError: boolean;
    DeviceAlreadyExistsError: boolean;
    DeviceMessageLockLostError: boolean;
    InvalidEtagError: boolean;
    InvalidOperationError: boolean;
    PreconditionFailedError: boolean;
    TimeoutError: boolean;
    BadDeviceResponseError: boolean;
    GatewayTimeoutError: boolean;
    DeviceTimeoutError: boolean;
    TwinRequestError?: boolean;
}
/**
 * @private
 */
export declare class DefaultErrorFilter implements ErrorFilter {
    ArgumentError: boolean;
    ArgumentOutOfRangeError: boolean;
    DeviceMaximumQueueDepthExceededError: boolean;
    DeviceNotFoundError: boolean;
    FormatError: boolean;
    UnauthorizedError: boolean;
    NotImplementedError: boolean;
    NotConnectedError: boolean;
    IotHubQuotaExceededError: boolean;
    MessageTooLargeError: boolean;
    InternalServerError: boolean;
    ServiceUnavailableError: boolean;
    IotHubNotFoundError: boolean;
    IoTHubSuspendedError: boolean;
    JobNotFoundError: boolean;
    TooManyDevicesError: boolean;
    ThrottlingError: boolean;
    DeviceAlreadyExistsError: boolean;
    DeviceMessageLockLostError: boolean;
    InvalidEtagError: boolean;
    InvalidOperationError: boolean;
    PreconditionFailedError: boolean;
    TimeoutError: boolean;
    BadDeviceResponseError: boolean;
    GatewayTimeoutError: boolean;
    DeviceTimeoutError: boolean;
    TwinRequestError?: boolean;
}
