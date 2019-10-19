/* eslint-disable no-var */
// /*
//  * Copyright (c) Microsoft Corporation. All rights reserved.
//  * Licensed under the MIT License. See License.txt in the project root for
//  * license information.
//  */

var assert = require('chai').assert;
var sinon = require('sinon');
var ModelRepositoryCredentials = require('../dist/auth/model_repository_credentials').ModelRepositoryCredentials;

describe('ModelRepositoryCredentials', function () {
  describe('getBaseUri', function () {
    it('returns the Azure IoT Model Repository base URI contained in the connection string', function () {
      var testHostName = 'host.name';
      var testRepositoryId = 'repository_id'
      var testConnectionString = 'HostName=' + testHostName + ';RepositoryId=' + testRepositoryId + ';SharedAccessKeyName=service;SharedAccessKey=' + Buffer.from('testkey').toString('base64');
      var expectedBaseUri = 'https://host.name';
      var testCreds = new ModelRepositoryCredentials(testConnectionString);
      assert.strictEqual(testCreds.getBaseUri(), expectedBaseUri);
    });
  });

  describe('getRepositoryId', function () {
    it('returns the Azure IoT Model Repository ID contained in the connection string', function () {
      var testHostName = 'host.name';
      var testRepositoryId = 'repository_id'
      var testConnectionString = 'HostName=' + testHostName + ';RepositoryId=' + testRepositoryId + ';SharedAccessKeyName=service;SharedAccessKey=' + Buffer.from('testkey').toString('base64');
      var testCreds = new ModelRepositoryCredentials(testConnectionString);
      assert.strictEqual(testCreds.getRepositoryId(), testRepositoryId);
    });
  });

  describe('signRequest', function () {
    it('adds a shared access signature in the authorization header', function (testCallback) {
      var testHostName = 'host.name';
      var testRepositoryId = 'repository_id'
      var testConnectionString = 'HostName=' + testHostName + ';RepositoryId=' + testRepositoryId + ';SharedAccessKeyName=service;SharedAccessKey=' + Buffer.from('testkey').toString('base64');
      var testCreds = new ModelRepositoryCredentials(testConnectionString);
      var testRequest = {
        headers: {
          set: sinon.stub().callsFake(function (headerName, headerContent) {
            assert.strictEqual(headerName, 'authorization');
            assert.include(headerContent, 'SharedAccessSignature');
            assert.include(headerContent, 'sr=');
            assert.include(headerContent, 'se=');
            assert.include(headerContent, 'sig=');
          })
        }
      };

      testCreds.signRequest(testRequest).then(function (updatedRequest) {
        assert.strictEqual(updatedRequest, testRequest); // verify it's the same object
        testCallback();
      });
    });
  });
});
