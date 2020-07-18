// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_http_base_1 = require("azure-iot-http-base");
// tslint:disable-next-line:no-var-requires
var packageJson = require('../../package.json');
/**
 * @private
 */
var FileUploadApi = /** @class */ (function () {
    function FileUploadApi(authenticationProvider, httpTransport) {
        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_019: [`FileUploadApi` shall throw a `ReferenceError` if `authenticationProvider` is falsy.]*/
        if (!authenticationProvider)
            throw new ReferenceError('authenticationProvider cannot be \'' + authenticationProvider + '\'');
        this._authenticationProvider = authenticationProvider;
        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_018: [`FileUploadApi` shall instantiate the default `azure-iot-http-base.Http` transport if `transport` is not specified, otherwise it shall use the specified transport.]*/
        this.http = httpTransport ? httpTransport : new azure_iot_http_base_1.Http();
    }
    FileUploadApi.prototype.setOptions = function (options) {
        if (this.http) {
            /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_99_020: [`setOptions` shall set provided transport options.`]*/
            this.http.setOptions(options);
        }
    };
    FileUploadApi.prototype.getBlobSharedAccessSignature = function (blobName, done) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_004: [`getBlobSharedAccessSignature` shall throw a `ReferenceError` if `blobName` is falsy.]*/
            if (!blobName)
                throw new ReferenceError('blobName cannot be \'' + blobName + '\'');
            _this._authenticationProvider.getDeviceCredentials(function (err, deviceCredentials) {
                /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_006: [`getBlobSharedAccessSignature` shall create a `POST` HTTP request to a path formatted as the following:`/devices/URI_ENCODED(<deviceId>)/files?api-version=<api-version>]*/
                var path = azure_iot_common_1.endpoint.devicePath(azure_iot_common_1.encodeUriComponentStrict(deviceCredentials.deviceId)) + '/files' + azure_iot_common_1.endpoint.versionQueryString();
                var body = JSON.stringify({ blobName: blobName });
                /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_007: [The `POST` HTTP request shall have the following headers:
                ```
                Host: <hostname>
                Authorization: <sharedAccessSignature>,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Content-Length': body.length,
                'User-Agent': <sdk name and version>
                The `POST` HTTP request shall have the following body:
                {
                blobName: '<name of the blob for which a SAS URI will be generated>'
                }
                ```]*/
                var headers = {
                    Host: deviceCredentials.host,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': body.length,
                    'User-Agent': packageJson.name + '/' + packageJson.version
                };
                var x509Opts = null;
                if (typeof deviceCredentials.sharedAccessSignature === 'string') {
                    headers.Authorization = deviceCredentials.sharedAccessSignature;
                }
                else {
                    x509Opts = deviceCredentials.x509;
                }
                var req = _this.http.buildRequest('POST', path, headers, deviceCredentials.host, x509Opts, function (err, body, response) {
                    if (err) {
                        err.responseBody = body;
                        err.response = response;
                        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_008: [`getBlobSasUri` shall call the `_callback` callback with an `Error` object if the request fails.]*/
                        _callback(err);
                    }
                    else {
                        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_009: [`getBlobSasUri` shall call the `_callback` callback with a `null` error object and a result object containing a correlation ID and a SAS parameters if the request succeeds]*/
                        var result = JSON.parse(body);
                        _callback(null, result);
                    }
                });
                req.write(body);
                req.end();
            });
        }, done);
    };
    FileUploadApi.prototype.notifyUploadComplete = function (correlationId, uploadResult, done) {
        var _this = this;
        return azure_iot_common_1.errorCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_010: [`notifyUploadComplete` shall throw a `ReferenceError` if `correlationId` is falsy.]*/
            /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_012: [`notifyUploadComplete` shall throw a `ReferenceError` if `uploadResult` is falsy.]*/
            if (!correlationId)
                throw new ReferenceError('correlationId cannot be \'' + correlationId + '\'');
            if (!uploadResult)
                throw new ReferenceError('uploadResult cannot be \'' + uploadResult + '\'');
            _this._authenticationProvider.getDeviceCredentials(function (err, deviceCredentials) {
                /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_013: [`notifyUploadComplete` shall create a `POST` HTTP request to a path formatted as the following:`/devices/URI_ENCODED(<deviceId>)/files/<correlationId>?api-version=<api-version>`]*/
                var path = azure_iot_common_1.endpoint.devicePath(azure_iot_common_1.encodeUriComponentStrict(deviceCredentials.deviceId)) + '/files/notifications/' + encodeURIComponent(correlationId) + azure_iot_common_1.endpoint.versionQueryString();
                var body = JSON.stringify(uploadResult);
                /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_014: [The `POST` HTTP request shall have the following headers:
                ```
                Host: <hostname>,
                Authorization: <sharedAccessSignature>,
                'User-Agent': <version>,
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': <content length>,
                'iothub-name': <hub name>
                ```]*/
                var headers = {
                    Host: deviceCredentials.host,
                    'User-Agent': packageJson.name + '/' + packageJson.version,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Length': body.length,
                    'iothub-name': deviceCredentials.host.split('.')[0]
                };
                var x509Opts = null;
                if (typeof deviceCredentials.sharedAccessSignature === 'string') {
                    headers.Authorization = deviceCredentials.sharedAccessSignature;
                }
                else {
                    x509Opts = deviceCredentials.x509;
                }
                var req = _this.http.buildRequest('POST', path, headers, deviceCredentials.host, x509Opts, function (err) {
                    if (err) {
                        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_016: [** `notifyUploadComplete` shall call the `done` callback with an `Error` object if the request fails.]*/
                        _callback(err);
                    }
                    else {
                        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_017: [** `notifyUploadComplete` shall call the `done` callback with no parameters if the request succeeds.]*/
                        _callback();
                    }
                });
                req.write(body);
                req.end();
            });
        }, done);
    };
    return FileUploadApi;
}());
exports.FileUploadApi = FileUploadApi;
//# sourceMappingURL=file_upload_api.js.map