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
/**
 * @private
 * @class         module:azure-iot-device.BlobSasError
 * @classdesc     Error used when the client fails to get a blob shared access signature from the IoT Hub service.
 *
 * @params        {string}  message  Error message
 * @augments      {Error}
 */
var BlobSasError = /** @class */ (function (_super) {
    __extends(BlobSasError, _super);
    function BlobSasError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'BlobSasError';
        _this.message = message;
        Error.captureStackTrace(_this, _this.constructor);
        return _this;
    }
    return BlobSasError;
}(Error));
exports.BlobSasError = BlobSasError;
/**
 * @private
 * @class         module:azure-iot-device.BlobUploadNotificationError
 * @classdesc     Error used when the client fails to notify the IoT Hub service that the upload is complete.
 *
 * @params        {string}  message  Error message
 * @augments      {Error}
 */
var BlobUploadNotificationError = /** @class */ (function (_super) {
    __extends(BlobUploadNotificationError, _super);
    function BlobUploadNotificationError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        _this.name = 'BlobUploadNotificationError';
        Error.captureStackTrace(_this, _this.constructor);
        return _this;
    }
    return BlobUploadNotificationError;
}(Error));
exports.BlobUploadNotificationError = BlobUploadNotificationError;
//# sourceMappingURL=blob_upload_errors.js.map