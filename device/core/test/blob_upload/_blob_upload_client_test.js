// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
let assert = require('chai').assert;
let sinon = require('sinon');
let stream = require('stream');
let BlobUploadClient = require('../../dist/blob_upload').BlobUploadClient;
let BlobUploadNotificationError = require('../../dist/blob_upload').BlobUploadNotificationError;

let FakeFileUploadApi = function () {
  this.setOptions = sinon.spy();
  this.getBlobSharedAccessSignature = sinon.spy();
  this.notifyUploadComplete = sinon.spy();
};

let FakeBlobUploader = function () {
  this.uploadToBlob = sinon.spy();
};

let fakeConfig = {
  host: 'hub.host.com',
  sharedAccessSignature: 'sas',
  deviceId: 'deviceId'
};

describe('BlobUploadClient', function () {
  describe('#constructor', function () {
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_001: [`BlobUploadClient` shall throw a `ReferenceError` if `config` is falsy.]*/
    [undefined, null].forEach(function (config) {
      it('throws a ReferenceError if \'config\' is \'' + config + '\'', function () {
        assert.throws(function () {
          return new BlobUploadClient(config);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_002: [If specified, `BlobUploadClient` shall use the `fileUploadApi` passed as a parameter instead of the default one.]*/
    it('uses the fileUploadApi passed as a argument instead of the default one if specified', function () {
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploader = new FakeBlobUploader();

      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploader);
      client.uploadToBlob('blobName', new stream.Readable(), 42, function () {});
      assert(fakeFileUpload.getBlobSharedAccessSignature.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_003: [If specified, `BlobUploadClient` shall use the `blobUploader` passed as a parameter instead of the default one.]*/
  });

  describe('#setOptions', function () {
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_99_011: [`setOptions` shall set `fileUploadApi` options.]*/
    it('sets file upload API options', function () {
      let fakeOptions = '__FAKE_OPTIONS__';
      let fakeFileUpload = new FakeFileUploadApi();
      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, null);
      client.setOptions(fakeOptions);
      assert.isTrue(fakeFileUpload.setOptions.calledWith(fakeOptions));
    });
  });

  describe('#uploadToBlob', function () {
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_004: [`uploadToBlob` shall obtain a blob SAS token using the IoT Hub service file upload API endpoint.]*/
    it('gets the Blob SAS token from the File Upload API', function () {
      let fakeStream = new stream.Readable();
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploader = new FakeBlobUploader();
      let fakeBlobName = 'blobName';
      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploader);
      client.uploadToBlob(fakeBlobName, fakeStream, 42, function () {});
      assert(fakeFileUpload.getBlobSharedAccessSignature.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_005: [`uploadToBlob` shall call the `done` callback with a `BlobSasError` parameter if retrieving the SAS token fails.]*/
    it('calls the done callback with a BlobSasError if getting the SAS token fails', function (done) {
      let fakeStream = new stream.Readable();
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploader = new FakeBlobUploader();
      let fakeBlobName = 'blobName';
      fakeFileUpload.getBlobSharedAccessSignature = function (blobName, callback) {
        let error = new Error('fake error');
        callback(error);
      };

      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploader);
      client.uploadToBlob(fakeBlobName, fakeStream, 42, function (err) {
        assert.strictEqual(err.name, 'BlobSasError');
        done();
      });
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_16_006: [`uploadToBlob` shall upload the stream to the specified blob using its BlobUploader instance.]*/
    it('uploads the stream to the blob', function (done) {
      let fakeStream = new stream.Readable();
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploader = new FakeBlobUploader();
      let fakeBlobName = 'blobName';
      let fakeStreamLength = 42;
      let fakeBlobInfo = {
        correlationId: 'correlationId',
        blobName: fakeBlobName,
        containerName: 'container',
        hostName: 'host.name',
        sasToken: 'sasToken'
      };

      fakeFileUpload.getBlobSharedAccessSignature = function (blobName, callback) {
        callback(null, fakeBlobInfo);
      };

      fakeBlobUploader.uploadToBlob = function (blobInfo, stream, streamLength) {
        assert.equal(blobInfo, fakeBlobInfo);
        assert.equal(stream, fakeStream);
        assert.equal(streamLength, fakeStreamLength);
        done();
      };

      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploader);
      client.uploadToBlob(fakeBlobName, fakeStream, fakeStreamLength, function () {});
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_006: [`uploadToBlob` shall notify the result of a blob upload to the IoT Hub service using the file upload API endpoint.]*/
    it('sends the file uploaded notification once done with the upload', function () {
      let fakeStream = new stream.Readable();
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploader = new FakeBlobUploader();
      let fakeBlobName = 'blobName';
      let fakeStreamLength = 42;
      let fakeBlobInfo = {
        correlationId: 'correlationId',
        blobName: fakeBlobName,
        containerName: 'container',
        hostName: 'host.name',
        sasToken: 'sasToken'
      };

      fakeFileUpload.getBlobSharedAccessSignature = function (blobName, callback) {
        callback(null, fakeBlobInfo);
      };

      fakeBlobUploader.uploadToBlob = function (blobInfo, stream, streamLength, callback) {
        callback(null, { errorCode: null, _response: { status: 201, bodyAsText: '' } });
      };

      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploader);
      client.uploadToBlob(fakeBlobName, fakeStream, fakeStreamLength, function () {});
      assert(fakeFileUpload.notifyUploadComplete.calledWith(fakeBlobInfo.correlationId));
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_005: [`uploadToBlob` shall call the `done` callback with a `BlobUploadNotificationError` if notifying the IoT Hub instance of the transfer outcome fails.]*/
    it('calls the done callback with BlobUploadNotificationError if notifying the IoT Hub instance of the transfer outcome fails', function (done) {
      let fakeStream = new stream.Readable();
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploader = new FakeBlobUploader();
      let fakeBlobName = 'blobName';
      let fakeStreamLength = 42;
      let fakeBlobInfo = {
        correlationId: 'correlationId',
        blobName: fakeBlobName,
        containerName: 'container',
        hostName: 'host.name',
        sasToken: 'sasToken'
      };

      fakeFileUpload.getBlobSharedAccessSignature = function (blobName, callback) {
        callback(null, fakeBlobInfo);
      };

      fakeFileUpload.notifyUploadComplete = function (correlationId, result, callback) {
        callback(new Error('could not notify hub'));
      };

      fakeBlobUploader.uploadToBlob = function (blobInfo, stream, streamLength, callback) {
        callback(null, { errorCode: null, _response: { status: 201, bodyAsText: '' } });
      };

      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploader);
      client.uploadToBlob(fakeBlobName, fakeStream, fakeStreamLength, function (err) {
        assert.strictEqual(err.name, 'BlobUploadNotificationError');
        done();
      });
    });

        /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_005: [`uploadToBlob` shall call the `done` callback with a `BlobUploadNotificationError` if notifying the IoT Hub instance of the transfer outcome fails.]*/
    it('calls the done callback with BlobUploadNotificationError if notifying the IoT Hub instance of the transfer outcome fails but the upload succeeds', function (done) {
      let fakeStream = new stream.Readable();
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploaderSuccess = new FakeBlobUploader();
      let fakeBlobName = 'blobName';
      let fakeStreamLength = 42;
      let fakeBlobInfo = {
        correlationId: 'correlationId',
        blobName: fakeBlobName,
        containerName: 'container',
        hostName: 'host.name',
        sasToken: 'sasToken'
      };

      fakeFileUpload.getBlobSharedAccessSignature = function (blobName, callback) {
        callback(null, fakeBlobInfo);
      };

      fakeFileUpload.notifyUploadComplete = function (correlationId, result, callback) {
        callback(new Error('could not notify hub'));
      };

      fakeBlobUploaderSuccess.uploadToBlob = function (blobInfo, stream, streamLength, callback) {
        callback(null, { errorCode: null, _response: { status: 201, bodyAsText: '' } });
      };

      let clientUploadSuccess = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploaderSuccess);
      clientUploadSuccess.uploadToBlob(fakeBlobName, fakeStream, fakeStreamLength, function (err) {
        assert.strictEqual(err.name, 'BlobUploadNotificationError');
        done();
      });
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_007: [`uploadToBlob` shall call the `done` callback with a `BlobUploadNotificationError` if notifying the IoT Hub instance of the transfer outcome fails.]*/
    it('calls the done callback with BlobUploadNotificationError if notifying the IoT Hub instance of the transfer outcome fails and the upload fails', function (done) {
      let fakeStream = new stream.Readable();
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploaderFailure = new FakeBlobUploader();
      let fakeBlobName = 'blobName';
      let fakeStreamLength = 42;
      let fakeBlobInfo = {
        correlationId: 'correlationId',
        blobName: fakeBlobName,
        containerName: 'container',
        hostName: 'host.name',
        sasToken: 'sasToken'
      };

      fakeFileUpload.getBlobSharedAccessSignature = function (blobName, callback) {
        callback(null, fakeBlobInfo);
      };

      fakeFileUpload.notifyUploadComplete = function (correlationId, result, callback) {
        callback(new Error('could not notify hub'));
      };

      fakeBlobUploaderFailure.uploadToBlob = function (blobInfo, stream, streamLength, callback) {
        callback(BlobUploadNotificationError, null);
      };

      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploaderFailure);
      client.uploadToBlob(fakeBlobName, fakeStream, fakeStreamLength, function (err) {
        assert.strictEqual(err.name, 'BlobUploadNotificationError');
        done();
      });
    });


    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_005: [`uploadToBlob` shall call the `done` callback with a `BlobUploadNotificationError` if the data transfer fails.]*/
    it('calls the done callback with a BlobUploadNotificationError if the data transfer fails but the IoT Hub notification succeeds', function (done) {
      let fakeStream = new stream.Readable();
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploader = new FakeBlobUploader();
      let fakeBlobName = 'blobName';
      let fakeStreamLength = 42;
      let fakeBlobInfo = {
        correlationId: 'correlationId',
        blobName: fakeBlobName,
        containerName: 'container',
        hostName: 'host.name',
        sasToken: 'sasToken'
      };

      fakeFileUpload.getBlobSharedAccessSignature = function (blobName, callback) {
        callback(null, fakeBlobInfo);
      };

      fakeFileUpload.notifyUploadComplete = function (correlationId, result, callback) {
        callback(null);
      };

      fakeBlobUploader.uploadToBlob = function (blobInfo, stream, streamLength, callback) {
        callback(BlobUploadNotificationError, null);
      };

      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploader);
      client.uploadToBlob(fakeBlobName, fakeStream, fakeStreamLength, function (err) {
        assert.strictEqual(err.name, 'BlobUploadNotificationError');
        done();
      });
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_005: [`uploadToBlob` shall call the `done` callback with a `BlobUploadNotificationError` if the data transfer fails.]*/
    it('calls the done callback with a BlobUploadNotificationError if the data transfer fails and the IoT Hub notification fails', function (done) {
      let fakeStream = new stream.Readable();
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploader = new FakeBlobUploader();
      let fakeBlobName = 'blobName';
      let fakeStreamLength = 42;
      let fakeBlobInfo = {
        correlationId: 'correlationId',
        blobName: fakeBlobName,
        containerName: 'container',
        hostName: 'host.name',
        sasToken: 'sasToken'
      };

      fakeFileUpload.getBlobSharedAccessSignature = function (blobName, callback) {
        callback(null, fakeBlobInfo);
      };

      fakeFileUpload.notifyUploadComplete = function (correlationId, result, callback) {
        callback(Error);
      };

      fakeBlobUploader.uploadToBlob = function (blobInfo, stream, streamLength, callback) {
        callback(BlobUploadNotificationError, null);
      };

      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploader);
      client.uploadToBlob(fakeBlobName, fakeStream, fakeStreamLength, function (err) {
        assert.strictEqual(err.name, 'BlobUploadNotificationError');
        done();
      });
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_CLIENT_41_004: [`uploadToBlob` shall call the `_callback` callback with no arguments if the blob upload succeeded, and IoT Hub was successfully notified of the blob upload outcome.]*/
    it('calls the done callback with no arguments if the upload as completed successfully and IoT Hub has been notified.', function (done) {
      let fakeStream = new stream.Readable();
      let fakeFileUpload = new FakeFileUploadApi();
      let fakeBlobUploader = new FakeBlobUploader();
      let fakeBlobName = 'blobName';
      let fakeStreamLength = 42;
      let fakeBlobInfo = {
        correlationId: 'correlationId',
        blobName: fakeBlobName,
        containerName: 'container',
        hostName: 'host.name',
        sasToken: 'sasToken'
      };

      fakeFileUpload.getBlobSharedAccessSignature = function (blobName, callback) {
        callback(null, fakeBlobInfo);
      };

      fakeFileUpload.notifyUploadComplete = function (correlationId, result, callback) {
        callback();
      };

      fakeBlobUploader.uploadToBlob = function (blobInfo, stream, streamLength, callback) {
        callback(null, { errorCode: null, _response: { status: 201, bodyAsText: '' } });
      };

      let client = new BlobUploadClient(fakeConfig, fakeFileUpload, fakeBlobUploader);
      client.uploadToBlob(fakeBlobName, fakeStream, fakeStreamLength, function (err) {
        assert.isUndefined(err);
        done();
      });
    });
  });
});
