// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Stream } from 'stream';
import { errors } from 'azure-iot-common';
import { tripleValueCallbackToPromise, TripleValueCallback } from 'azure-iot-common';


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
export interface BlobUploaderInterface {
  uploadToBlob(uploadParams: UploadParams, stream: Stream, streamLength: number, done: TripleValueCallback<any, BlobResponse>): void;
  uploadToBlob(uploadParams: UploadParams, stream: Stream, streamLength: number): Promise<any>;
}

/**
 * @private
 */
export interface Aborter {
  timeout(time: number): any;
}

/**
 * @private
 */
export type BlobResponse = {
  statusCode: number,
  body: string
};

/**
 * @private
 */
export interface BlobService {
  createBlockBlobFromStream(containerName: string, blobName: string, stream: Stream, streamLength: number, done: (err: Error, body?: any, result?: BlobResponse) => void): void;
}

/**
 * @private
 */
export interface StorageApi {
  BlockBlobURL: any;
  Aborter: Aborter;
  StorageURL: any;
  AnonymousCredential: any;
  uploadStreamToBlockBlob: any;
}

/**
 * @private
 */
export class BlobUploader implements BlobUploaderInterface {
  storageApi: StorageApi;

  constructor(storageApi?: StorageApi) { // TODO: interface
    if (storageApi) {
      /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_008: [`BlobUploader` should use the `storageApi` object to upload data if `storageApi` is truthy.]*/
      this.storageApi = storageApi;
    } else {
      /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_06_001: [`BlobUploader` should denote delay loading with null for the storageApi property if `storageApi` is falsy]*/
      this.storageApi = null;
    }
  }

  uploadToBlob(blobInfo: UploadParams, stream: Stream, streamLength: number, done: TripleValueCallback<any, BlobResponse>): void;
  uploadToBlob(blobInfo: UploadParams, stream: Stream, streamLength: number): Promise<{ body: any, result: BlobResponse }>;
  uploadToBlob(blobInfo: UploadParams, stream: Stream, streamLength: number, done?: TripleValueCallback<any, BlobResponse>): Promise<{ body: any, result: BlobResponse }> | void {
    tripleValueCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_001: [`uploadToBlob` shall throw a `ReferenceError` if `blobInfo` is falsy.]*/
      if (!blobInfo) throw new ReferenceError('blobInfo cannot be \'' + blobInfo + '\'');
      /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_002: [`uploadToBlob` shall throw a `ReferenceError` if `stream` is falsy.]*/
      if (!stream) throw new ReferenceError('stream cannot be \'' + stream + '\'');
      /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_003: [`uploadToBlob` shall throw a `ReferenceError` if `streamSize` is falsy.]*/
      if (!streamLength) throw new ReferenceError('streamLength cannot be \'' + streamLength + '\'');

      /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_004: [`uploadToBlob` shall throw an `ArgumentError` if `blobInfo` is missing one or more of the following properties: `hostName`, `containerName`, `blobName`, `sasToken`).]*/
      if (!blobInfo.hostName || !blobInfo.containerName || !blobInfo.blobName || !blobInfo.sasToken) {
        throw new errors.ArgumentError('Invalid upload parameters');
      }

      // this is only an option for testing purposes.
      if (!this.storageApi) {
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_06_002: [`BlobUploader` should delay load azure-storage into the storageAPI property if `storageApi` is falsy]*/
        this.storageApi = require('@azure/storage-blob');
      }

      const pipeline = this.storageApi.StorageURL.newPipeline(new this.storageApi.AnonymousCredential(), {
        // httpClient: myHTTPClient,
        // logger: MyLogger
        retryOptions: { maxTries: 4 },
        telemetry: { value: 'Upload To Blob via Node.js IoT Client' },
        keepAliveOptions: {
          enable: false
        }
      });
      const blockBlobURL = new this.storageApi.BlockBlobURL(`https://${blobInfo.hostName}/${blobInfo.containerName}/${blobInfo.blobName}${blobInfo.sasToken}`, pipeline);
      const uploadPromise = this.storageApi.uploadStreamToBlockBlob(this.storageApi.Aborter.timeout(30 * 60 * 1000), stream, blockBlobURL, streamLength, 20, { progress: (ev) => console.log(ev) });
      uploadPromise
      .then((uploadBlobResponse: any) => {
        /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_005: [`uploadToBlob` shall call the `_callback` calback with the result of the storage api call.]*/
        _callback(null, uploadBlobResponse);
      })
      .catch((err: Error) => {
        _callback(err, null);
      });
    }, ((body, result) => { return { body: body, result: result }; }), done);
  }
}
