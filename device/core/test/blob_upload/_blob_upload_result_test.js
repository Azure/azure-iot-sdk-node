// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var assert = require('chai').assert;
var BlobUploadResult = require('../../lib/blob_upload/blob_upload_result.js').BlobUploadResult;

describe('BlobUploadResult', function() {
  describe('#constructor', function() {
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_001: [The `isSuccess` parameter shall be assigned to the the `isSuccess` property of the newly created `BlobUploadResult` instance.]*/
    it('Assigns the \'isSuccess\' parameter to the \'isSuccess\' property', function() {
      [true, false].forEach(function(successValue) {
        var result = new BlobUploadResult(successValue);
        assert.equal(result.isSuccess, successValue);
      });
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_002: [The `statusCode` parameter shall be assigned to the the `statusCode` property of the newly created `BlobUploadResult` instance.]*/
    it('Assigns the \'statusCode\' parameter to the \'statusCode\' property', function() {
      var testStatusCode = 42;
      var result = new BlobUploadResult(true, testStatusCode);
      assert.equal(result.statusCode, testStatusCode);
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_003: [The `statusDescription` parameter shall be assigned to the the `statusDescription` property of the newly created `BlobUploadResult` instance.]*/
    it('Assigns the \'statusDescription\' parameter to the \'statusDescription\' property', function() {
      var testStatusDescription = 'test description';
      var result = new BlobUploadResult(true, 42, testStatusDescription);
      assert.equal(result.statusDescription, testStatusDescription);
    });
  });
  
  describe('#fromAzureStorageCallbackArgs', function(){
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_004: [If the `err` argument is not `null`, the `BlobUploadResult` error shall have the `isSuccess` property set to `false`.]*/
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_005: [If `err`, `body` and `response` are not `null` (HTTP error), the `BlobUploadResult` error shall have the `statusCode` property set to the HTTP error code of the blob upload response.]*/
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_006: [If `err`, `body` and `response` are not `null` (HTTP error), the `BlobUploadResult` error shall have the `statusDescription` property set to the HTTP error body of the blob upload response.]*/
    it('Creates a correct BlobUploadResult instance when the error in an HTTP error', function() {
      let testBody = 'This is a fake error';
      let result = BlobUploadResult.fromAzureStorageCallbackArgs(new Error(testBody), null);
      assert.isFalse(result.isSuccess);
      assert.equal(result.statusCode, -1);
      assert.equal(result.statusDescription, testBody);
    });
    
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_007: [If the `err` argument is not `null` but body and response are `undefined` (non HTTP error), the `BlobUploadResult` error shall have the `statusCode` property set to -1.]*/
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_008: [If the `err` argument is not `null` but body and response are `undefined` (non HTTP error), the `BlobUploadResult` error shall have the `statusDescription` property set to the error message.]*/
    it('Creates a correct BlobUploadResult instance when response is a success', function() {
      let fakeSuccessUpdateResponse = {
        errorCode: 0,
        _response: { status: 201, bodyAsText: '' }
       }
      var result = BlobUploadResult.fromAzureStorageCallbackArgs(null, fakeSuccessUpdateResponse);
      assert.isTrue(result.isSuccess);
      assert.equal(result.statusCode, 201);
      assert.equal(result.statusDescription, '');
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_007: [If the `err` argument is not `null` but body and response are `undefined` (non HTTP error), the `BlobUploadResult` error shall have the `statusCode` property set to -1.]*/
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_008: [If the `err` argument is not `null` but body and response are `undefined` (non HTTP error), the `BlobUploadResult` error shall have the `statusDescription` property set to the error message.]*/
    it('Creates a correct BlobUploadResult instance when response is a success', function() {
      let fakeSuccessUpdateResponse = {
        errorCode: 400,
        _response: { status: 400, bodyAsText: '' }
       }
      var result = BlobUploadResult.fromAzureStorageCallbackArgs(null, fakeSuccessUpdateResponse);
      assert.isFalse(result.isSuccess);
      assert.equal(result.statusCode, 400);
      assert.equal(result.statusDescription, '');
    });

    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_007: [If the `err` argument is not `null` but body and response are `undefined` (non HTTP error), the `BlobUploadResult` error shall have the `statusCode` property set to -1.]*/
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_008: [If the `err` argument is not `null` but body and response are `undefined` (non HTTP error), the `BlobUploadResult` error shall have the `statusDescription` property set to the error message.]*/
    it('Creates a correct BlobUploadResult instance when response is a success', function() {
      let fakeSuccessUpdateResponse = {
        errorCode: 0
      }
      assert.throws(() => {
        var result = BlobUploadResult.fromAzureStorageCallbackArgs(null, fakeSuccessUpdateResponse);
      });
    });
    
    /*Tests_SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_012: [If `err` is null and `body` and/or `response` is/are falsy, `fromAzureStorageCallbackArgs` shall throw a `ReferenceError`.]*/
    it('Throws a \'ReferenceError\' if err is null and uploadResponse is not provided', function() {
      assert.throws(function() {
        BlobUploadResult.fromAzureStorageCallbackArgs(null, null);
      }, ReferenceError);
    });
  });
});