// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Stream } from 'stream';
import { AuthenticationProvider, errorCallbackToPromise, ErrorCallback, TripleValueCallback, Callback } from 'azure-iot-common';

import { BlobUploadResult } from './blob_upload_result';
import { BlobUploader as DefaultBlobUploader, BlobResponse } from './blob_uploader';
import { FileUploadApi as DefaultFileUploadApi } from './file_upload_api';

import * as errors from './blob_upload_errors';

/**
 * @private
 */
export interface UploadParams {
    hostName?: string;
    containerName?: string;
    blobName?: string;
    sasToken?: string;
    correlationId: string;
}

/**
 * @private
 */
export interface FileUpload {
  getBlobSharedAccessSignature(blobName: string, done: Callback<UploadParams>): void;
  getBlobSharedAccessSignature(blobName: string): Promise<UploadParams>;
  notifyUploadComplete(correlationId: string, uploadResult: BlobUploadResult, done: (err?: Error) => void): void;
  notifyUploadComplete(correlationId: string, uploadResult: BlobUploadResult): Promise<void>;
}

/**
 * @private
 */
export interface BlobUploader {
  uploadToBlob(uploadParams: UploadParams, stream: Stream, streamLength: number, done: TripleValueCallback<any, BlobResponse>): void;
  uploadToBlob(uploadParams: UploadParams, stream: Stream, streamLength: number): Promise<any>;
}

/**
 * @private
 */
export interface BlobUpload {
  uploadToBlob(blobName: string, stream: Stream, streamLength: number, done: (err?: Error) => void): void;
  uploadToBlob(blobName: string, stream: Stream, streamLength: number): Promise<void>;
}

/**
 * @private
 */
export class BlobUploadClient implements BlobUpload {
  private _authenticationProvider: AuthenticationProvider;
  private _fileUploadApi: FileUpload;
  private _blobUploader: BlobUploader;

  constructor(authenticationProvider: AuthenticationProvider, fileUploadApi?: FileUpload, blobUploader?: BlobUploader) {
    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_001: [`BlobUploadClient` shall throw a `ReferenceError` if `config` is falsy.]*/
    if (!authenticationProvider) throw new ReferenceError('authenticationProvider cannot be \'' + authenticationProvider + '\'');
    this._authenticationProvider = authenticationProvider;

    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_002: [If specified, `BlobUploadClient` shall use the `fileUploadApi` passed as a parameter instead of the default one.]*/
    this._fileUploadApi = fileUploadApi ? fileUploadApi : new DefaultFileUploadApi(this._authenticationProvider);

    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_003: [If specified, `BlobUploadClient` shall use the `blobUploader` passed as a parameter instead of the default one.]*/
    this._blobUploader = blobUploader ? blobUploader : new DefaultBlobUploader();
  }

  uploadToBlob(blobName: string, stream: Stream, streamLength: number, done: ErrorCallback): void;
  uploadToBlob(blobName: string, stream: Stream, streamLength: number): Promise<void>;
  uploadToBlob(blobName: string, stream: Stream, streamLength: number, done?: ErrorCallback): Promise<void> | void {
    return errorCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_004: [`uploadToBlob` shall obtain a blob SAS token using the IoT Hub service file upload API endpoint.]*/
      this._fileUploadApi.getBlobSharedAccessSignature(blobName, (err, uploadParams) => {
        if (err) {
          /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_005: [`uploadToBlob` shall call the `_callback` callback with a `BlobSasError` parameter if retrieving the SAS token fails.]*/
          let error = new errors.BlobSasError('Could not obtain blob shared access signature.');
          error.innerError = err;
          _callback(error);
        } else {
          /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_006: [`uploadToBlob` shall upload the stream to the specified blob using its BlobUploader instance.]*/
          this._blobUploader.uploadToBlob(uploadParams, stream, streamLength, (err, body, result) => {
            const uploadResult = BlobUploadResult.fromAzureStorageCallbackArgs(err, body, result);
            /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_008: [`uploadToBlob` shall notify the result of a blob upload to the IoT Hub service using the file upload API endpoint.]*/
            this._fileUploadApi.notifyUploadComplete(uploadParams.correlationId, uploadResult, (err) => {
              if (err) {
                /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_009: [`uploadToBlob` shall call the `_callback` callback with a `BlobUploadNotificationError` if notifying the IoT Hub instance of the transfer outcome fails.]*/
                let error = new errors.BlobUploadNotificationError('Could not notify the IoT Hub of the file upload completion.');
                error.innerError = err;
                _callback(error);
              } else {
                /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_010: [`uploadToBlob` shall call the `_callback` callback with no arguments if IoT Hub was successfully notified of the blob upload outcome, regardless of the success state of the transfer itself.]*/
                _callback();
              }
            });
          });
        }
      });
    }, done);
  }
}
