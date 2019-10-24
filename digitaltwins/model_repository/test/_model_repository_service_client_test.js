/* eslint-disable no-var */
// /*
//  * Copyright (c) Microsoft Corporation. All rights reserved.
//  * Licensed under the MIT License. See License.txt in the project root for
//  * license information.
//  */

var assert = require('chai').assert;
var sinon = require('sinon');
var ModelRepositoryServiceClient = require('../dist/cl/model_repository_service_client').ModelRepositoryServiceClient;

var testCredentials = {
  signRequest: sinon.stub().callsFake(function (webResource) {
    return Promise.resolve(webResource);
  }),
  getBaseUri: sinon.stub().returns('https://host.name'),
  getRepositoryId: sinon.stub().returns('repository_id')
};

describe('ModelRepositoryServiceClient', function () {
  describe('constructor', function () {
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_001: [ The `ModelRepositoryServiceClient` creates an instance of the ModelRepositoryServiceClient passing ModelRepositoryCredentials class as an argument. ]*/
    it(`Constructor creates an instance of the ModelRepositoryServiceClient`, function (testCallback) {
      var modelRepositoryServiceClient = new ModelRepositoryServiceClient(testCredentials);
      assert.instanceOf(modelRepositoryServiceClient, ModelRepositoryServiceClient);
      testCallback();
    });
  });

  describe('getModel', function () {
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_002: [ The `getModel` method shall call the `getModel` method of the protocol layer with the given arguments. ]*/
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_003: [ The `getModel` method shall call the callback with an error parameter if a callback is passed. ]*/
    it('getModel calls the getModel method on the PL client', function (testCallback) {
      var testModelId = 'urn:domain:discovery:iInformation:1';
      var testModel = {
        contents: [
          { '@type': 'Telemetry'}
        ],
        response: undefined
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.getModel = sinon.stub().callsArgWith(2, null, testModel);
      testClient.getModel(testModelId, function (err, result, response) {
        assert.isTrue(testClient._pl.getModel.calledWith(testModelId, sinon.match.any, sinon.match.any));
        assert.isNull(err);
        assert.deepEqual(result.contents, testModel.contents);
        assert.deepEqual(result.response, testModel.response);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_004: [ The `getModel` method shall return error if the method of the protocol layer failed. ]*/
    it('getModel calls its callback with an error if the PL client fails', function (testCallback) {
      var testModelId = 'urn:domain:discovery:iInformation:1';
      var testError = new Error('fake error');
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.getModel = sinon.stub().callsArgWith(2, testError);
      testClient.getModel(testModelId, function (err) {
        assert.isTrue(testClient._pl.getModel.calledWith(testModelId));
        assert.strictEqual(err, testError);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_005: [ The `getModel` method shall return a promise if there is no callback passed. ]*/
    it('getModel shall return a promise if there is no callback passed', async () => {
      var testModelId = 'urn:domain:discovery:iInformation:1';
      var testApiVersion = 'API_version';
      var testOptions = {
        'x-ms-client-source': 'testClient',
        'xMsClientRequestId': 'testRequestId',
        'repositoryId': 'testRepositoryId'
      };
      var testModel = {
        contents: [
          { '@type': 'Telemetry'}
        ],
        response: undefined
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.getModel = sinon.stub().callsArgWith(3, null, testModel, testApiVersion, testOptions);
      const returnedPromise = await testClient.getModel(testModelId, testOptions);
      assert.deepEqual(returnedPromise.contents, testModel.contents);
      assert.deepEqual(returnedPromise.response, testModel.response);
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_005: [ The `getModel` method shall return a promise if there is no callback passed. ]*/
    it('getModel shall return a promise if there is no callback passed without options argument', async () => {
      var testModelId = 'urn:domain:discovery:iInformation:1';
      var testApiVersion = 'API_version';
      var testModel = {
        contents: [
          { '@type': 'Telemetry'}
        ],
        response: undefined
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.getModel = sinon.stub().callsArgWith(3, null, testModel, testApiVersion, {});
      const returnedPromise = await testClient.getModel(testModelId);
      assert.deepEqual(returnedPromise.contents, testModel.contents);
      assert.deepEqual(returnedPromise.response, testModel.response);
    });
  });

  describe('searchModel', function () {
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_006: [ The `searchModel` method shall call the `searchModel` method of the protocol layer with the given arguments. ]*/
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_007: [ The `searchModel` method shall call the callback with an error parameter if a callback is passed. ]*/
    it('searchModel calls the searchModel method on the PL client', function (testCallback) {
      var testSearchOptions = {
        modelFilterType: 'Interface',
        searchKeyword: 'ModelDiscovery'
      };
      var testSearchParams = {
        'repositoryId': '',
        'xMsClientRequestId': '',
      };
      var plSearchResponse = {
        'testResponseField': 'testResponseValue',
        'parsedHeaders': {
          'xMsRequestId': 'testXMsRequestId',
        },
      };
      var plSearchResult = {
        'continuationToken': 'testContinuationToken',
        'results': [ 'testValue1', 'testValue2' ]
      };
      var clSearchResponse = {
        '_response': plSearchResponse,
        'xMsRequestId': 'testXMsRequestId',
        'continuationToken': 'testContinuationToken',
        'results': plSearchResult.results
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.searchModel = sinon.stub().callsArgWith(3, null, plSearchResult, null, plSearchResponse);
      testClient.searchModel(testSearchOptions, testSearchParams, function (err, result) {
        assert.isTrue(testClient._pl.searchModel.calledWith(testSearchOptions, sinon.match.any, testSearchParams, sinon.match.any));
        assert.isNull(err);
        assert.deepEqual(result, clSearchResponse);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_008: [ The `searchModel` method shall return error if the method of the protocol layer failed. ]*/
    it('searchModel calls its callback with an error if the PL client fails', function (testCallback) {
      var testSearchOptions = {
        modelFilterType: 'Interface',
        searchKeyword: 'ModelDiscovery'
      };
      var testError = new Error('fake error');
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.searchModel = sinon.stub().callsArgWith(2, testError);
      testClient.searchModel(testSearchOptions, function (err) {
        assert.isTrue(testClient._pl.searchModel.calledWith(testSearchOptions));
        assert.strictEqual(err, testError);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_009: [ The `searchModel` method shall return a promise if there is no callback passed. ]*/
    it('searchModel shall return a promise if there is no callback passed', async () => {
      var testSearchOptions = {
        modelFilterType: 'Interface',
        searchKeyword: 'ModelDiscovery'
      };
      var testOptions = {
        'x-ms-client-source': 'testClient',
        'xMsClientRequestId': 'testRequestId',
        'repositoryId': 'testRepositoryId'
      };
      var plSearchResponse = {
        'testResponseField': 'testResponseValue',
        'parsedHeaders': {
          'xMsRequestId': 'testXMsRequestId',
        },
      };
      var plSearchResult = {
        'continuationToken': 'testContinuationToken',
        'results': [ 'testValue1', 'testValue2' ]
      };
      var clSearchResponse = {
        '_response': plSearchResponse,
        'xMsRequestId': 'testXMsRequestId',
        'continuationToken': 'testContinuationToken',
        'results': plSearchResult.results
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.searchModel = sinon.stub().callsArgWith(3, null, plSearchResult, null, plSearchResponse);
      const returnedPromise = await testClient.searchModel(testSearchOptions, testOptions);
      assert.deepEqual(returnedPromise, clSearchResponse);
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_024: [ The `searchModel` method shall return a promise if there is no options argument passed. ]*/
    it('searchModel shall return a promise if there is no options argument passed', async () => {
      var testSearchOptions = {
        modelFilterType: 'Interface',
        searchKeyword: 'ModelDiscovery'
      };
      var plSearchResponse = {
        'testResponseField': 'testResponseValue',
        'parsedHeaders': {
          'xMsRequestId': 'testXMsRequestId',
        },
      };
      var plSearchResult = {
        'continuationToken': 'testContinuationToken',
        'results': [ 'testValue1', 'testValue2' ]
      };
      var clSearchResponse = {
        '_response': plSearchResponse,
        'xMsRequestId': 'testXMsRequestId',
        'continuationToken': 'testContinuationToken',
        'results': plSearchResult.results
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.searchModel = sinon.stub().callsArgWith(3, null, plSearchResult, null, plSearchResponse);
      const returnedPromise = await testClient.searchModel(testSearchOptions);
      assert.deepEqual(returnedPromise, clSearchResponse);
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_025: [ The `searchModel` method shall return a promise if there if no parsedHeaders in the response. ]*/
    it('searchModel shall return a promise if there if no parsedHeaders in the response', async () => {
      var testSearchOptions = {
        modelFilterType: 'Interface',
        searchKeyword: 'ModelDiscovery'
      };
      var plSearchResponse = {
        'testResponseField': 'testResponseValue',
      };
      var plSearchResult = {
        'continuationToken': 'testContinuationToken',
        'results': [ 'testValue1', 'testValue2' ]
      };
      var clSearchResponse = {
        '_response': plSearchResponse,
        'xMsRequestId': undefined,
        'continuationToken': 'testContinuationToken',
        'results': plSearchResult.results
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.searchModel = sinon.stub().callsArgWith(3, null, plSearchResult, null, plSearchResponse);
      const returnedPromise = await testClient.searchModel(testSearchOptions);
      assert.deepEqual(returnedPromise, clSearchResponse);
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_026: [ The `searchModel` method shall return a promise if the result and response are null or undefined. ]*/
    it('searchModel shall return a promise if the result and response are null or undefined', async () => {
      var testSearchOptions = {
        modelFilterType: 'Interface',
        searchKeyword: 'ModelDiscovery'
      };
      var clSearchResponse = {
        '_response': null,
        'xMsRequestId': undefined,
        'continuationToken': undefined,
        'results': undefined
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.searchModel = sinon.stub().callsArgWith(3, null, null, null, null);
      const returnedPromise = await testClient.searchModel(testSearchOptions);
      assert.deepEqual(returnedPromise, clSearchResponse);
    });
  });

  describe('createModel', function () {
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_010: [ The `createModel` method shall call the `createModel` method of the protocol layer with the given arguments. ]*/
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_011: [ The `createModel` method shall call the callback with an error parameter if a callback is passed. ]*/
    it('createModel calls the createOrUpdateModel method on the PL client', function (testCallback) {
      var testModel = {
        id: 'urn:test:unit:1',
        type: 'interface',
        displayName: 'testName',
        contents: []
      };
      var plCreateResponse = [
        {
          'xMsRequestId': 'testXMsRequestId',
          'eTag': 'testETag'
        }
      ];
      var clCreateResponse = {
        '_response': plCreateResponse,
        'xMsRequestId': plCreateResponse.xMsClientRequestId,
        'eTag': plCreateResponse.eTag
      };
      options = {
        'repositoryId': 'testRepositoryId',
        'xMsClientRequestId': 'testXMsClientRequestId'
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.createOrUpdateModel = sinon.stub().callsArgWith(4, null, null, null, plCreateResponse);
      testClient.createModel(testModel, options, function (err, result, response) {
        assert.isTrue(testClient._pl.createOrUpdateModel.calledWith(testModel['@id'], sinon.match.any, testModel, options));
        assert.isNull(err);
        assert.deepEqual(result, clCreateResponse);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_012: [ The `createModel` method shall return error if the method of the protocol layer failed. ]*/
    it('createModel calls its callback with an error if the PL client fails', function (testCallback) {
      var testModel = {
        id: 'urn:test:unit:1',
        type: 'interface',
        displayName: 'testName',
        contents: []
      };
      var testError = new Error('fake error');
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.createOrUpdateModel = sinon.stub().callsArgWith(3, testError);
      testClient.createModel(testModel, function (err) {
        assert.strictEqual(err, testError);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_013: [ The `createModel` method shall return a promise if there is no callback passed. ]*/
    it('createModel shall return a promise if there is no callback passed', async () => {
      var testModel = {
        id: 'urn:test:unit:1',
        type: 'interface',
        displayName: 'testName',
        contents: []
      };
      var testCreateResponse = {
        'parsedHeaders': {
          'xMsRequestId': 'testXMsRequestId',
          'eTag': 'testETag'
        },
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.createOrUpdateModel = sinon.stub().callsArgWith(4, null, null, null, testCreateResponse);
      const returnedPromise = await testClient.createModel(testModel);
      assert.deepEqual(returnedPromise._response, testCreateResponse);
      assert.deepEqual(returnedPromise.xMsRequestId, testCreateResponse.parsedHeaders.xMsRequestId);
      assert.deepEqual(returnedPromise.eTag, testCreateResponse.parsedHeaders.eTag);
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_027: [ The `createModel` method shall return a promise if the result and response are null or undefined. ]*/
    it('createModel shall return a promise if the result and response are null or undefined', async () => {
      var testModel = {
        id: 'urn:test:unit:1',
        type: 'interface',
        displayName: 'testName',
        contents: []
      };
      var clCreateResponse = {
        '_response': null,
        'xMsRequestId': undefined,
        'eTag': undefined
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.createOrUpdateModel = sinon.stub().callsArgWith(4, null, null, null, null);
      const returnedPromise = await testClient.createModel(testModel);
      assert.deepEqual(returnedPromise, clCreateResponse);
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_022: [ The `createModel` method shall throw ArgumentError if 'ifMatch' (eTag) is specified in 'options' argument. ]*/
    it('createModel shall throw exception if eTag (ifMatch) is specified in options argument', async () => {
      var testModel = {
        id: 'urn:test:unit:1',
        type: 'interface',
        displayName: 'testName',
        contents: []
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      options = {
        'ifMatch': 'testETag'
      };
      try {
        await testClient.createModel(testModel, options);
      } catch (e) {
        assert.equal(e.name, 'ArgumentError');
        assert.equal(e.message, 'IfMatch (eTag) should not be specified in createModel API!');
      }
    });
  });

  describe('updateModel', function () {
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_014: [ The `updateModel` method shall call the `createOrUpdateModel` method of the protocol layer with the given arguments. ]*/
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_015: [ The `updateModel` method shall call the callback with an error parameter if a callback is passed. ]*/
    it('updateModel calls the createOrUpdateModel method on the PL client', function (testCallback) {
      var testModel = {
        id: 'urn:test:unit:1',
        type: 'interface',
        displayName: 'testName',
        contents: []
      };
      var testETag = 'testETag';
      var plCreateResponse = [
        {
          'xMsRequestId': 'testXMsRequestId',
          'eTag': 'testETag'
        }
      ];
      var clCreateResponse = {
        '_response': plCreateResponse,
        'xMsRequestId': plCreateResponse.xMsClientRequestId,
        'eTag': plCreateResponse.eTag
      };
      options = {
        'repositoryId': 'testRepositoryId',
        'x-ms-client-source': 'testClientSource',
        'xMsClientRequestId': 'testXMsClientRequestId',
        'ifMatch': 'testETag',
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.createOrUpdateModel = sinon.stub().callsArgWith(4, null, null, null, plCreateResponse);
      testClient.updateModel(testModel, testETag, options, function (err, result, response) {
        assert.isTrue(testClient._pl.createOrUpdateModel.calledWith(testModel['@id'], sinon.match.any, testModel, options));
        assert.isNull(err);
        assert.deepEqual(result, clCreateResponse);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_016: [ The `updateModel` method shall return error if the method of the protocol layer failed. ]*/
    it('updateModel calls its callback with an error if the PL client fails', function (testCallback) {
      var testModel = {
        id: 'urn:test:unit:1',
        type: 'interface',
        displayName: 'testName',
        contents: []
      };
      var testETag = 'testETag';
      var testError = new Error('fake error');
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.createOrUpdateModel = sinon.stub().callsArgWith(3, testError);
      testClient.updateModel(testModel, testETag, function (err) {
        assert.strictEqual(err, testError);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_017: [ The `updateModel` method shall return a promise if there is no callback passed. ]*/
    it('updateModel shall return a promise if there is no callback passed', async () => {
      var testModel = {
        id: 'urn:test:unit:1',
        type: 'interface',
        displayName: 'testName',
        contents: []
      };
      var testETag = 'testETag';
      var testCreateResponse = {
        'parsedHeaders': {
          'xMsRequestId': 'testXMsRequestId',
          'eTag': 'testETag'
        },
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.createOrUpdateModel = sinon.stub().callsArgWith(4, null, null, null, testCreateResponse);
      const returnedPromise = await testClient.updateModel(testModel, testETag);
      assert.deepEqual(returnedPromise._response, testCreateResponse);
      assert.deepEqual(returnedPromise.xMsRequestId, testCreateResponse.parsedHeaders.xMsRequestId);
      assert.deepEqual(returnedPromise.eTag, testCreateResponse.parsedHeaders.eTag);
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_023: [ The `updateModel` method shall use the 'eTag' argument's value even if user specified the 'ifMatch' in the 'options' argument. ]*/
    it('updateModel shall use the eTag value regardless of ifMatch in the options', function (testCallback) {
      var testModel = {
        id: 'urn:test:unit:1',
        type: 'interface',
        displayName: 'testName',
        contents: []
      };
      var testETag = 'testETag';
      var plCreateResponse = [
        {
          'xMsRequestId': 'testXMsRequestId',
          'eTag': 'testETag'
        }
      ];
      wrongOptions = {
        'ifMatch': 'wrongETag',
      };
      goodOptions = {
        'ifMatch': testETag,
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.createOrUpdateModel = sinon.stub().callsArgWith(4, null, null, null, plCreateResponse);
      testClient.updateModel(testModel, testETag, wrongOptions, function (err, result, response) {
        assert.isTrue(testClient._pl.createOrUpdateModel.calledWith(testModel['@id'], sinon.match.any, testModel, goodOptions));
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_028: [ The `updateModel` method shall return a promise if the result and response are null or undefined. ]*/
    it('updateModel shall return a promise if the result and response are null or undefined', async () => {
      var testModel = {
        id: 'urn:test:unit:1',
        type: 'interface',
        displayName: 'testName',
        contents: []
      };
      var testETag = 'testETag';
      var clUpdateResponse = {
        '_response': null,
        'xMsRequestId': undefined,
        'eTag': undefined
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.createOrUpdateModel = sinon.stub().callsArgWith(4, null, null, null, null);
      const returnedPromise = await testClient.updateModel(testModel, testETag);
      assert.deepEqual(returnedPromise, clUpdateResponse);
    });
  });

  describe('deleteModel', function () {
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_018: [ The `deleteModel` method shall call the `deleteModel` method of the protocol layer with the given arguments. ]*/
    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_019: [ The `deleteModel` method shall call the callback with an error parameter if a callback is passed. ]*/
    it('deleteModel calls the deleteModel method on the PL client', function (testCallback) {
      var testModelId = 'urn:test:unit:1';
      var plDeleteResponse = {
        'parsedHeaders': {
          'xMsRequestId': 'testXMsRequestId'
        }
      };
      var clDeleteResponse = {
        '_response': plDeleteResponse,
        'xMsRequestId': plDeleteResponse.parsedHeaders.xMsRequestId
      };
      var options = {
        'x-ms-client-source': 'testClientSource',
        'xMsClientRequestId': 'testxMsClientRequestId'
      };

      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.deleteModel = sinon.stub().callsArgWith(4, null, null, null, plDeleteResponse);
      testClient.deleteModel(testModelId, options, function (err, result) {
        assert.isTrue(testClient._pl.deleteModel.calledWith(testModelId, sinon.match.any, sinon.match.any, sinon.match.any));
        assert.isNull(err);
        assert.deepEqual(result, clDeleteResponse);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_020: [ The `deleteModel` method shall return error if the method of the protocol layer failed. ]*/
    it('deleteModel calls its callback with an error if the PL client fails', function (testCallback) {
      var testModelId = 'urn:test:unit:1';
      var testError = new Error('fake error');
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.deleteModel = sinon.stub().callsArgWith(3, testError);
      testClient.deleteModel(testModelId, function (err) {
        assert.strictEqual(err, testError);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_021: [ The `deleteModel` method shall return a promise if there is no callback passed. ]*/
    it('deleteModel shall return a promise if there is no callback passed', async () => {
      var testModelId = 'urn:test:unit:1';
      var plDeleteResponse = {
        'parsedHeaders': {
          'xMsRequestId': 'testXMsRequestId'
        }
      };
      var clDeleteResponse = {
        '_response': plDeleteResponse,
        'xMsRequestId': plDeleteResponse.parsedHeaders.xMsRequestId
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.deleteModel = sinon.stub().callsArgWith(4, null, null, null, plDeleteResponse);
      const returnedPromise = await testClient.deleteModel(testModelId);
      assert.deepEqual(returnedPromise, clDeleteResponse);
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_029: [ The `deleteModel` method shall return a promise if there if no parsedHeaders in the response. ]*/
    it('deleteModel shall return a promise if there if no parsedHeaders in the response', async () => {
      var testModelId = 'urn:test:unit:1';
      var plDeleteResponse = {
        'parsedHeaders': null
      };
      var clDeleteResponse = {
        '_response': {
          'parsedHeaders': null
        },
        'xMsRequestId': undefined
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.deleteModel = sinon.stub().callsArgWith(4, null, null, null, plDeleteResponse);
      const returnedPromise = await testClient.deleteModel(testModelId);
      assert.deepEqual(returnedPromise, clDeleteResponse);
    });

    /* Tests_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_030: [ The `deleteModel` method shall return a promise if the result and response are null or undefined. ]*/
    it('deleteModel shall return a promise if the result and response are null or undefined', async () => {
      var testModelId = 'urn:test:unit:1';
      var clDeleteResponse = {
        '_response': null,
        'xMsRequestId': undefined
      };
      var testClient = new ModelRepositoryServiceClient(testCredentials);
      testClient._pl.deleteModel = sinon.stub().callsArgWith(4, null, null, null, null);
      const returnedPromise = await testClient.deleteModel(testModelId);
      assert.deepEqual(returnedPromise, clDeleteResponse);
    });
  });
});
