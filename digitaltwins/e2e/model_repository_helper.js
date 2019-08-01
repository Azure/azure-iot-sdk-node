
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const DigitalTwinRepositoryService = require('azure-iot-digitaltwins-model-repository').DigitalTwinRepositoryService;
const ModelRepositoryCredentials = require('./model_repository_credentials').ModelRepositoryCredentials;
const modelRepositoryApiVersion = '2019-07-01-Preview';
const privateRepositoryConnectionString = process.env.AZURE_IOT_PRIVATE_MODEL_REPOSITORY_CONNECTION_STRING;

module.exports.createModel = function (modelDocument) {
  const creds = new ModelRepositoryCredentials(privateRepositoryConnectionString);
  const modelRepositoryClient = new DigitalTwinRepositoryService(creds, {
    baseUri: creds.getBaseUri(),
    deserializationContentTypes: { // application/ld+json isn't supported by autorest by default, which is why we need these options
      json: [
        'application/ld+json',
        'application/json',
        'text/json'
      ]
    }
  });

  return modelRepositoryClient.createOrUpdateModel(modelDocument['@id'], modelRepositoryApiVersion, modelDocument, {
    repositoryId: creds.getRepositoryId()
  });
};
