/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { IotHubGatewayServiceAPIs20190701Preview as PLClient, IotHubGatewayServiceAPIs20190701PreviewModels as Models } from '../pl/iotHubGatewayServiceAPIs20190701Preview';
import { callbackToPromise, Callback } from 'azure-iot-common';
import { IoTHubTokenCredentials } from '../auth/iothub_token_credentials';

export class DigitalTwinServiceClient {
  private _creds: IoTHubTokenCredentials;
  private _pl: PLClient;
  private _apiVersion: string = '2019-07-01-preview';

  constructor(creds: IoTHubTokenCredentials) {
    this._creds = creds;
    this._pl = new PLClient(this._creds, {
      baseUri: 'https://' + this._creds.getHubName(),
      apiVersion: this._apiVersion
    });
  }

  getDigitalTwin(digitalTwinId: string): Promise<Models.DigitalTwinGetInterfacesResponse>;
  getDigitalTwin(digitalTwinId: string, callback: Callback<Models.DigitalTwinGetInterfacesResponse>): void;
  getDigitalTwin(digitalTwinId: string, callback?: Callback<Models.DigitalTwinGetInterfacesResponse>): void | Promise<Models.DigitalTwinGetInterfacesResponse> {
    return callbackToPromise((_callback) => this._pl.digitalTwin.getInterfaces(digitalTwinId, _callback), callback);
  }
}
