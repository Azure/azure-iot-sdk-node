// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const ModelRepositoryCredentials = require('azure-iot-digitaltwins-model-repository').ModelRepositoryCredentials;
const ModelRepositoryServiceClient = require('azure-iot-digitaltwins-model-repository').ModelRepositoryServiceClient;

// Simple example of how to:
// - create a Model Repository Service Client
// - authenticate Service Client with Model Repository
// - search for Digital Twin Models in the Model Repository
// - use search keywords and filters
async function main() {
  // Azure IoT Model repository connection string has to be set to system environment variable AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING

  const modelRepositoryCredentials = new ModelRepositoryCredentials(process.env.AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING);
  const modelRepositoryServiceClient = new ModelRepositoryServiceClient(modelRepositoryCredentials);

  try {
    // The "options" argument is optional, see the description of the values below
    options = {
      // {string} Private repository id. To access global repository, caller should not specify this value.
      'repositoryId': modelRepositoryCredentials.getRepositoryId(),
      // {string} Provides a client-generated opaque value that is recorded in the logs.
      // Using this header is highly recommended for correlating client-side activities
      // with requests received by the server.
      'xMsClientRequestId': '',
    };

    const searchModelResponse = await modelRepositoryServiceClient.searchModel({ searchKeyword: '', modelFilterType: 'Interface' }, options);
    console.log(JSON.stringify(searchModelResponse.results, null, 2));
  } catch (err) {
    console.error(err.toString());
    console.error('StatusCode: ', err.statusCode.toString());
  }
}

main();
