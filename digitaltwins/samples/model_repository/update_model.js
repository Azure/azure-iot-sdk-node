// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const ModelRepositoryCredentials = require('azure-iot-digitaltwins-model-repository').ModelRepositoryCredentials;
const ModelRepositoryServiceClient = require('azure-iot-digitaltwins-model-repository').ModelRepositoryServiceClient;
const uuid = require('uuid');

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
  const modelId = 'urn:xxx:yyy:1';

  try {
    const modelDocument = await modelRepositoryServiceClient.getModel(modelId);
    const eTag = modelDocument.eTag;

    modelDocument.contents.push(
    {
      '@type': 'Property',
      'name': 'aNewProperty',
      'writable': false,
      'schema': 'string'
    },);

    const updateModelResponse = await modelRepositoryServiceClient.updateModel(modelDocument, eTag);
    console.log(JSON.stringify(updateModelResponse, replacer, 2));
  } catch (err) {
    console.error(err.toString());
    console.error('StatusCode: ', err.statusCode.toString());
  }
}

main();
