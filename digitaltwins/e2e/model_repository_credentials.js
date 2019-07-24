// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const AuthorizationHeader = require('@azure/ms-rest-js').Constants.HeaderConstants.AUTHORIZATION;
const crypto = require('crypto');
const ConnectionString = require('azure-iot-common').ConnectionString;

class ModelRepositoryCredentials {
  constructor(connectionString) {
    this._connectionString = ConnectionString.parse(connectionString, ['HostName', 'SharedAccessKeyName', 'SharedAccessKey', 'RepositoryId']);
  }

  signRequest(webResource) {
    webResource.headers.set(AuthorizationHeader, this._generateToken());
    return Promise.resolve(webResource);
  }

  getBaseUri() {
    return `https://${this._connectionString.HostName}`;
  }

  getRepositoryId() {
    return this._connectionString.RepositoryId;
  }
  _generateToken() {
    const expiry = Math.floor(new Date() / 1000) + 1200; // 20 minutes from now
    const stringToSign = `${this._connectionString.RepositoryId}\n${this._connectionString.HostName}\n${expiry}`;
    const signature = crypto.createHmac(
      'sha256',
      Buffer.from(this._connectionString.SharedAccessKey, 'base64'))
      .update(stringToSign)
      .digest('base64');
    return `SharedAccessSignature sr=${encodeURIComponent(this._connectionString.HostName)}&sig=${encodeURIComponent(signature)}&se=${encodeURIComponent(expiry)}&skn=${encodeURIComponent(this._connectionString.SharedAccessKeyName)}&rid=${encodeURIComponent(this._connectionString.RepositoryId)}`;
  }
}

module.exports.ModelRepositoryCredentials = ModelRepositoryCredentials;
