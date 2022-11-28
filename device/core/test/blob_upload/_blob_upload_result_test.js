// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
let assert = require('chai').assert;
let BlobUploadResult = require('../../dist/blob_upload/blob_upload_result.js').BlobUploadResult;

describe('BlobUploadResult', function () {
  describe('#constructor', function () {
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_001: [The `isSuccess` parameter shall be assigned to the the `isSuccess` property of the newly created `BlobUploadResult` instance.]*/
    it('Assigns the \'isSuccess\' parameter to the \'isSuccess\' property', function () {
      [true, false].forEach(function (successValue) {
        let result = new BlobUploadResult(successValue);
        assert.equal(result.isSuccess, successValue);
      });
    });


    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_002: [The `statusCode` parameter shall be assigned to the the `statusCode` property of the newly created `BlobUploadResult` instance.]*/
    it('Assigns the \'statusCode\' parameter to the \'statusCode\' property', function () {
      let testStatusCode = 42;
      let result = new BlobUploadResult(true, testStatusCode);
      assert.equal(result.statusCode, testStatusCode);
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_003: [The `statusDescription` parameter shall be assigned to the the `statusDescription` property of the newly created `BlobUploadResult` instance.]*/
    it('Assigns the \'statusDescription\' parameter to the \'statusDescription\' property', function () {
      let testStatusDescription = 'test description';
      let result = new BlobUploadResult(true, 42, testStatusDescription);
      assert.equal(result.statusDescription, testStatusDescription);
    });
  });


  describe('#fromAzureStorageCallbackArgs', function (){
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_001: [If `err` is `null` and `uploadResponse` is falsy a `ReferenceError` shall be thrown]*/
    it('Throws a \'ReferenceError\' if err is null and uploadResponse is not provided', function () {
      assert.throws(function () {
        BlobUploadResult.fromAzureStorageCallbackArgs(null, null);
      }, ReferenceError);
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_002: [If `err` is not `null`, the `BlobUploadResult` shall have the `isSuccess` property set to `false`.]*/
    it('Creates a correct BlobUploadResult instance when the error in an HTTP error', function () {
      let testBody = 'This is a fake error';
      let result = BlobUploadResult.fromAzureStorageCallbackArgs(new Error(testBody), null);
      assert.isFalse(result.isSuccess);
      assert.equal(result.statusCode, -1);
      assert.equal(result.statusDescription, testBody);
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_003: [If `err` is null but `uploadResponse` is provided, and `uploadResponse.ErrorCode` is not null, `BlobUploadResult` shall have the `isSuccess` property set to `false`]*/
    it('Creates a correct BlobUploadResult instance when response is a error', function () {
      let fakeSuccessUpdateResponse = {
        errorCode: '400',
        _response: { status: 400, bodyAsText: '' }
        }
      let result = BlobUploadResult.fromAzureStorageCallbackArgs(null, fakeSuccessUpdateResponse);
      assert.isFalse(result.isSuccess);
      assert.equal(result.statusCode, 400);
      assert.equal(result.statusDescription, '');
    });

    it('Creates a correct BlobUploadResult instance when response is a error without an errorCode', function () {
      let fakeSuccessUpdateResponse = {
        errorCode: '',
        _response: { status: 400, bodyAsText: '' }
        }
      let result = BlobUploadResult.fromAzureStorageCallbackArgs(null, fakeSuccessUpdateResponse);
      assert.isFalse(result.isSuccess);
      assert.equal(result.statusCode, 400);
      assert.equal(result.statusDescription, '');
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_004: [If `err` is null and `uploadResponse` is provided, the `BlobUploadResult` shall have the `statusCode` and `statusDescription` property set to the HTTP status code of the blob upload response]*/
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_005: [If `uploadResponse._response.status` is a number within the HTTP Status Codes 'success' range, the `isSuccess` property will be set to `true`]*/
    it('Creates a correct BlobUploadResult instance when response is a success', function () {
      let fakeSuccessUpdateResponse = {
        errorCode: '',
        _response: { status: 201, bodyAsText: '' }
       }
      let result = BlobUploadResult.fromAzureStorageCallbackArgs(null, fakeSuccessUpdateResponse);
      assert.isTrue(result.isSuccess);
      assert.equal(result.statusCode, 201);
      assert.equal(result.statusDescription, '');
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_005: [If `uploadResponse._response.status` is a number within the HTTP Status Codes 'success' range, the `isSuccess` property will be set to `true`]*/
    it('Creates a correct BlobUploadResult instance when response is malformed (no _response)', function () {
      let fakeSuccessUpdateResponse = {
        errorCode: '0'
      }
      let result = BlobUploadResult.fromAzureStorageCallbackArgs(null, fakeSuccessUpdateResponse);
      assert.isFalse(result.isSuccess);
      assert.equal(result.statusCode, -1);
      assert.equal(result.statusDescription, 'no status description');
    });
  });
});
