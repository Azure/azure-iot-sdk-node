// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const ModelRepositoryCredentials = require('azure-iot-digitaltwins-model-repository').ModelRepositoryCredentials;
const ModelRepositoryServiceClient = require('azure-iot-digitaltwins-model-repository').ModelRepositoryServiceClient;
const uuid = require('uuid');

function createInterfaceDocument() {
  interfaceSample = {
    '@id': 'dtmi:microsoft:azureiot:node_sdk:sample;1',
    '@type': 'Interface',
    'displayName': 'Azure IoT Node Service Client Library Sample',
    'contents': [
      {
        '@type': 'Telemetry',
        'name': 'telemetry',
        'schema': 'double'
      },
      {
        '@type': 'Property',
        'name': 'readOnlyProperty',
        'writable': false,
        'schema': 'string'
      },
      {
        '@type': 'Property',
        'name': 'writableProperty',
        'writable': true,
        'schema': 'string'
      },
      {
        '@type': 'Command',
        'name': 'syncCommand',
        'commandType': 'synchronous',
        'request': {
          'name': 'requestProperty',
          'schema': 'string'
        },
        'response': {
          'name': 'responseProperty',
          'schema': 'string'
        }
      },
      {
        '@type': 'Command',
        'name': 'asyncCommand',
        'commandType': 'asynchronous',
        'request': {
          'name': 'requestProperty',
          'schema': 'string'
        },
        'response': {
          'name': 'responseProperty',
          'schema': 'string'
        }
      }
    ],
    '@context': 'http://azureiot.com/v1/contexts/IoTModel.json'
  };
  return interfaceSample;
}

function createUniqueDocument() {
  const testInterfaceDocument = JSON.parse(JSON.stringify(createInterfaceDocument()));
  const idParts = testInterfaceDocument['@id'].split(':');
  const uniqueId = uuid.v4().split('-')[0];
  idParts.splice(idParts.length - 1, 0, uniqueId);
  testInterfaceDocument['@id'] = idParts.join(':');
  return testInterfaceDocument;
}

function replacer(key, value) {
  if (key == '_response') {
    return undefined;
  } else {
    return value;
  }
}

// Simple example of how to:
// - create a Model Repository Service Client
// - authenticate Service Client with Model Repository
// - create a Digital Twin Model in the Model Repository (global or private)
// - create a Digital Twin Model from scratch
async function main() {
  // Azure IoT Model repository connection string has to be set to system environment variable AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING

  const modelRepositoryCredentials = new ModelRepositoryCredentials(process.env.AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING);
  const modelRepositoryServiceClient = new ModelRepositoryServiceClient(modelRepositoryCredentials);

  try {
    const testInterfaceDocument = createUniqueDocument();
    console.log('New interface ID: ' + testInterfaceDocument['@id']);

    // The "options" argument is optional, see the description of the values below
    options = {
      // {string} Private repository id. To access global repository, caller should not specify this value.
      'repositoryId': modelRepositoryCredentials.getRepositoryId(),
      // {string} Provides a client-generated opaque value that is recorded in the logs.
      // Using this header is highly recommended for correlating client-side activities
      // with requests received by the server.
      'xMsClientRequestId': '',
    };

    const createModelResponse = await modelRepositoryServiceClient.createModel(testInterfaceDocument, options);
    console.log(JSON.stringify(createModelResponse, replacer, 2));
  } catch (err) {
    console.error(err.toString());
    console.error('StatusCode: ', err.statusCode.toString());
  }
}

main();
