// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:variable-name */
/**
 * @private
 */
var DefaultErrorFilter = /** @class */ (function () {
    function DefaultErrorFilter() {
        this.ArgumentError = false;
        this.ArgumentOutOfRangeError = false;
        this.DeviceMaximumQueueDepthExceededError = false; // ??
        this.DeviceNotFoundError = false;
        this.FormatError = false;
        this.UnauthorizedError = false;
        this.NotImplementedError = false;
        this.NotConnectedError = true;
        this.IotHubQuotaExceededError = false;
        this.MessageTooLargeError = false;
        this.InternalServerError = true;
        this.ServiceUnavailableError = true;
        this.IotHubNotFoundError = false;
        this.IoTHubSuspendedError = false; // ??
        this.JobNotFoundError = false;
        this.TooManyDevicesError = false;
        this.ThrottlingError = true;
        this.DeviceAlreadyExistsError = false;
        this.DeviceMessageLockLostError = false;
        this.InvalidEtagError = false;
        this.InvalidOperationError = false;
        this.PreconditionFailedError = false; // ??
        this.TimeoutError = true;
        this.BadDeviceResponseError = false;
        this.GatewayTimeoutError = false; // ??
        this.DeviceTimeoutError = false; // ??
        this.TwinRequestError = false;
    }
    return DefaultErrorFilter;
}());
exports.DefaultErrorFilter = DefaultErrorFilter;
//# sourceMappingURL=retry_error_filter.js.map