// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var blob_upload_result_1 = require("./blob_upload_result");
var blob_uploader_1 = require("./blob_uploader");
var file_upload_api_1 = require("./file_upload_api");
var errors = require("./blob_upload_errors");
/**
 * @private
 */
var BlobUploadClient = /** @class */ (function () {
    function BlobUploadClient(authenticationProvider, fileUploadApi, blobUploader) {
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_001: [`BlobUploadClient` shall throw a `ReferenceError` if `config` is falsy.]*/
        if (!authenticationProvider)
            throw new ReferenceError('authenticationProvider cannot be \'' + authenticationProvider + '\'');
        this._authenticationProvider = authenticationProvider;
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_002: [If specified, `BlobUploadClient` shall use the `fileUploadApi` passed as a parameter instead of the default one.]*/
        this._fileUploadApi = fileUploadApi ? fileUploadApi : new file_upload_api_1.FileUploadApi(this._authenticationProvider);
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_003: [If specified, `BlobUploadClient` shall use the `blobUploader` passed as a parameter instead of the default one.]*/
        this._blobUploader = blobUploader ? blobUploader : new blob_uploader_1.BlobUploader();
    }
    BlobUploadClient.prototype.setOptions = function (options) {
        if (this._fileUploadApi) {
            /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_99_011: [`setOptions` shall set `fileUploadApi` options.]*/
            this._fileUploadApi.setOptions(options);
        }
    };
    BlobUploadClient.prototype.uploadToBlob = function (blobName, stream, streamLength, done) {
        var _this = this;
        return azure_iot_common_1.errorCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_004: [`uploadToBlob` shall obtain a blob SAS token using the IoT Hub service file upload API endpoint.]*/
            _this._fileUploadApi.getBlobSharedAccessSignature(blobName, function (err, uploadParams) {
                if (err) {
                    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_005: [`uploadToBlob` shall call the `_callback` callback with a `BlobSasError` parameter if retrieving the SAS token fails.]*/
                    var error = new errors.BlobSasError('Could not obtain blob shared access signature.');
                    error.innerError = err;
                    _callback(error);
                }
                else {
                    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_006: [`uploadToBlob` shall upload the stream to the specified blob using its BlobUploader instance.]*/
                    _this._blobUploader.uploadToBlob(uploadParams, stream, streamLength, function (err, response) {
                        var uploadResult = blob_upload_result_1.BlobUploadResult.fromAzureStorageCallbackArgs(err, response);
                        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_001: [`uploadToBlob` shall notify the result of a blob upload to the IoT Hub service using the file upload API endpoint.]*/
                        _this._fileUploadApi.notifyUploadComplete(uploadParams.correlationId, uploadResult, function (err) {
                            if (err) {
                                if (!uploadResult.isSuccess) {
                                    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_002: [`uploadToBlob` shall call the `_callback` callback with a `BlobUploadNotificationError` if the blob upload failed.]*/
                                    var error = new errors.BlobUploadNotificationError('UploadToBlob failed, and could not notify the IoT Hub about the file upload status.');
                                    error.innerError = err;
                                    _callback(error);
                                }
                                else {
                                    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_003: [`uploadToBlob` shall call the `_callback` callback with a `BlobUploadNotificationError` if notifying the IoT Hub instance of the transfer outcome fails.]*/
                                    var error = new errors.BlobUploadNotificationError('Could not notify the IoT Hub of the file upload completion.');
                                    error.innerError = err;
                                    _callback(error);
                                }
                            }
                            else {
                                if (!uploadResult.isSuccess) {
                                    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_002: [`uploadToBlob` shall call the `_callback` callback with a `BlobUploadNotificationError` if the blob upload failed.]*/
                                    var error = new errors.BlobUploadNotificationError('UploadToBlob failed.');
                                    error.innerError = err;
                                    _callback(error);
                                }
                                else {
                                    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_004: [`uploadToBlob` shall call the `_callback` callback with no arguments if the blob upload succeeded, and IoT Hub was successfully notified of the blob upload outcome.]*/
                                    _callback();
                                }
                            }
                        });
                    });
                }
            });
        }, done);
    };
    return BlobUploadClient;
}());
exports.BlobUploadClient = BlobUploadClient;
//# sourceMappingURL=blob_upload_client.js.map