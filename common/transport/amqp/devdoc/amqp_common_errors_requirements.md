# azure-iot-amqp-base.translateError Requirements

## Overview
`translateError` is a method that translates AMQP errors into Azure IoT Hub errors, effectively abstracting the error that is returned to the SDK user of from the transport layer.

## Requirements

**SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_001: [** Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 2 properties:
- `amqpError` shall contain the error object returned by the AMQP layer.
- `message` shall contain a human-readable error message **]**

**SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_002: [** If the AMQP error code is unknown, `translateError` should return a generic Javascript `Error` object. **]**

**SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_012: [** `translateError` shall return a custom error type according to this table if the AMQP error condition is one of the following:
| AMQP Error Condition                       | Custom Error Type                    |
| ------------------------------------------ | ------------------------------------ |
| "amqp:internal-error"                      | InternalServerError                  |
| "amqp:link:message-size-exceeded"          | MessageTooLargeError                 |
| "amqp:not-found"                           | DeviceNotFoundError                  |
| "amqp:not-implemented"                     | NotImplementedError                  |
| "amqp:not-allowed"                         | InvalidOperationError                |
| "amqp:resource-limit-exceeded"             | IotHubQuotaExceededError             |
| "amqp:unauthorized-access"                 | UnauthorizedError                    |
| "com.microsoft:argument-error"             | ArgumentError                        |
| "com.microsoft:argument-out-of-range"      | ArgumentOutOfRangeError              |
| "com.microsoft:device-already-exists"      | DeviceAlreadyExistsError             |
| "com.microsoft:device-container-throttled" | IoTHubThrottledError                 |
| "com.microsoft:iot-hub-suspended"          | IoTHubSuspendedError                 |
| "com.microsoft:message-lock-lost"          | DeviceMessageLockLostError           |
| "com.microsoft:precondition-failed"        | PreconditionFailedError              |
| "com.microsoft:quota-exceeded"             | IotHubQuotaExceededError             |
| "com.microsoft:timeout"                    | ServiceUnavailableError              |
**]**

**SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_010: [** `translateError` shall accept 2 argument:
- A custom error message to give context to the user.
- the AMQP error object itself **]**