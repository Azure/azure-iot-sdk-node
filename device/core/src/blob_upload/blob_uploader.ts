// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Stream } from 'stream';
import { errors } from 'azure-iot-common';
import { UploadParams, BlobUploader as BlobUploaderInterface } from './blob_upload_client';

export interface BlobService {
    createBlockBlobFromStream(containerName: string, blobName: string, stream: Stream, streamLength: number, done: (err: Error, body?: any, result?: { statusCode: number, body: string }) => void): void;
}

export interface StorageApi {
    createBlobServiceWithSas(hostName: string, sasToken: string): BlobService;
}

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

  uploadToBlob(blobInfo: UploadParams, stream: Stream, streamLength: number, done: (err: Error, body?: any, result?: { statusCode: number, body: string }) => void): void {
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

    if (!this.storageApi) {
      /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_06_002: [`BlobUploader` should delay load azure-storage into the storageAPI property if `storageApi` is falsy]*/
      this.storageApi = require('azure-storage');
    }
    const blobService = this.storageApi.createBlobServiceWithSas(blobInfo.hostName, blobInfo.sasToken);
    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_16_005: [`uploadToBlob` shall call the `done` calback with the result of the storage api call.]*/
    blobService.createBlockBlobFromStream(blobInfo.containerName, blobInfo.blobName, stream, streamLength, done);
  }
}
