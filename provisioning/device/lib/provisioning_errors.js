// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
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
var azure_iot_common_1 = require("azure-iot-common");
/**
 * @private
 */
var ProvisioningError = /** @class */ (function (_super) {
    __extends(ProvisioningError, _super);
    function ProvisioningError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ProvisioningError;
}(Error));
exports.ProvisioningError = ProvisioningError;
/* Codes_SRS_NODE_DPS_ERRORS_18_001: [`translateError` shall accept 4 arguments:
 * - A custom error message to give context to the user.
 * - the status code that initiated the error
 * - the response body
 * - the transport object that is associated with this error]
 */
/**
 * @private
 */
function translateError(message, status, result, response) {
    var error;
    switch (status) {
        case 400:
            /*Codes_SRS_NODE_DPS_ERRORS_18_002: [`translateError` shall return an `ArgumentError` if the status code is `400`.]*/
            error = new azure_iot_common_1.errors.ArgumentError(message);
            break;
        case 401:
            /*Codes_SRS_NODE_DPS_ERRORS_18_003: [`translateError` shall return an `UnauthorizedError` if the status code is `401`.]*/
            error = new azure_iot_common_1.errors.UnauthorizedError(message);
            break;
        case 404:
            /*Codes_SRS_NODE_DPS_ERRORS_18_004: [`translateError` shall return an `DeviceNotFoundError` if the status code is `404`.]*/
            error = new azure_iot_common_1.errors.DeviceNotFoundError(message);
            break;
        case 429:
            /*Codes_SRS_NODE_DPS_ERRORS_18_005: [`translateError` shall return an `IotHubQuotaExceededError` if the status code is `429`.]*/
            error = new azure_iot_common_1.errors.IotHubQuotaExceededError(message);
            break;
        case 500:
            /*Codes_SRS_NODE_DPS_ERRORS_18_006: [`translateError` shall return an `InternalServerError` if the status code is `500`.]*/
            error = new azure_iot_common_1.errors.InternalServerError(message);
            break;
        default:
            /*Codes_SRS_NODE_DPS_ERRORS_18_007: [If the status code is unknown, `translateError` should return a generic Javascript `Error` object.]*/
            error = new Error(message);
            break;
    }
    /* Codes_SRS_NODE_DPS_ERRORS_18_008: [Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 3 properties:
    * - `result` shall contain the body of the response
    * - `transportObject` shall contain the transport object that is associated with this error
    * - `message` shall contain a human-readable error message]
    */
    error.transportObject = response;
    error.result = result;
    return error;
}
exports.translateError = translateError;
//# sourceMappingURL=provisioning_errors.js.map