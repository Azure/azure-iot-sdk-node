// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var endpoint = require('azure-iot-common').endpoint;
var FileUploadApi = require('../../lib/blob_upload/file_upload_api.js').FileUploadApi;
var packageJson = require('../../package.json');

describe('FileUploadApi', function() {
  var fakeCredentials = {
    host: 'host.name',
    deviceId: 'deviceId',
    sharedAccessSignature: 'hubSas'
  };

  var fakeAuthenticationProvider = {
    getDeviceCredentials: function (callback) {
      callback(null, fakeCredentials);
    }
  };

  describe('#constructor', function() {
    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_019: [`FileUploadApi` shall throw a `ReferenceError` if `authenticationProvider` is falsy.]*/
    [undefined, null].forEach(function (authenticationProvider) {
      it('throws if authenticationProvider is \'' + authenticationProvider + '\'', function(){
        assert.throws(function() {
          return new FileUploadApi(authenticationProvider, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_018: [`FileUploadApi` shall instantiate the default `azure-iot-http-base.Http` transport if `transport` is not specified, otherwise it shall use the specified transport.]*/
    it('uses the transport provided in the arguments', function() {
      var callCount = 0;
      var Transport = function () {
        this.buildRequest = function() {
          callCount++;
          return {
            write: function() {},
            end: function() {}
          };
        };
      };
      var testTransport = new Transport();
      var fileUpload = new FileUploadApi(fakeAuthenticationProvider, testTransport);
      fileUpload.getBlobSharedAccessSignature('blobName', function() {});
      assert.equal(callCount, 1);
      fileUpload.notifyUploadComplete('correlationId', { isSuccess: true, statusCode: 200, statusDescription: 'test' }, function() {});
      assert.equal(callCount, 2);
    });
  });

  describe('#getBlobSharedAccessSignature', function() {
    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_004: [`getBlobSharedAccessSignature` shall throw a `ReferenceError` if `blobName` is falsy.]*/
    [undefined, null, ''].forEach(function (blobName) {
      it('throws if blobName is \'' + blobName + '\'', function(){
        var fileUpload = new FileUploadApi(fakeAuthenticationProvider, function() {});
        assert.throws(function() {
          fileUpload.getBlobSharedAccessSignature(blobName, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_006: [`getBlobSharedAccessSignature` shall create a `POST` HTTP request to a path formatted as the following:
    `/devices/<deviceId>/files?api-version=<api-version>`]*/
    it('builds a valid path for the HTTP POST request', function() {
      var testFileName = 'testfile.txt';
      var testBody = { blobName: testFileName };

      var FakeHttpTransport = function() {
        this.buildRequest = function (method, path) {
          assert.equal(method, 'POST');
          assert.equal(path, '/devices/' + fakeCredentials.deviceId + '/files' + endpoint.versionQueryString());
          return {
             write: function(body) {
             assert.equal(body, JSON.stringify(testBody));
            },
            end: function() {}
          };
        };
      };

      var fileUpload = new FileUploadApi(fakeAuthenticationProvider, new FakeHttpTransport());
      fileUpload.getBlobSharedAccessSignature(testFileName, function () {});
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_007: [The `POST` HTTP request shall have the following headers:
    ```
   Host: '<hostname>'
   Authorization: <iotHubSas>
   Accept: 'application/json',
   'Content-Type': 'application/json',
   'Content-Length': <content length>,
   'User-Agent': <sdk name and version>
  ```
 The `POST` HTTP request shall have the following body:
 {
   blobName: '<name of the blob for which a SAS URI will be generated>'
 }
   ```]*/
    it('builds a valid set of headers with a shared access signature for the HTTP request', function() {
      var testFileName = 'testfile.txt';
      var testBody = { blobName: testFileName };

      var FakeHttpTransport = function() {
        this.buildRequest = function (method, path, headers) {
          assert.equal(headers.Host, fakeCredentials.host);
          assert.equal(headers.Authorization, fakeCredentials.sharedAccessSignature);
          assert.equal(headers.Accept, 'application/json');
          assert.equal(headers['Content-Type'], 'application/json');
          assert.equal(headers['Content-Length'], JSON.stringify(testBody).length);
          assert.equal(headers['User-Agent'], packageJson.name + '/' + packageJson.version);

          return {
             write: function(body) {
             assert.equal(body, JSON.stringify(testBody));
            },
            end: function() {}
          };
        };
      };

      var fileUpload = new FileUploadApi(fakeAuthenticationProvider, new FakeHttpTransport());
      fileUpload.getBlobSharedAccessSignature(testFileName, function () {});
    });

    it('builds a valid set of headers with x509 authentication for the HTTP request', function() {
      var testFileName = 'testfile.txt';
      var testBody = { blobName: testFileName };

      var fakeX509Creds = { deviceId: 'id', host: 'host', x509: { cert: 'cert', key: 'key' }};
      var fakeX509AuthProvider = {
        getDeviceCredentials: function (callback) { callback(null, fakeX509Creds); }
      };

      var FakeHttpTransport = function() {
        this.buildRequest = function (method, path, headers, host, auth) {
          assert.equal(headers.Accept, 'application/json');
          assert.equal(headers.Host, fakeX509Creds.host);
          assert.equal(headers['User-Agent'], packageJson.name + '/' + packageJson.version);
          assert.isUndefined(headers.Authorization);
          assert.equal(auth, fakeX509Creds.x509);
          return {
             write: function(body) {
             assert.equal(body, JSON.stringify(testBody));
            },
            end: function() {}
          };
        };
      };

      var fileUpload = new FileUploadApi(fakeX509AuthProvider, new FakeHttpTransport());
      fileUpload.getBlobSharedAccessSignature(testFileName, function () {});
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_008: [`getBlobSharedAccessSignature` shall call the `done` callback with an `Error` object if the request fails.]*/

    it('calls the done callback with an error if the request fails', function (done) {
      var testFileName = 'testfile.txt';
      var testBody = { blobName: testFileName };

      var FailingTransport = function() {
        this.buildRequest = function(method, path, headers, hostname, x509auth, callback) {
          return {
            write: function(body) {
            assert.equal(body, JSON.stringify(testBody));
            },
            end: function() {
              callback(new Error('fake failure'));
            }
          };
        };
      };

      var fileUpload = new FileUploadApi(fakeAuthenticationProvider, new FailingTransport());
      fileUpload.getBlobSharedAccessSignature(testFileName, function (err) {
        assert.instanceOf(err, Error);
        done();
      });
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_009: [`getBlobSharedAccessSignature` shall call the `done` callback with a `null` error object and a result object containing a correlation ID and a SAS parameters if the request succeeds, in the following format:
    {
      correlationId: '<correlationIdString>',
      hostName: '<hostName>',
      blobName: '<blobName>',
      containerName: '<containerName>',
      sasToken: '<sasUriString>'
    }]*/
    it('calls the done callback with a null error object and a properly formatted result object if the request succeeds', function(done) {
      var testFileName = 'testfile.txt';
      var testCorrelationId = 'correlationId';
      var testContainerName = 'containerName';
      var testSasToken = 'sasToken';
      var testBody = { blobName: testFileName };

      var fakeResult = JSON.stringify({
        correlationId: testCorrelationId,
        hostName: fakeCredentials.host,
        blobName: testFileName,
        containerName: testContainerName,
        sasToken: testSasToken
      });

      var FakeHttpTransport = function() {
        this.buildRequest = function(method, path, headers, hostname, x509auth, callback) {
          return {
            write: function(body) {
            assert.equal(body, JSON.stringify(testBody));
            },
            end: function() {
              callback(null, fakeResult);
            }
          };
        };
      };

      var fileUpload = new FileUploadApi(fakeAuthenticationProvider, new FakeHttpTransport());
      fileUpload.getBlobSharedAccessSignature(testFileName, function (err, result) {
        if(err) {
          done(err);
        } else {
          assert.equal(result.correlationId, testCorrelationId);
          assert.equal(result.hostName, fakeCredentials.host);
          assert.equal(result.blobName, testFileName);
          assert.equal(result.containerName, testContainerName);
          assert.equal(result.sasToken, testSasToken);
          done();
        }
      });
    });
  });

  describe('#notifyUploadComplete', function() {
    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_010: [`notifyUploadComplete` shall throw a `ReferenceError` if `correlationId` is falsy.]*/
    [undefined, null, ''].forEach(function (correlationId) {
      it('throws if correlationId is \'' + correlationId + '\'', function(){
        var fileUpload = new FileUploadApi(fakeAuthenticationProvider, function() {});
        assert.throws(function() {
          fileUpload.notifyUploadComplete(correlationId, {}, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_012: [`notifyUploadComplete` shall throw a `ReferenceError` if `uploadResult` is falsy.]*/
    [undefined, null, ''].forEach(function (uploadResult) {
      it('throws if uploadResult is \'' + uploadResult + '\'', function(){
        var fileUpload = new FileUploadApi(fakeAuthenticationProvider, function() {});
        assert.throws(function() {
          fileUpload.notifyUploadComplete('correlationId', uploadResult, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_013: [`notifyUploadComplete` shall create a `POST` HTTP request to a path formatted as the following: `/devices/<deviceId>/files/<correlationId>?api-version=<api-version>`]*/
    it('builds a valid path for the HTTP POST request', function() {
      var testCorrelationId = 'correlationId';
      var testUploadResult = { isSuccess: true, statusCode: 200, statusDescription: 'Success' };

      var FakeHttpTransport = function() {
        this.buildRequest = function (method, path) {
          assert.equal(method, 'POST');
          assert.equal(path, '/devices/' + fakeCredentials.deviceId + '/files/notifications/' + testCorrelationId + endpoint.versionQueryString());
          return {
            write: function() {},
            end: function() {}
          };
        };
      };
      var fileUpload = new FileUploadApi(fakeAuthenticationProvider, new FakeHttpTransport());
      fileUpload.notifyUploadComplete(testCorrelationId, testUploadResult, function() {});
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_014: [** The `POST` HTTP request shall have the following headers:
    ```
    Host: <hostname>,
    Authorization: <sharedAccessSignature>,
    'User-Agent': <version>,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': <content length>,
    'iothub-name': <hub name>
    ```]*/
    it('builds a valid set of headers with a shared access signature for the HTTP request', function() {
      var testUploadResult = { isSuccess: true, statusCode: 200, statusDescription: 'Success' };

      var FakeHttpTransport = function() {
        this.buildRequest = function (method, path, headers) {
          assert.equal(headers.Host, fakeCredentials.host);
          assert.equal(headers.Authorization, fakeCredentials.sharedAccessSignature);
          assert.equal(headers['Content-Type'], 'application/json; charset=utf-8');
          assert.equal(headers['Content-Length'], JSON.stringify(testUploadResult).length);
          assert.equal(headers['iothub-name'], fakeCredentials.host.split('.')[0]);

          return {
            write: function() {},
            end: function() {}
          };
        };
      };

      var fileUpload = new FileUploadApi(fakeAuthenticationProvider, new FakeHttpTransport());
      fileUpload.notifyUploadComplete('correlationId', testUploadResult, function() {});
    });

    it('builds a valid set of headers and x509 authentication for the HTTP request', function() {
      var testUploadResult = { isSuccess: true, statusCode: 200, statusDescription: 'Success' };

      var fakeX509Creds = { deviceId: 'id', host: 'host', x509: { cert: 'cert', key: 'key' }};
      var fakeX509AuthProvider = {
        getDeviceCredentials: function (callback) { callback(null, fakeX509Creds); }
      };

      var FakeHttpTransport = function() {
        this.buildRequest = function (method, path, headers, host, auth) {
          assert.equal(headers.Host, fakeX509Creds.host);
          assert.isUndefined(headers.Authorization);
          assert.equal(headers['Content-Type'], 'application/json; charset=utf-8');
          assert.equal(headers['Content-Length'], JSON.stringify(testUploadResult).length);
          assert.equal(headers['iothub-name'], fakeCredentials.host.split('.')[0]);
          assert.equal(auth, fakeX509Creds.x509);

          return {
            write: function() {},
            end: function() {}
          };
        };
      };

      var fileUpload = new FileUploadApi(fakeX509AuthProvider, new FakeHttpTransport());
      fileUpload.notifyUploadComplete('correlationId', testUploadResult, function() {});
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_015: [** The `POST` HTTP request shall have the following body:
    ```
    {
      isSuccess: <true/false>,
      statusCode: <upload status code from the blob upload>,
      statusDescription: <string describing the status code>
    }
    ```]*/
    it('builds a valid body for the HTTP request', function() {
      var testUploadResult = { isSuccess: true, statusCode: 200, statusDescription: 'Success' };

      var FakeHttpTransport = function() {
        this.buildRequest = function () {
          return {
            write: function(body) {
              assert.equal(body, JSON.stringify(testUploadResult));
            },
            end: function() {}
          };
        };
      };

      var fileUpload = new FileUploadApi(fakeAuthenticationProvider, new FakeHttpTransport());
      fileUpload.notifyUploadComplete('correlationId', testUploadResult, function() {});
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_016: [`notifyUploadComplete` shall call the `done` callback with an `Error` object if the request fails.]*/
    it('calls the done callback with an error if the request fails', function (done) {
      var FailingTransport = function() {
        this.buildRequest = function(method, path, headers, hostname, x509auth, callback) {
          return {
            write: function() {},
            end: function() {
              callback(new Error('fake failure'));
            }
          };
        };
      };

      var fileUpload = new FileUploadApi(fakeAuthenticationProvider, new FailingTransport());
      fileUpload.notifyUploadComplete('correlationId', { isSuccess: true, statusCode: 200, statusDescription: 'Success' }, function (err) {
        assert.instanceOf(err, Error);
        done();
      });
    });

    /*Tests_SRS_NODE_FILE_UPLOAD_ENDPOINT_16_017: [`notifyUploadComplete` shall call the `done` callback with no parameters if the request succeeds.]*/
    it('calls the done callback with no parameters if the request succeeds', function (done) {
      var FakeHttpTransport = function() {
        this.buildRequest = function(method, path, headers, hostname, x509auth, callback) {
          return {
            write: function() {},
            end: function() {
              callback();
            }
          };
        };
      };

      var fileUpload = new FileUploadApi(fakeAuthenticationProvider, new FakeHttpTransport());
      fileUpload.notifyUploadComplete('correlationId', { isSuccess: true, statusCode: 200, statusDescription: 'Success' }, done);
    });
  });
});