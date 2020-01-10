// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const sinon = require('sinon');
const storageblob = require('@azure/storage-blob');
const AbortController = require('@azure/abort-controller').AbortController;
const assert = require('chai').assert;
const stream = require('stream');
const ArgumentError = require('azure-iot-common').errors.ArgumentError;
const BlobUploader = require('../../lib/blob_upload/blob_uploader.js').BlobUploader;
const FakeStorageApi = require('./fake_storage_api.js');

describe('BlobUploader', function() {
  describe('#constructor', function () {
    /*Codes_SRS_NODE_DEVICE_BLOB_UPLOAD_06_001: [`BlobUploader` should denote delay loading with null for the storageApi property if `storageApi` is falsy]*/
    it('creates the \'BlobUploader\' instance with the null storageApi property if \'storageApi\' is falsy', function() {
      let uploader = new BlobUploader();
      assert.isNull(uploader.storageApi);
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_16_008: [if `storageApi` is truthy, `BlobUploader` should use the `storageApi` object to upload data.]*/
    it('creates the \'BlobUploader\' instance with the \'storageApi\' argument if \'storageApi\' is truthy', function() {
      let testApi = { foo: 'bar' };
      let uploader = new BlobUploader(testApi);
      assert.deepEqual(uploader.storageApi, testApi);
    });
  });

  describe('#uploadToBlob', function() {
    let fakeBlobInfo = {
      hostName: 'host.name',
      containerName: 'containerName',
      blobName: 'blobName',
      sasToken: 'sasToken'
    };

    let fakeStream = new stream.Readable();

    it('sets the require for storage blob', function() {
      sinon.stub(AbortController,'timeout');
      sinon.stub(storageblob,'newPipeline');
      sinon.stub(storageblob,'AnonymousCredential');
      sinon.stub(storageblob,"BlockBlobClient").callsFake(function fakeFn() {
        function uploadStreamFn(stream, bufferSize, maxConcurrancy, options) {
          return new Promise((resolve, reject) => {
            resolve('fakeBlobResponse');
          });
        }
        return { uploadStream: uploadStreamFn }
      });
      let uploader = new BlobUploader();
      uploader.uploadToBlob(fakeBlobInfo, fakeStream, 42, function (err, response) {
        assert.equal(err, null);
        assert.equal(response, 'fakeUploadResponse');
        done();
      });
      });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_16_001: [`uploadToBlob` shall throw a `ReferenceError` if `blobInfo` is falsy.]*/
    [undefined, '', null, 0].forEach(function (falsyValue) {
      it('throws when \'blobInfo\' is \'' + falsyValue + '\'', function() {
        assert.throws(function() {
          let uploader = new BlobUploader(FakeStorageApi);
          uploader.uploadToBlob(falsyValue, fakeStream, 42, function () {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_16_002: [`uploadToBlob` shall throw a `ReferenceError` if `stream` is falsy.]*/
    [undefined, '', null, 0].forEach(function (falsyValue) {
      it('throws when \'stream\' is \'' + falsyValue + '\'', function() {
        assert.throws(function() {
          let uploader = new BlobUploader(FakeStorageApi);
          uploader.uploadToBlob(fakeBlobInfo, falsyValue, 42, function () {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_16_003: [`uploadToBlob` shall throw a `ReferenceError` if `streamSize` is falsy.]*/
    [undefined, '', null, 0].forEach(function (falsyValue) {
      it('throws when \'streamSize\' is \'' + falsyValue + '\'', function() {
        assert.throws(function() {
          let uploader = new BlobUploader(FakeStorageApi);
          uploader.uploadToBlob(fakeBlobInfo, fakeStream, falsyValue, function () {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_16_004: [`uploadToBlob` shall throw an `ArgumentError` if `blobInfo` is missing one or more of the following properties: `hostName`, `containerName`, `blobName`, `sasToken`).]*/
    [null, undefined, ''].forEach(function (value) {
      it('throws an ArgumentError if \'blobInfo.hostName\' is \'' + value + '\'', function() {
        assert.throws(function() {
          let uploader = new BlobUploader();
          let badBlobInfo = {
            hostName: value,
            containerName: 'container',
            blobName: 'blobName',
            sasToken: 'sasToken'
          };

          uploader.uploadToBlob(badBlobInfo, fakeStream, 42, function() {});
        }, ArgumentError);
      });
    });

    [null, undefined, ''].forEach(function (value) {
      it('throws an ArgumentError if \'blobInfo.containerName\' is \'' + value + '\'', function() {
        assert.throws(function() {
          let uploader = new BlobUploader();
          let badBlobInfo = {
            hostName: 'hostName',
            containerName: value,
            blobName: 'blobName',
            sasToken: 'sasToken'
          };

          uploader.uploadToBlob(badBlobInfo, fakeStream, 42, function() {});
        }, ArgumentError);
      });
    });

    [null, undefined, ''].forEach(function (value) {
      it('throws an ArgumentError if \'blobInfo.blobName\' is \'' + value + '\'', function() {
        assert.throws(function() {
          let uploader = new BlobUploader();
          let badBlobInfo = {
            hostName: 'hostName',
            containerName: 'containerName',
            blobName: value,
            sasToken: 'sasToken'
          };

          uploader.uploadToBlob(badBlobInfo, fakeStream, 42, function() {});
        }, ArgumentError);
      });
    });

    [null, undefined, ''].forEach(function (value) {
      it('throws an ArgumentError if \'blobInfo.sasToken\' is \'' + value + '\'', function() {
        assert.throws(function() {
          let uploader = new BlobUploader();
          let badBlobInfo = {
            hostName: 'hostName',
            containerName: 'containerName',
            blobName: 'blobName',
            sasToken: value
          };

          uploader.uploadToBlob(badBlobInfo, fakeStream, 42, function() {});
        }, ArgumentError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_16_005: [`uploadToBlob` shall call the `done` calback with the result of the storage api call.]*/
    it('calls the \'done\' callback with the result of the storage api call', function (done) {
      let uploader = new BlobUploader(FakeStorageApi);

      uploader.uploadToBlob(fakeBlobInfo, fakeStream, 42, function (err, response) {
        assert.equal(err, null);
        assert.equal(response, 'fakeUploadResponse');
        done();
      });
    });
  });
});
