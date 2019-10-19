// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { ConnectionString } from 'azure-iot-common';
import { WebResource, Constants } from '@azure/ms-rest-js';
import * as crypto from 'crypto';

export class ModelRepositoryCredentials {
  repositoryId: string | undefined;
  private _connectionString: ConnectionString;

  constructor(connectionString: string) {
    this._connectionString = ConnectionString.parse(connectionString, ['HostName', 'RepositoryId', 'SharedAccessKey', 'SharedAccessKeyName']);
  }

  getBaseUri(): string {
      if (this._connectionString.HostName) {
          if (this._connectionString.HostName.startsWith('https://')) {
              return this._connectionString.HostName;
            } else {
              return 'https://' + this._connectionString.HostName;
            }
      } else {
          return '';
      }
  }

  getRepositoryId(): string {
    if (this._connectionString.RepositoryId) {
      return this._connectionString.RepositoryId;
    } else {
      return '';
    }
  }

  signRequest(webResource: WebResource): Promise<WebResource> {
    // SAS Token format: SharedAccessSignature sr=URLENCODED(<Hostname>)&sig=URLENCODED(<Signature>)&se=<ExpiresOnValue>&skn=URLENCODED(<KeyName>)&rid=URLENCODED(<repositoryId>)
    if ((this._connectionString.HostName) && (this._connectionString.RepositoryId) && (this._connectionString.SharedAccessKey) && (this._connectionString.SharedAccessKeyName)) {
      const expiry = Math.floor(new Date().valueOf() / 1000) + 1200; // 20 minutes
      const stringToSign = `${this._connectionString.RepositoryId}\n${encodeURIComponent(this._connectionString.HostName)}\n${expiry}`.toLowerCase();
      const signature = crypto.createHmac('sha256', Buffer.from(this._connectionString.SharedAccessKey, 'base64')).update(stringToSign).digest('base64');
      const modelRepoSas = `SharedAccessSignature sr=${encodeURIComponent(this._connectionString.HostName)}&sig=${encodeURIComponent(signature)}&se=${encodeURIComponent(expiry)}&skn=${encodeURIComponent(this._connectionString.SharedAccessKeyName)}&rid=${encodeURIComponent(this._connectionString.RepositoryId)}`;
      webResource.headers.set(Constants.HeaderConstants.AUTHORIZATION, modelRepoSas);
  }
    return Promise.resolve(webResource);
  }
}
