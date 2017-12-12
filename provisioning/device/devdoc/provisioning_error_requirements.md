# azure-iot-provisioning-device.translateError Requirements

## Overview
`translateError` is a method that translates provisioning errors into Azure IoT Hub errors, effectively abstracting the error that is returned to the SDK user of from the transport layer.

## Requirements

** SRS_NODE_DPS_ERRORS_18_001: [** `translateError` shall accept 4 arguments:
 - A custom error message to give context to the user.
 - the status code that initiated the error
 - the response body
 - the transport object that is associated with this error **]**

** SRS_NODE_DPS_ERRORS_18_008: [** Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 3 properties:
 - `result` shall contain the body of the response
 - `transportObject` shall contain the transport object that is associated with this error
 - `message` shall contain a human-readable error message **]**

** SRS_NODE_DPS_ERRORS_18_002: [** `translateError` shall return an `ArgumentError` if the status code is `400`. **]**

** SRS_NODE_DPS_ERRORS_18_003: [** `translateError` shall return an `UnauthorizedError` if the status code is `401`. **]**

** SRS_NODE_DPS_ERRORS_18_004: [** `translateError` shall return an `DeviceNotFoundError` if the status code is `404`. **]**

** SRS_NODE_DPS_ERRORS_18_005: [** `translateError` shall return an `IotHubQuotaExceededError` if the status code is `429`. **]**

** SRS_NODE_DPS_ERRORS_18_006: [** `translateError` shall return an `InternalServerError` if the status code is `500`. **]**

** SRS_NODE_DPS_ERRORS_18_007: [** If the status code is unknown, `translateError` should return a generic Javascript `Error` object. **]**

