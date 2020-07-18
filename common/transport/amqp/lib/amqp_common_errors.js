// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
/*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_010: [ `translateError` shall accept 2 argument:
*- A custom error message to give context to the user.
*- the AMQP error object itself]
*/
/**
 * @private
 */
function translateError(message, amqpError) {
    var error;
    /*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_012: [`translateError` shall return a custom error type according to this table if the AMQP error condition is one of the following:
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
    | "com.microsoft:device-container-throttled" | ThrottlingError                      |
    | "com.microsoft:iot-hub-suspended"          | IoTHubSuspendedError                 |
    | "com.microsoft:iot-hub-not-found-error"    | IotHubNotFoundError                  |
    | "com.microsoft:message-lock-lost"          | DeviceMessageLockLostError           |
    | "com.microsoft:precondition-failed"        | PreconditionFailedError              |
    | "com.microsoft:quota-exceeded"             | IotHubQuotaExceededError             |
    | "com.microsoft:timeout"                    | ServiceUnavailableError              |
    ]*/
    if (amqpError.condition) {
        switch (amqpError.condition) {
            case 'amqp:internal-error':
                error = new azure_iot_common_1.errors.InternalServerError(message);
                break;
            case 'amqp:link:message-size-exceeded':
                error = new azure_iot_common_1.errors.MessageTooLargeError(message);
                break;
            case 'amqp:not-found':
                error = new azure_iot_common_1.errors.DeviceNotFoundError(message);
                break;
            case 'amqp:not-implemented':
                error = new azure_iot_common_1.errors.NotImplementedError(message);
                break;
            case 'amqp:not-allowed':
                error = new azure_iot_common_1.errors.InvalidOperationError(message);
                break;
            case 'amqp:resource-limit-exceeded':
                error = new azure_iot_common_1.errors.IotHubQuotaExceededError(message);
                break;
            case 'amqp:unauthorized-access':
                error = new azure_iot_common_1.errors.UnauthorizedError(message);
                break;
            case 'com.microsoft:argument-error':
                error = new azure_iot_common_1.errors.ArgumentError(message);
                break;
            case 'com.microsoft:argument-out-of-range':
                error = new azure_iot_common_1.errors.ArgumentOutOfRangeError(message);
                break;
            case 'com.microsoft:device-already-exists':
                error = new azure_iot_common_1.errors.DeviceAlreadyExistsError(message);
                break;
            case 'com.microsoft:device-container-throttled':
                error = new azure_iot_common_1.errors.ThrottlingError(message);
                break;
            case 'com.microsoft:iot-hub-suspended':
                error = new azure_iot_common_1.errors.IoTHubSuspendedError(message);
                break;
            case 'com.microsoft:iot-hub-not-found-error':
                error = new azure_iot_common_1.errors.IotHubNotFoundError(message);
                break;
            case 'com.microsoft:message-lock-lost':
                error = new azure_iot_common_1.errors.DeviceMessageLockLostError(message);
                break;
            case 'com.microsoft:precondition-failed':
                error = new azure_iot_common_1.errors.PreconditionFailedError(message);
                break;
            case 'com.microsoft:quota-exceeded':
                error = new azure_iot_common_1.errors.IotHubQuotaExceededError(message);
                break;
            case 'com.microsoft:timeout':
                error = new azure_iot_common_1.errors.ServiceUnavailableError(message);
                break;
            default:
                /*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_002: [If the AMQP error code is unknown, `translateError` should return a generic Javascript `Error` object.]*/
                error = new Error(message);
        }
    }
    else if (amqpError.code) {
        error = new azure_iot_common_1.errors.NotConnectedError(message);
    }
    else if (amqpError.message && amqpError.message.message) {
        // In the case of a invalid Twin object, this will return the generic error message plus the specific error messaged provided from the server.
        var errorString = message + '. ' + amqpError.message.message.toString();
        error = new Error(errorString);
    }
    else {
        /*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_002: [If the AMQP error code is unknown, `translateError` should return a generic Javascript `Error` object.]*/
        error = new Error(message);
    }
    /*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_001: [Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 2 properties:
    *- `amqpError` shall contain the error object returned by the AMQP layer.
    *- `message` shall contain a human-readable error message]
    */
    error.amqpError = amqpError;
    return error;
}
exports.translateError = translateError;
//# sourceMappingURL=amqp_common_errors.js.map