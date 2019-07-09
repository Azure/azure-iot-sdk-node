/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
import { ServiceClientCredentials, WebResource, Constants } from '@azure/ms-rest-js';
import { ConnectionString, SharedAccessSignature, anHourFromNow } from 'azure-iot-common';

/**
 * Creates shared access signatures based on the connection string passed to the constructor.
 * This class is used by the protocol layer of the SDK to add authentication headers to each request.
 */
export class IoTHubTokenCredentials implements ServiceClientCredentials {
  private _connectionString: ConnectionString;

  constructor(connectionString: string) {
    this._connectionString = ConnectionString.parse(connectionString, ['HostName', 'SharedAccessKeyName', 'SharedAccessKey']);
  }

  /**
   * Adds an authorization header to the request object.
   * @param webResource The request object that needs its authorization header populated
   */
  signRequest(webResource: WebResource): Promise<WebResource> {
    const sas = SharedAccessSignature.create(this._connectionString.HostName as string, this._connectionString.SharedAccessKeyName as string, this._connectionString.SharedAccessKey as string, anHourFromNow()).toString();
    webResource.headers.set(Constants.HeaderConstants.AUTHORIZATION, sas);
    return Promise.resolve(webResource);
  }

  /**
   * Gets the Azure IoT Hub instance name from the connection string
   */
  getHubName(): string {
    return this._connectionString.HostName as string;
  }
}
