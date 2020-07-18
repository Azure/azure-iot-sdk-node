// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @private
 * @class         module:azure-iot-device.BlobUploadResult
 * @classdesc     Result object used by the {@link module:azure-iot-device.blobUpload.BlobUploader} class to describe a successful upload to a blob.
 *
 * @params        isSuccess          {Boolean} Indicates whether the upload was successful or failed
 * @params        statusCode         {Number}  Status code returned by the blob storage upload operation
 * @params        statusDescription  {String}  String containing useful information pertaining to the result of the blob upload.
 *
 * @augments      {Error}
 */
var BlobUploadResult = /** @class */ (function () {
    function BlobUploadResult(isSuccess, statusCode, statusDescription) {
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_001: [The `isSuccess` parameter shall be assigned to the the `isSuccess` property of the newly created `BlobUploadResult` instance.]*/
        this.isSuccess = isSuccess;
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_002: [The `statusCode` parameter shall be assigned to the the `statusCode` property of the newly created `BlobUploadResult` instance.]*/
        this.statusCode = statusCode;
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_003: [The `statusDescription` parameter shall be assigned to the the `statusDescription` property of the newly created `BlobUploadResult` instance.]*/
        this.statusDescription = statusDescription;
    }
    /**
     * @method           module:azure-iot-device.BlobUploadResult#fromAzureStorageCallbackArgs
     * @description      The `fromAzureStorageCallbackArgs` static method creates a new BlobUploadResult instance from the arguments passed to the callback of the azure storage upload method.
     *
     * @param {Object}   err         The error object that is passed to the callback.
     * @param {Object}   body        The body of the HTTP response.
     * @param {Object}   response    The HTTP response object.
     *
     * @throws {ReferenceException} If err is null and uploadResponse is falsy.
     *
     * @returns {BlobUploadResult} Formatted response for sending directly to IoT Hub as a notification.
     */
    BlobUploadResult.fromAzureStorageCallbackArgs = function (err, uploadResponse) {
        // According to the Azure Storage JK SDK, the Azure Storage REST API returns 500/404 status Code in HTTP responses when an error occurs.
        // @azure/ms-rest-js deserialization will throw `RestError` directly, and the Storage SDK propogates this error to the top.
        // But this seems to be incorrect temporarily (Github Issue filed on part of Azure Storage SDK for JS Team).
        // Currently, the thrown `RestError` should be further deserialized according to the response headers and bodies.
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_001: [If `err` is `null` and `uploadResponse` is falsy a `ReferenceError` shall be thrown]*/
        if (!err && !uploadResponse) {
            throw new ReferenceError('err and uploadResponse cannot both be null');
        }
        var uploadResult;
        if (err) {
            var statusCode = err.hasOwnProperty('statusCode') ? err.statusCode : -1;
            var statusDescription = err.hasOwnProperty('response') ? err.response : err.message;
            /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_002: [If `err` is not `null`, the `BlobUploadResult` shall have the `isSucess` property set to `false`]*/
            uploadResult = new BlobUploadResult(false, statusCode, statusDescription);
        }
        else {
            if (uploadResponse.errorCode && uploadResponse.errorCode) {
                /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_003: [If `err` is null but `uploadResponse` is provided, and `uploadResponse.ErrorCode` is not null, `BlobUploadResult` shall have the `isSuccess` property set to `false`]*/
                var statusCode = uploadResponse._response ? uploadResponse._response.status : -1;
                var statusDescription = uploadResponse._response ? uploadResponse._response.bodyAsText : 'no status description';
                uploadResult = new BlobUploadResult(false, statusCode, statusDescription);
            }
            else {
                /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_004: [If `err` is null and `uploadResponse` is provided, the `BlobUploadResult` shall have the `statusCode` and `statusDescription` property set to the HTTP status code of the blob upload response]*/
                var statusCode = uploadResponse._response.status;
                var statusDescription = uploadResponse._response.bodyAsText;
                if (uploadResponse._response.status >= 200 && uploadResponse._response.status < 300) {
                    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_005: [If `uploadResponse._response.status` is a number within the HTTP Status Codes 'success' range, the `isSuccess` property will be set to `true`]*/
                    uploadResult = new BlobUploadResult(true, statusCode, statusDescription);
                }
                else {
                    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_006: [If `uploadResponse._response.status` is a number not in the HTTP Status Codes 'success' range, the `isSuccess` property will be set to `false`]*/
                    uploadResult = new BlobUploadResult(false, statusCode, statusDescription);
                }
            }
        }
        return uploadResult;
    };
    return BlobUploadResult;
}());
exports.BlobUploadResult = BlobUploadResult;
//# sourceMappingURL=blob_upload_result.js.map