// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_common_2 = require("azure-iot-common");
var abort_controller_1 = require("@azure/abort-controller");
/**
 * @private
 */
var BlobUploader = /** @class */ (function () {
    function BlobUploader(storageApi) {
        if (storageApi) {
            /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_008: [`BlobUploader` should use the `storageApi` object to upload data if `storageApi` is truthy.]*/
            this.storageApi = storageApi;
        }
        else {
            /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_06_001: [`BlobUploader` should denote delay loading with null for the storageApi property if `storageApi` is falsy]*/
            this.storageApi = null;
        }
    }
    BlobUploader.prototype.uploadToBlob = function (blobInfo, stream, streamLength, done) {
        var _this = this;
        azure_iot_common_2.tripleValueCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_001: [`uploadToBlob` shall throw a `ReferenceError` if `blobInfo` is falsy.]*/
            if (!blobInfo)
                throw new ReferenceError('blobInfo cannot be \'' + blobInfo + '\'');
            /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_002: [`uploadToBlob` shall throw a `ReferenceError` if `stream` is falsy.]*/
            if (!stream)
                throw new ReferenceError('stream cannot be \'' + stream + '\'');
            /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_003: [`uploadToBlob` shall throw a `ReferenceError` if `streamSize` is falsy.]*/
            if (!streamLength)
                throw new ReferenceError('streamLength cannot be \'' + streamLength + '\'');
            /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_004: [`uploadToBlob` shall throw an `ArgumentError` if `blobInfo` is missing one or more of the following properties: `hostName`, `containerName`, `blobName`, `sasToken`).]*/
            if (!blobInfo.hostName || !blobInfo.containerName || !blobInfo.blobName || !blobInfo.sasToken) {
                throw new azure_iot_common_1.errors.ArgumentError('Invalid upload parameters');
            }
            // This if statement is only for testing purposes. There is no customer API for selecting a storage API.
            if (!_this.storageApi) {
                /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_06_002: [`BlobUploader` should delay load azure-storage into the storageAPI property if `storageApi` is falsy]*/
                _this.storageApi = require('@azure/storage-blob');
            }
            var pipeline = _this.storageApi.newPipeline(new _this.storageApi.AnonymousCredential(), {
                // httpClient: myHTTPClient,
                // logger: MyLogger
                retryOptions: { maxTries: 4 },
                telemetry: { value: 'Upload To Blob via Node.js IoT Client' },
                keepAliveOptions: {
                    enable: false
                }
            });
            var newBlockBlobClient = new _this.storageApi.BlockBlobClient("https://" + blobInfo.hostName + "/" + blobInfo.containerName + "/" + blobInfo.blobName + blobInfo.sasToken, pipeline);
            var uploadPromise = newBlockBlobClient.uploadStream(stream, 4 * 1024 * 1024, 20, { abortSignal: abort_controller_1.AbortController.timeout(30 * 60 * 1000) });
            uploadPromise
                .then(function (uploadBlobResponse) {
                /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_005: [`uploadToBlob` shall call the `_callback` calback with the result of the storage api call.]*/
                _callback(null, uploadBlobResponse);
            })
                .catch(function (err) {
                _callback(err, null);
            });
        }, (function (body, result) { return { body: body, result: result }; }), done);
    };
    return BlobUploader;
}());
exports.BlobUploader = BlobUploader;
//# sourceMappingURL=blob_uploader.js.map