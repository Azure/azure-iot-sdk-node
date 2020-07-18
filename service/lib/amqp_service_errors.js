// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_amqp_base_1 = require("azure-iot-amqp-base");
/*Codes_SRS_NODE_DEVICE_AMQP_COMMON_ERRORS_16_010: [ `translateError` shall accept 2 argument:
*- A custom error message to give context to the user.
*- the AMQP error object itself]
*/
/**
 * @private
 */
function translateError(message, amqpError) {
    var error;
    /*Codes_SRS_NODE_DEVICE_AMQP_SERVICE_ERRORS_16_001: [ `translateError` shall return an `DeviceMaximumQueueDepthExceededError` if the AMQP error condition is `amqp:resource-limit-exceeded`.] */
    if (amqpError.condition === 'amqp:resource-limit-exceeded') {
        error = new azure_iot_common_1.errors.DeviceMaximumQueueDepthExceededError(message);
    }
    else {
        error = azure_iot_amqp_base_1.translateError(message, amqpError);
    }
    error.amqpError = amqpError;
    return error;
}
exports.translateError = translateError;
//# sourceMappingURL=amqp_service_errors.js.map