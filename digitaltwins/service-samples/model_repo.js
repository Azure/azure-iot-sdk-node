// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
const ModelRepoClient = require('azure-iot-digitaltwin-model-repository').DigitalTwinRepositoryService;
const AuthorizationHeader = require('@azure/ms-rest-js').Constants.HeaderConstants.AUTHORIZATION;
const crypto = require('crypto');

const repositoryId = process.env.AZURE_IOT_MODEL_REPO_ID;
const keyId = process.env.AZURE_IOT_MODEL_REPO_KEY_ID;
const key = process.env.AZURE_IOT_MODEL_REPO_KEY_SECRET;
const resource = process.env.AZURE_IOT_MODEL_REPO_HOSTNAME;
const apiVersion = '2019-07-01-Preview';

class SimpleTokenCredentials {
  constructor(token) {
    this._token = token;
  }

  signRequest(webResource) {
    webResource.headers.set(AuthorizationHeader, this._token);
    return Promise.resolve(webResource);
  }
}

async function main() {
  // SAS Token format: SharedAccessSignature sr=URLENCODED(<Hostname>)&sig=URLENCODED(<Signature>)&se=<ExpiresOnValue>&skn=URLENCODED(<KeyName>)&rid=URLENCODED(<repositoryId>)
  const expiry = Math.floor(new Date() / 1000) + 1200; // 20 minutes
  const stringToSign = `${repositoryId}\n${resource}\n${expiry}`;
  const signature = crypto.createHmac('sha256', Buffer.from(key, 'base64')).update(stringToSign).digest('base64');
  const modelRepoSas = `SharedAccessSignature sr=${encodeURIComponent(resource)}&sig=${encodeURIComponent(signature)}&se=${encodeURIComponent(expiry)}&skn=${encodeURIComponent(keyId)}&rid=${encodeURIComponent(repositoryId)}`;

  const creds = new SimpleTokenCredentials(modelRepoSas);

  const modelRepoClient = new ModelRepoClient(creds, {
    baseUri: 'https://' + resource,
    deserializationContentTypes: {// application/ld+json isn't supported by autorest by default, which is why we need these options
      json: [
        'application/ld+json',
        'application/json',
        'text/json'
      ]
    }
  });

  const models = await modelRepoClient.search({searchKeyword: 'ModelDiscovery', modelFilterType: 'interface'}, apiVersion);
  console.log(JSON.stringify(models.results, null, 2));

  const modelDiscovery = await modelRepoClient.getModel('urn:azureiot:ModelDiscovery:ModelInformation:1', apiVersion);
  console.log(JSON.stringify(modelDiscovery, null, 2));
}

main();
