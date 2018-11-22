// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { AuthenticationProvider, encodeUriComponentStrict, callbackToPromise } from 'azure-iot-common';
import { MethodParams, MethodCallback, MethodResult } from '.';
import { RestApiClient } from 'azure-iot-http-base';
import { getUserAgentString } from '../utils';
import * as _ from 'lodash';

/**
 * @private
 */
export class MethodClient {
  private _authProvider: AuthenticationProvider;
  private _restApiClient: RestApiClient;
  private _options: any;
  private _httpHeaders: { [key: string]: string };

  constructor(authProvider: AuthenticationProvider) {
    this._authProvider = authProvider;
    this._options = {};
    this._httpHeaders = {
      'Content-Type': 'application/json'
    };
  }

  invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams, callback: MethodCallback): void;
  invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams): Promise<MethodResult>;
  invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams, callback?: MethodCallback): Promise<MethodResult> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_006: [The `invokeMethod` method shall get the latest credentials by calling `getDeviceCredentials` on the `AuthenticationProvider` object.]*/
      /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_007: [The `invokeMethod` method shall create a `RestApiClient` object if it does not exist.]*/
      this._init((err) => {
        if (err) {
          /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_008: [The `invokeMethod` method shall call its callback with an `Error` if it fails to get the latest credentials from the `AuthenticationProvider` object.]*/
          _callback(err);
        } else {
          /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_009: [The `invokeMethod` method shall call the `setOptions` method on the `RestApiClient` with its options as argument to make sure the CA certificate is populated.]*/
          this._restApiClient.setOptions(this._options);
          /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_010: [The `invokeMethod` method shall construct the HTTP request path as `/twins/encodeUriComponentStrict(<targetDeviceId>)/methods` if the target is a device.]*/
          let path = `/twins/${encodeUriComponentStrict(deviceId)}`;
          /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_011: [The `invokeMethod` method shall construct the HTTP request path as `/twins/encodeUriComponentStrict(<targetDeviceId>)/modules/encodeUriComponentStrict(<targetModuleId>)/methods` if the target is a module.]*/
          if (moduleId) {
            path += `/modules/${encodeUriComponentStrict(moduleId)}`;
          }
          path += '/methods';

          /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_012: [The `invokeMethod` method shall call `RestApiClient.executeApiCall` with:
            - `POST` for the HTTP method argument.
            - `path` as defined in `SRS_NODE_DEVICE_METHOD_CLIENT_16_010` and `SRS_NODE_DEVICE_METHOD_CLIENT_16_011`
            - 2 custom headers:
              - `Content-Type` shall be set to `application/json`
              - `x-ms-edge-moduleId` shall be set to `<deviceId>/<moduleId>` with `deviceId` and `moduleId` being the identifiers for the current module (as opposed to the target module)
            - the stringified version of the `MethodParams` object as the body of the request
            - a timeout value in milliseconds that is the sum of the `connectTimeoutInSeconds` and `responseTimeoutInSeconds` parameters of the `MethodParams` object.]*/
          const body = JSON.stringify(methodParams);
          const methodTimeout = 1000 * (methodParams.connectTimeoutInSeconds + methodParams.responseTimeoutInSeconds);
          this._restApiClient.executeApiCall('POST', path, this._httpHeaders, body, methodTimeout, (err, result) => {
            if (err) {
              /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_013: [The `invokeMethod` method shall call its callback with an error if `RestApiClient.executeApiCall` fails.]*/
              _callback(err);
            } else {
              /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_014: [The `invokeMethod` method shall call its callback with the result object if the call to `RestApiClient.executeApiCall` succeeds.]*/
              _callback(null, result as MethodResult);
            }
          });
        }
      });
    }, callback);
  }

  setOptions(options: any): void {
    /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_001: [The `setOptions` method shall merge the options passed in argument with the existing set of options used by the `MethodClient`.]*/
    this._options = _.merge(this._options, options);
  }

  private _init(callback: (err?: Error) => void): void {
    this._authProvider.getDeviceCredentials((err, creds) => {
      if (err) {
        callback(err);
      } else {
        this._httpHeaders['x-ms-edge-moduleId'] = creds.deviceId + '/' + creds.moduleId;

        if (this._restApiClient) {
          /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_015: [The `invokeMethod` method shall update the shared access signature of the `RestApiClient` by using its `updateSharedAccessSignature` method and the credentials obtained with the call to `getDeviceCredentials` (see `SRS_NODE_DEVICE_METHOD_CLIENT_16_006`).]*/
          this._restApiClient.updateSharedAccessSignature(creds.sharedAccessSignature);
          callback();
        } else {
          getUserAgentString((userAgentString) => {
            const transportConfig: RestApiClient.TransportConfig = {
              host: creds.gatewayHostName,
              sharedAccessSignature: creds.sharedAccessSignature
            };

            this._restApiClient = new RestApiClient(transportConfig, userAgentString);
            callback();
          });
        }
      }
    });
  }
}
