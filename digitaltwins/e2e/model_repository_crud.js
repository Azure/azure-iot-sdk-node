// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
const assert = require('chai').assert;
const debug = require('debug')('digitaltwinse2e:crud');
const uuid = require('uuid');
const DigitalTwinRepositoryService = require('azure-iot-digitaltwins-model-repository').DigitalTwinRepositoryService;
const ModelRepositoryCredentials = require('./model_repository_credentials').ModelRepositoryCredentials;
const interfaceDocument = require('./dtdl/test_interface');

const apiVersion = '2019-07-01-Preview';
const privateRepositoryConnectionString = process.env.AZURE_IOT_PRIVATE_MODEL_REPOSITORY_CONNECTION_STRING;

function createUniqueDocument() {
  const testInterfaceDocument = JSON.parse(JSON.stringify(interfaceDocument));
  const idParts = testInterfaceDocument['@id'].split(':');
  const uniqueId = uuid.v4().split('-')[0];
  idParts.splice(idParts.length - 1, 0, uniqueId);
  testInterfaceDocument['@id'] = idParts.join(':');
  debug('created unique test model with id: ' + testInterfaceDocument['@id']);
  return testInterfaceDocument;
}

describe('Private Model Repository CRUD operations', function () {
  let modelRepositoryClient; let creds;

  before(function () {
    creds = new ModelRepositoryCredentials(privateRepositoryConnectionString);
    modelRepositoryClient = new DigitalTwinRepositoryService(creds, {
      baseUri: creds.getBaseUri(),
      deserializationContentTypes: { // application/ld+json isn't supported by autorest by default, which is why we need these options
        json: [
          'application/ld+json',
          'application/json',
          'text/json'
        ]
      }
    });
  });

  it('can get an existing model from a private repository', function () {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    const modelInformationUrn = 'urn:azureiot:ModelDiscovery:ModelInformation:1';
    debug('getting model: ' + modelInformationUrn);
    return modelRepositoryClient.getModel(modelInformationUrn, apiVersion, {
      repositoryId: creds.getRepositoryId()
    })
      .then((getResponse) => {
        debug('got a model');
        assert.strictEqual(getResponse.xMsModelId, modelInformationUrn);
        assert.strictEqual(getResponse.body['@id'], modelInformationUrn);
        return Promise.resolve();
      })
      .catch((err) => {
        debug('error getting ' + modelInformationUrn + ': ' + err.toString());
        return Promise.reject(err);
      });
  });

  it('can create, get and delete a model in a private repository', function () {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    let createdEtag;
    const testInterfaceDocument = createUniqueDocument();
    debug('creating model: ' + testInterfaceDocument['@id']);
    return modelRepositoryClient.createOrUpdateMetamodel(testInterfaceDocument['@id'], apiVersion, testInterfaceDocument, {
      repositoryId: creds.getRepositoryId(),
      xMsClientRequestId: uuid.v4(),
      'x-ms-client-source': 'nodesdke2etests'
    }).then((createResponse) => {
      debug('model creation succeeded');
      assert.isNotNull(createResponse.eTag);
      assert.isNotNull(createResponse.xMsRequestId);
      createdEtag = createResponse.eTag;
      debug('getting model: ' + testInterfaceDocument['@id']);
      return modelRepositoryClient.getModel(testInterfaceDocument['@id'], apiVersion, {
        repositoryId: creds.getRepositoryId(),
        xMsClientRequestId: uuid.v4(),
        'x-ms-client-source': 'nodesdke2etests'
      });
    }).then((getResponse) => {
      debug('got a model');
      assert.strictEqual(getResponse.eTag, createdEtag);
      assert.strictEqual(getResponse.xMsModelId, testInterfaceDocument['@id']);
      debug('deleting model...');
      return modelRepositoryClient.deleteMetamodel(testInterfaceDocument['@id'], creds.getRepositoryId(), apiVersion, {
        xMsClientRequestId: uuid.v4(),
        'x-ms-client-source': 'nodesdke2etests'
      });
    }).then((deleteResponse) => {
      debug('model deleted');
      assert.isNotNull(deleteResponse.xMsRequestId);
      return Promise.resolve();
    }).catch((err) => {
      debug(err.toString());
      return Promise.reject(err);
    });
  });

  it('can create, search, update then delete an existing model in a private repository', function () {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    let createdEtag;
    const testInterfaceDocument = createUniqueDocument();
    debug('creating model: ' + testInterfaceDocument['@id']);
    return modelRepositoryClient.createOrUpdateMetamodel(testInterfaceDocument['@id'], apiVersion, testInterfaceDocument, {
      repositoryId: creds.getRepositoryId(),
      xMsClientRequestId: uuid.v4(),
      'x-ms-client-source': 'nodesdke2etests'
    }).then((createResponse) => {
      debug('model creation succeeded');
      assert.isNotNull(createResponse.eTag);
      assert.isNotNull(createResponse.xMsRequestId);
      createdEtag = createResponse.eTag;
      debug('searching model: ' + testInterfaceDocument['@id']);
      const searchOptions = {
        searchKeyword: testInterfaceDocument['@id'],
        modelFilterType: 'interface'
      };
      return modelRepositoryClient.search(searchOptions, apiVersion, {
        repositoryId: creds.getRepositoryId(),
        xMsClientRequestId: uuid.v4(),
        'x-ms-client-source': 'nodesdke2etests'
      });
    }).then((searchResponse) => {
      debug('got results');
      testInterfaceDocument.contents.push(
        {
          '@type': 'Property',
          'name': 'aNewProperty',
          'writable': false,
          'schema': 'string'
        },);
      return modelRepositoryClient.createOrUpdateMetamodel(testInterfaceDocument['@id'], apiVersion, testInterfaceDocument, {
        repositoryId: creds.getRepositoryId(),
        ifMatch: createdEtag,
        xMsClientRequestId: uuid.v4(),
        'x-ms-client-source': 'nodesdke2etests'
      });
    }).then((updateResponse) => {
      debug('model updated.');
      assert.isString(updateResponse.xMsRequestId);
      debug('deleting model...');
      return modelRepositoryClient.deleteMetamodel(testInterfaceDocument['@id'], creds.getRepositoryId(), apiVersion, {
        xMsClientRequestId: uuid.v4(),
        'x-ms-client-source': 'nodesdke2etests'});
    }).then((deleteResponse) => {
      debug('model deleted');
      assert.isNotNull(deleteResponse.xMsRequestId);
      return Promise.resolve();
    }).catch((err) => {
      debug(err.toString());
      return Promise.reject(err);
    });
  });
});

describe('Global Model Repository CRUD operations', function () {
  let modelRepositoryClient;
  before(function () {
    const creds = new ModelRepositoryCredentials(privateRepositoryConnectionString);
    modelRepositoryClient = new DigitalTwinRepositoryService(creds, {
      baseUri: creds.getBaseUri(),
      deserializationContentTypes: { // application/ld+json isn't supported by autorest by default, which is why we need these options
        json: [
          'application/ld+json',
          'application/json',
          'text/json'
        ]
      }
    });
  });

  it('can get a model from the global repository', function () {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    const modelInformationUrn = 'urn:azureiot:ModelDiscovery:ModelInformation:1';
    debug('getting model: ' + modelInformationUrn);
    return modelRepositoryClient.getModel(modelInformationUrn, apiVersion, {
      xMsClientRequestId: uuid.v4(),
      'x-ms-client-source': 'nodesdke2etests'
    })
      .then((getResponse) => {
        debug('got a model');
        assert.strictEqual(getResponse.xMsModelId, modelInformationUrn);
        assert.strictEqual(getResponse.body['@id'], modelInformationUrn);
        return Promise.resolve();
      })
      .catch((err) => {
        debug('error getting ' + modelInformationUrn + ': ' + err.toString());
        return Promise.reject(err);
      });
  });

  it.skip('can publish a model to the global repository', () => {

  });

  it.skip('cannot delete a model from the global repository', () => {

  });
});
