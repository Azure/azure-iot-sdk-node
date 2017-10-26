# azure-iot-common.httpTranslateError Requirements

## Overview
`httpTtranslateError` is a method that translates HTTP errors into Azure IoT Hub errors, effectively abstracting the error that is returned to the SDK user of from the transport layer.

## Requirements

**SRS_NODE_DEVICE_HTTP_ERRORS_16_001: [** Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 4 properties:
- `statusCode` shall contain the http status code
- `response` shall contain the protocol-specific response object itself
- `responseBody` shall contain the body of the response, containing the explanation of why the request failed
- `message` shall contain a human-readable error message **]**

**SRS_NODE_DEVICE_HTTP_ERRORS_16_002: [** If the HTTP error code is unknown, `translateError` should return a generic Javascript `Error` object. **]**

**SRS_NODE_DEVICE_HTTP_ERRORS_16_003: [** `translateError` shall return an `ArgumentError` if the HTTP response status code is `400`. **]**

**SRS_NODE_DEVICE_HTTP_ERRORS_16_004: [** `translateError` shall return an `UnauthorizedError` if the HTTP response status code is `401`. **]**

**SRS_NODE_DEVICE_HTTP_ERRORS_16_005: [** `translateError` shall return an `IotHubQuotaExceededError` if the HTTP response status code is `403`. **]**

**SRS_NODE_DEVICE_HTTP_ERRORS_16_006: [** `translateError` shall return an `DeviceNotFoundError` if the HTTP response status code is `404`. **]**

**SRS_NODE_DEVICE_HTTP_ERRORS_16_007: [** `translateError` shall return an `MessageTooLargeError` if the HTTP response status code is `413`. **]**

**SRS_NODE_DEVICE_HTTP_ERRORS_16_008: [** `translateError` shall return an `InternalServerError` if the HTTP response status code is `500`. **]**

**SRS_NODE_DEVICE_HTTP_ERRORS_16_009: [** `translateError` shall return an `ServiceUnavailableError` if the HTTP response status code is `503`. **]**

**SRS_NODE_DEVICE_HTTP_ERRORS_16_010: [** `translateError` shall accept 4 arguments:
- A custom error message to give context to the user.
- The status code
- the body of the response, containing the explanation of why the request failed
- the protocol-specific response object itself **]**
