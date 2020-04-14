// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const ModelRepositoryCredentials = require('azure-iot-digitaltwins-model-repository').ModelRepositoryCredentials;
const ModelRepositoryServiceClient = require('azure-iot-digitaltwins-model-repository').ModelRepositoryServiceClient;

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
// - get a Digital Twin Model from the Model Repository
// - update the local copy of the model Model
// - update the Model in the Model Repository using the eTag of the Model
async function main() {
  // Azure IoT Model repository connection string has to be set to system environment variable AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING

  const modelRepositoryCredentials = new ModelRepositoryCredentials(process.env.AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING);
  const modelRepositoryServiceClient = new ModelRepositoryServiceClient(modelRepositoryCredentials);
  const modelId = 'dtmi:xxx:yyy;1';

  try {
    const modelDocument = await modelRepositoryServiceClient.getModel(modelId);
    const eTag = modelDocument.eTag;

    modelDocument.contents.push( {
      '@type': 'Property',
      'name': 'aNewProperty',
      'writable': false,
      'schema': 'string'
    },);

    // The "options" argument is optional, see the description of the values below
    options = {
      // {string} Private repository id. To access global repository, caller should not specify this value.
      'repositoryId': modelRepositoryCredentials.getRepositoryId(),
      // {string} Provides a client-generated opaque value that is recorded in the logs.
      // Using this header is highly recommended for correlating client-side activities
      // with requests received by the server.
      'xMsClientRequestId': '',
    };

    const updateModelResponse = await modelRepositoryServiceClient.updateModel(modelDocument, eTag, options);
    console.log(JSON.stringify(updateModelResponse, replacer, 2));
  } catch (err) {
    console.error(err.toString());
    console.error('StatusCode: ', err.statusCode.toString());
  }
}

main();
