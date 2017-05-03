// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Stream } from 'stream';
import { X509, SharedAccessSignature } from 'azure-iot-common';

import { BlobUploadResult } from './blob_upload_result';
import { BlobUploader as DefaultBlobUploader } from './blob_uploader';
import { FileUploadApi as DefaultFileUploadApi } from './file_upload_api';

import * as errors from './blob_upload_errors';

export interface UploadParams {
    hostName?: string;
    containerName?: string;
    blobName?: string;
    sasToken?: string;
    correlationId: string;
}

export interface FileUpload {
    getBlobSharedAccessSignature(blobName: string, auth: X509 | SharedAccessSignature, done: (err: Error, uploadParams?: UploadParams) => void): void;
    notifyUploadComplete(correlationId: string, auth: X509 | SharedAccessSignature, uploadResult: BlobUploadResult, done: (err?: Error) => void): void;
}

export interface BlobUploader {
    uploadToBlob(uploadParams: UploadParams, stream: Stream, streamLength: number, done: (err: Error, body?: any, result?: { statusCode: number, body: string }) => void): void;
}

export interface BlobUpload {
  uploadToBlob(blobName: string, stream: Stream, streamLength: number, done: (err?: Error) => void): void;
}

export class BlobUploadClient implements BlobUpload {
  private _config: any;
  private _fileUploadApi: FileUpload;
  private _blobUploader: BlobUploader;

  constructor(config: any, fileUploadApi?: FileUpload, blobUploader?: BlobUploader) {
    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_001: [`BlobUploadClient` shall throw a `ReferenceError` if `config` is falsy.]*/
    if (!config) throw new ReferenceError('config cannot be \'' + config + '\'');
    this._config = config;

    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_002: [If specified, `BlobUploadClient` shall use the `fileUploadApi` passed as a parameter instead of the default one.]*/
    this._fileUploadApi = fileUploadApi ? fileUploadApi : new DefaultFileUploadApi(this._config.deviceId, this._config.host);

    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_003: [If specified, `BlobUploadClient` shall use the `blobUploader` passed as a parameter instead of the default one.]*/
    this._blobUploader = blobUploader ? blobUploader : new DefaultBlobUploader();
  }

  updateSharedAccessSignature(sharedAccessSignature: string): void {
    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_011: [`updateSharedAccessSignature` shall update the value used by the `BlobUploadClient` instance to the value passed as an argument.]*/
    this._config.sharedAccessSignature = sharedAccessSignature;
  }

  uploadToBlob(blobName: string, stream: Stream, streamLength: number, done: (err?: Error) => void): void {
    const self = this;
    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_004: [`uploadToBlob` shall obtain a blob SAS token using the IoT Hub service file upload API endpoint.]*/
    const auth = self._config.x509 ? self._config.x509 : self._config.sharedAccessSignature;
    self._fileUploadApi.getBlobSharedAccessSignature(blobName, auth, (err, uploadParams) => {
      if (err) {
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_005: [`uploadToBlob` shall call the `done` callback with a `BlobSasError` parameter if retrieving the SAS token fails.]*/
        let error = new errors.BlobSasError('Could not obtain blob shared access signature.');
        error.innerError = err;
        done(error);
      } else {
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_006: [`uploadToBlob` shall upload the stream to the specified blob using its BlobUploader instance.]*/
        self._blobUploader.uploadToBlob(uploadParams, stream, streamLength, (err, body, result) => {
          const uploadResult = BlobUploadResult.fromAzureStorageCallbackArgs(err, body, result);
          /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_008: [`uploadToBlob` shall notify the result of a blob upload to the IoT Hub service using the file upload API endpoint.]*/
          self._fileUploadApi.notifyUploadComplete(uploadParams.correlationId, auth, uploadResult, (err) => {
            if (err) {
              /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_009: [`uploadToBlob` shall call the `done` callback with a `BlobUploadNotificationError` if notifying the IoT Hub instance of the transfer outcome fails.]*/
              let error = new errors.BlobUploadNotificationError('Could not notify the IoT Hub of the file upload completion.');
              error.innerError = err;
              done(error);
            } else {
              /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_010: [`uploadToBlob` shall call the `done` callback with no arguments if IoT Hub was successfully notified of the blob upload outcome, regardless of the success state of the transfer itself.]*/
              done();
            }
          });
        });
      }
    });
  }
}
