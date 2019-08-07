// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
const ModelRepoClient = require('azure-iot-digitaltwins-model-repository').DigitalTwinRepositoryService;
const AuthorizationHeader = require('@azure/ms-rest-js').Constants.HeaderConstants.AUTHORIZATION;
const crypto = require('crypto');
const ConnectionString = require('azure-iot-common').ConnectionString;

const apiVersion = '2019-07-01-Preview';

class SimpleTokenCredentials {
  constructor(connectionString) {
    this._connectionString = ConnectionString.parse(connectionString, ['HostName', 'RepositoryId', 'SharedAccessKey', 'SharedAccessKeyName']);
  }

  getBaseUri() {
    if (this._connectionString.HostName.startsWith('https://')) {
      return this._connectionString.HostName;
    } else {
      return 'https://' + this._connectionString.HostName;
    }
  }

  signRequest(webResource) {
    // SAS Token format: SharedAccessSignature sr=URLENCODED(<Hostname>)&sig=URLENCODED(<Signature>)&se=<ExpiresOnValue>&skn=URLENCODED(<KeyName>)&rid=URLENCODED(<repositoryId>)
    const expiry = Math.floor(new Date() / 1000) + 1200; // 20 minutes
    const stringToSign = `${this._connectionString.RepositoryId}\n${encodeURIComponent(this._connectionString.HostName)}\n${expiry}`.toLowerCase();
    const signature = crypto.createHmac('sha256', Buffer.from(this._connectionString.SharedAccessKey, 'base64')).update(stringToSign).digest('base64');
    const modelRepoSas = `SharedAccessSignature sr=${encodeURIComponent(this._connectionString.HostName)}&sig=${encodeURIComponent(signature)}&se=${encodeURIComponent(expiry)}&skn=${encodeURIComponent(this._connectionString.SharedAccessKeyName)}&rid=${encodeURIComponent(this._connectionString.RepositoryId)}`;

    webResource.headers.set(AuthorizationHeader, modelRepoSas);
    return Promise.resolve(webResource);
  }
}

async function main() {
  const creds = new SimpleTokenCredentials(process.env.AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING);

  const modelRepoClient = new ModelRepoClient(creds, {
    baseUri: creds.getBaseUri(),
    deserializationContentTypes: { // application/ld+json isn't supported by autorest by default, which is why we need these options
      json: [
        'application/ld+json',
        'application/json',
        'text/json'
      ]
    }
  });

  try {
    const models = await modelRepoClient.searchModel({ searchKeyword: 'ModelDiscovery', modelFilterType: 'interface' }, apiVersion);
    console.log(JSON.stringify(models.results, null, 2));

    const modelDiscovery = await modelRepoClient.getModel('urn:azureiot:ModelDiscovery:ModelInformation:1', apiVersion);
    console.log(JSON.stringify(modelDiscovery, null, 2));
  } catch (err) {
    console.error(err.toString());
  }
}

main();
