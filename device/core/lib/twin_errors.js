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
var TwinBaseError = /** @class */ (function (_super) {
    __extends(TwinBaseError, _super);
    function TwinBaseError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return TwinBaseError;
}(Error));
exports.TwinBaseError = TwinBaseError;
/**
 * @private
 */
function translateError(response, status) {
    var error;
    switch (status) {
        case 400:
            /*Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_003: [`translateError` shall return an `ArgumentError` if the response status code is `400`.]*/
            error = new azure_iot_common_1.errors.ArgumentError();
            break;
        case 401:
            /*Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_004: [`translateError` shall return an `UnauthorizedError` if the response status code is `401`.]*/
            error = new azure_iot_common_1.errors.UnauthorizedError();
            break;
        case 403:
            /*Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_005: [`translateError` shall return an `IotHubQuotaExceededError` if the response status code is `403`.]*/
            error = new azure_iot_common_1.errors.IotHubQuotaExceededError();
            break;
        case 404:
            /*Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_006: [`translateError` shall return an `DeviceNotFoundError` if the response status code is `404`.]*/
            error = new azure_iot_common_1.errors.DeviceNotFoundError();
            break;
        case 413:
            /*Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_007: [`translateError` shall return an `MessageTooLargeError` if the response status code is `413`.]*/
            error = new azure_iot_common_1.errors.MessageTooLargeError();
            break;
        case 500:
            /*Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_008: [`translateError` shall return an `InternalServerError` if the response status code is `500`.]*/
            error = new azure_iot_common_1.errors.InternalServerError();
            break;
        case 503:
            /*Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_009: [`translateError` shall return an `ServiceUnavailableError` if the response status code is `503`.]*/
            error = new azure_iot_common_1.errors.ServiceUnavailableError();
            break;
        case 504:
            /*Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_011: [`translateError` shall return an `ServiceUnavailableError` if the response status code is `504`.]*/
            error = new azure_iot_common_1.errors.ServiceUnavailableError();
            break;
        case 429:
            /* Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_012: [`translateError` shall return an `ThrottlingError` if the response status code is `429`.] */
            error = new azure_iot_common_1.errors.ThrottlingError();
            break;
        case 412:
            /* Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_013: [`translateError` shall return an `InvalidEtagError` if the response status code is `412`.] */
            error = new azure_iot_common_1.errors.InvalidEtagError();
            break;
        default:
            /*Codes_SRS_NODE_DEVICE_TWIN_ERRORS_18_002: [If the error code is unknown, `translateError` should return a generic Javascript `Error` object.]*/
            error = new Error('server returned error ' + status);
    }
    error.response = response;
    return error;
}
exports.translateError = translateError;
//# sourceMappingURL=twin_errors.js.map