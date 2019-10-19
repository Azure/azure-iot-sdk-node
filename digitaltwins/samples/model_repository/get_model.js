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

async function main() {
  const modelRepositoryCredentials = new ModelRepositoryCredentials(process.env.AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING);
  const modelRepositoryServiceClient = new ModelRepositoryServiceClient(modelRepositoryCredentials);
  const modelId = 'urn:azureiot:ModelDiscovery:ModelInformation:1';

  try {
    const getModelResponse = await modelRepositoryServiceClient.getModel(modelId);
    console.log(JSON.stringify(getModelResponse, replacer, 2));
  } catch (err) {
    console.error(err.toString());
    console.error('StatusCode: ', err.statusCode.toString());
  }
}

main();
