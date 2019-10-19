// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
const assert = require('chai').assert;
const debug = require('debug')('digitaltwinse2e:crud');
const uuid = require('uuid');
const ModelRepositoryServiceClient = require('azure-iot-digitaltwins-model-repository').ModelRepositoryServiceClient;
const ModelRepositoryCredentials = require('azure-iot-digitaltwins-model-repository').ModelRepositoryCredentials;
const interfaceDocument = require('./dtdl/test_interface');

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
  let modelRepositoryServiceClient; let creds;

  before(function () {
    creds = new ModelRepositoryCredentials(privateRepositoryConnectionString);
    modelRepositoryServiceClient = new ModelRepositoryServiceClient(creds, {
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

  it('can get an existing model from the repository', function () {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    const modelInformationUrn = 'urn:azureiot:ModelDiscovery:ModelInformation:1';
    debug('getting model: ' + modelInformationUrn);
    return modelRepositoryServiceClient.getModel(modelInformationUrn)
      .then((getResponse) => {
        debug('got a model');
        assert.strictEqual(getResponse['@id'], modelInformationUrn);
        assert.isTrue(getResponse.contents.length > 0);
        return Promise.resolve();
      })
      .catch((err) => {
        debug('error getting ' + modelInformationUrn + ': ' + err.toString());
        return Promise.reject(err);
      });
  });

  it('can create, search, update and delete a model (use specified options)', function () {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    let createdEtag;
    const testInterfaceDocument = createUniqueDocument();
    const clientSource = 'node_sdk_cl_e2e_tests';
    debug('creating model: ' + testInterfaceDocument['@id']);
    return modelRepositoryServiceClient.createModel(testInterfaceDocument, {
      'x-ms-client-source': clientSource,
      'repositoryId': creds.getRepositoryId(),
      'xMsClientRequestId': uuid.v4()
    }).then((createResponse) => {
      debug('model creation succeeded');
      assert.isNotNull(createResponse.eTag);
      assert.isNotNull(createResponse.xMsRequestId);
      createdEtag = createResponse.eTag;
      debug('getting model: ' + testInterfaceDocument['@id']);
      const searchOptions = {
        searchKeyword: testInterfaceDocument['@id'],
        modelFilterType: 'interface'
      };
      return modelRepositoryServiceClient.searchModel(searchOptions, {
        'x-ms-client-source': clientSource,
        'repositoryId': creds.getRepositoryId(),
        'xMsClientRequestId': uuid.v4()
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
      return modelRepositoryServiceClient.updateModel(testInterfaceDocument, createdEtag, {
        'x-ms-client-source': clientSource,
        'repositoryId': creds.getRepositoryId(),
        'xMsClientRequestId': uuid.v4(),
        'ifMatch': createdEtag
      });
    }).then((updateResponse) => {
      debug('model updated.');
      assert.isString(updateResponse.xMsRequestId);
      debug('getting the model...');
      return modelRepositoryServiceClient.getModel(testInterfaceDocument['@id'], {
        'x-ms-client-source': clientSource,
        'xMsClientRequestId': uuid.v4(),
        'repositoryId': creds.getRepositoryId()
      });
    }).then((getResponse) => {
      debug('got the model back');
      assert.strictEqual(getResponse['@id'], testInterfaceDocument['@id']);
      return modelRepositoryServiceClient.deleteModel(testInterfaceDocument['@id'], {
        'x-ms-client-source': clientSource,
        'xMsClientRequestId': uuid.v4()
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

  it('can create, search, update, get and delete a model (use default options)', function () {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    let createdEtag;
    const testInterfaceDocument = createUniqueDocument();
    debug('creating model: ' + testInterfaceDocument['@id']);
    return modelRepositoryServiceClient.createModel(testInterfaceDocument
    ).then((createResponse) => {
      debug('model creation succeeded');
      assert.isNotNull(createResponse.eTag);
      assert.isNotNull(createResponse.xMsRequestId);
      createdEtag = createResponse.eTag;
      debug('getting model: ' + testInterfaceDocument['@id']);
      const searchOptions = {
        searchKeyword: testInterfaceDocument['@id'],
        modelFilterType: 'interface'
      };
      return modelRepositoryServiceClient.searchModel(searchOptions);
    }).then((searchResponse) => {
      debug('got results');
      testInterfaceDocument.contents.push(
        {
          '@type': 'Property',
          'name': 'aNewProperty',
          'writable': false,
          'schema': 'string'
        },);
      return modelRepositoryServiceClient.updateModel(testInterfaceDocument, createdEtag);
    }).then((updateResponse) => {
      debug('model updated');
      assert.isString(updateResponse.xMsRequestId);
      debug('getting the model...');
      return modelRepositoryServiceClient.getModel(testInterfaceDocument['@id']);
    }).then((getResponse) => {
      debug('got the model back');
      assert.strictEqual(getResponse['@id'], testInterfaceDocument['@id']);
      return modelRepositoryServiceClient.deleteModel(testInterfaceDocument['@id']);
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
