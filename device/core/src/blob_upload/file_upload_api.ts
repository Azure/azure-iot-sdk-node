// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { endpoint, AuthenticationProvider, encodeUriComponentStrict, callbackToPromise, Callback, errorCallbackToPromise, ErrorCallback } from 'azure-iot-common';
import { Http as DefaultHttpTransport } from 'azure-iot-http-base';
import { UploadParams, FileUpload as FileUploadInterface } from './blob_upload_client';
import { BlobUploadResult } from './blob_upload_result';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../../package.json');

/**
 * @private
 * @class         module:azure-iot-device.FileUploadApi
 * @classdesc     Provides methods to use Azure IoT Hub APIs that enable simple upload to a blob.
 *
 * @params        {String}  deviceId   Device identifier.
 * @params        {String}  hostname   Hostname of the Azure IoT Hub instance.
 * @params        {Object}  transport  Transport layer that shall be used (HTTP or mock).
 *
 * @throws        {ReferenceError}     Thrown if one of the parameters is falsy.
 */
/*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_002: [`FileUploadApi` shall throw a `ReferenceError` if `deviceId` is falsy.]*/
/*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_003: [`FileUploadApi` shall throw a `ReferenceError` if `hostname` is falsy.]*/
export class FileUploadApi implements FileUploadInterface {
    _authenticationProvider: AuthenticationProvider;
    http: any; // TODO: need interface >_<

    constructor(authenticationProvider: AuthenticationProvider, httpTransport?: any) {
        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_019: [`FileUploadApi` shall throw a `ReferenceError` if `authenticationProvider` is falsy.]*/
        if (!authenticationProvider) throw new ReferenceError('authenticationProvider cannot be \'' + authenticationProvider + '\'');

        this._authenticationProvider = authenticationProvider;
        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_018: [`FileUploadApi` shall instantiate the default `azure-iot-http-base.Http` transport if `transport` is not specified, otherwise it shall use the specified transport.]*/
        this.http = httpTransport ? httpTransport : new DefaultHttpTransport();
    }

    getBlobSharedAccessSignature(blobName: string, done: Callback<UploadParams>): void;
    getBlobSharedAccessSignature(blobName: string): Promise<UploadParams>;
    getBlobSharedAccessSignature(blobName: string, done?: Callback<UploadParams>): Promise<UploadParams> | void {
        return callbackToPromise((_callback) => {
            /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_004: [`getBlobSharedAccessSignature` shall throw a `ReferenceError` if `blobName` is falsy.]*/
            if (!blobName) throw new ReferenceError('blobName cannot be \'' + blobName + '\'');

            this._authenticationProvider.getDeviceCredentials((err, deviceCredentials) => {
                /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_006: [`getBlobSharedAccessSignature` shall create a `POST` HTTP request to a path formatted as the following:`/devices/URI_ENCODED(<deviceId>)/files?api-version=<api-version>]*/
                const path = endpoint.devicePath(encodeUriComponentStrict(deviceCredentials.deviceId)) + '/files' + endpoint.versionQueryString();
                const body = JSON.stringify({ blobName: blobName });

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
                let headers: any = {
                    Host: deviceCredentials.host,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': body.length,
                    'User-Agent': packageJson.name + '/' + packageJson.version
                };

                let x509Opts = null;
                if (typeof deviceCredentials.sharedAccessSignature === 'string') {
                    headers.Authorization = deviceCredentials.sharedAccessSignature;
                } else {
                    x509Opts = deviceCredentials.x509;
                }

                const req = this.http.buildRequest('POST', path, headers, deviceCredentials.host, x509Opts, (err, body, response) => {
                    if (err) {
                        err.responseBody = body;
                        err.response = response;
                        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_008: [`getBlobSasUri` shall call the `_callback` callback with an `Error` object if the request fails.]*/
                        _callback(err);
                    } else {
                        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_009: [`getBlobSasUri` shall call the `_callback` callback with a `null` error object and a result object containing a correlation ID and a SAS parameters if the request succeeds]*/
                        const result = JSON.parse(body);
                        _callback(null, result);
                    }
                });
                req.write(body);
                req.end();
            });
        }, done);
    }

    notifyUploadComplete(correlationId: string, uploadResult: BlobUploadResult, done: ErrorCallback): void;
    notifyUploadComplete(correlationId: string, uploadResult: BlobUploadResult): Promise<void>;
    notifyUploadComplete(correlationId: string, uploadResult: BlobUploadResult, done?: ErrorCallback): Promise<void> | void {
        return errorCallbackToPromise((_callback) => {
            /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_010: [`notifyUploadComplete` shall throw a `ReferenceError` if `correlationId` is falsy.]*/
            /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_012: [`notifyUploadComplete` shall throw a `ReferenceError` if `uploadResult` is falsy.]*/
            if (!correlationId) throw new ReferenceError('correlationId cannot be \'' + correlationId + '\'');
            if (!uploadResult) throw new ReferenceError('uploadResult cannot be \'' + uploadResult + '\'');

            this._authenticationProvider.getDeviceCredentials((err, deviceCredentials) => {
                /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_013: [`notifyUploadComplete` shall create a `POST` HTTP request to a path formatted as the following:`/devices/URI_ENCODED(<deviceId>)/files/<correlationId>?api-version=<api-version>`]*/
                const path = endpoint.devicePath(encodeUriComponentStrict(deviceCredentials.deviceId)) + '/files/notifications/' + encodeURIComponent(correlationId) + endpoint.versionQueryString();
                const body = JSON.stringify(uploadResult);

                /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_014: [The `POST` HTTP request shall have the following headers:
                ```
                Host: <hostname>,
                Authorization: <sharedAccessSignature>,
                'User-Agent': <version>,
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': <content length>,
                'iothub-name': <hub name>
                ```]*/
                let headers: any = {
                    Host: deviceCredentials.host,
                    'User-Agent': packageJson.name + '/' + packageJson.version,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Length': body.length,
                    'iothub-name': deviceCredentials.host.split('.')[0]
                };

                let x509Opts = null;
                if (typeof deviceCredentials.sharedAccessSignature === 'string') {
                    headers.Authorization = deviceCredentials.sharedAccessSignature;
                } else {
                    x509Opts = deviceCredentials.x509;
                }

                const req = this.http.buildRequest('POST', path, headers, deviceCredentials.host, x509Opts, (err) => {
                    if (err) {
                        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_016: [** `notifyUploadComplete` shall call the `done` callback with an `Error` object if the request fails.]*/
                        _callback(err);
                    } else {
                        /*Codes_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_017: [** `notifyUploadComplete` shall call the `done` callback with no parameters if the request succeeds.]*/
                        _callback();
                    }
                });
                req.write(body);
                req.end();
            });
        }, done);
    }
}
