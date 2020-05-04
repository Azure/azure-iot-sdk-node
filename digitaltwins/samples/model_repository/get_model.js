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
// - delete a Digital Twin Model from the Model Repository
async function main() {
  // Azure IoT Model repository connection string has to be set to system environment variable AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING

  const modelRepositoryCredentials = new ModelRepositoryCredentials(process.env.AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING);
  const modelRepositoryServiceClient = new ModelRepositoryServiceClient(modelRepositoryCredentials);
  const modelId = 'dtmi:azureiot:ModelDiscovery:ModelInformation;1';

  try {
    // The "options" argument is optional, see the description of the values below
    options = {
      // {string} Private repository id. To access global repository, caller should not specify this value.
      'repositoryId': modelRepositoryCredentials.getRepositoryId(),
      // {string} Provides a client-generated opaque value that is recorded in the logs.
      // Using this header is highly recommended for correlating client-side activities
      // with requests received by the server.
      'xMsClientRequestId': '',
      // {boolean} Indicates whether to expand the capability
      // model's interface definitions inline or not. This query parameter ONLY
      // applies to Model ID. Default value: false .
      'expand': false,
    };

    const getModelResponse = await modelRepositoryServiceClient.getModel(modelId, options);
    console.log(JSON.stringify(getModelResponse, replacer, 2));
  } catch (err) {
    console.error(err.toString());
    console.error('StatusCode: ', err.statusCode.toString());
  }
}

main();
