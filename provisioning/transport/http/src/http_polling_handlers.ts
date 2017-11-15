// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { RestApiClient, Http as Base } from 'azure-iot-http-base';
import { SharedAccessSignature } from 'azure-iot-common';
import { PollingTransportHandlers, ProvisioningDeviceConstants, ProvisioningAuthentication, ProvisioningTransportOptions } from 'azure-iot-provisioning-device';
import * as dbg from 'debug';
const debug = dbg('azure-device-provisioning:transport-http');

const _defaultHeaders = {
  'Accept' : 'application/json',
  'Content-Type' : 'application/json; charset=utf-8'
};

export class HttpPollingHandlers implements PollingTransportHandlers {
  private _restApiClient: RestApiClient;
  private _httpBase: Base;
  private _idScope: number;
  private _config: ProvisioningTransportOptions = {};

  /* Codes_SRS_NODE_PROVISIONING_HTTP_18_001: [ The `Http` constructor shall accept the following properties:
  - `idScope` - the ID Scope value for the provisioning service
  - `httpBase` - an optional test implementation of azure-iot-http-base ] */
  constructor(idScope: number, httpBase?: Base) {
    this._idScope = idScope;
    this._httpBase = httpBase || new Base();
    this._config.pollingInterval = ProvisioningDeviceConstants.defaultPollingInterval;
    this._config.timeoutInterval = ProvisioningDeviceConstants.defaultTimeoutInterval;
    this._config.provisioningHost = ProvisioningDeviceConstants.defaultProvisioningHost;
  }

  endSession(callback: (err?: Error) => void): void {
   // nothing to do here
   callback();
  }

  setTransportOptions(options: ProvisioningTransportOptions): void {
    [
      'pollingInterval',
      'provisioningHost',
      'timeoutInterval'
    ].forEach((optionName) => {
      if (options.hasOwnProperty(optionName)) {
        this._config[optionName] = options[optionName];
      }
    });
  }

  registrationRequest(registrationId: string, authorization: ProvisioningAuthentication, requestBody: any, forceRegistration: boolean, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void {

    if ((authorization instanceof SharedAccessSignature) || (typeof authorization === 'string')) {
      this._restApiClient = new RestApiClient({ 'host' : this._config.provisioningHost , 'sharedAccessSignature' : authorization},  ProvisioningDeviceConstants.userAgent, this._httpBase);
    } else {
      this._restApiClient = new RestApiClient({ 'host' : this._config.provisioningHost , 'x509' : authorization}, ProvisioningDeviceConstants.userAgent, this._httpBase);
    }

    /* update Codes_SRS_NODE_PROVISIONING_HTTP_18_009: [ `register` shall PUT the registration request to 'https://global.azure-devices-provisioning.net/{idScope}/registrations/{registrationId}/register' ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_005: [ The registration request shall include the current `api-version` as a URL query string value named 'api-version'. ] */
    let path: string = '/' + this._idScope + '/registrations/' + registrationId + '/register?api-version=' + ProvisioningDeviceConstants.apiVersion;

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_008: [ If `forceRegistration` is specified, the registration request shall include this as a query string value named 'forceRegistration' ] */
    if (forceRegistration) {
      path += '&forceRegistration=true';
    }

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_006: [ The registration request shall specify the following in the Http header:
      Accept: application/json
      Content-Type: application/json; charset=utf-8 ] */
    let httpHeaders = JSON.parse(JSON.stringify(_defaultHeaders));

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_007: [ If an `authorization` string is specifed, it shall be URL encoded and included in the Http Authorization header. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_011: [ If the registration request times out, `register` shall call the `callback` with the lower level error] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_012: [ If the registration response contains a body, `register` shall deserialize this into an object. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_013: [ If registration response body fails to deserialize, `register` will throw an `SyntaxError` error. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_014: [ If the registration response has a failed status code, `register` shall use `translateError` to translate this to a common error object and pass this into the `callback` function along with the deserialized body of the response. ] */
    debug('submitting PUT for ' + registrationId + ' to ' + path);
    debug(JSON.stringify(requestBody));
    this._restApiClient.executeApiCall('PUT', path, httpHeaders, requestBody, this._config.timeoutInterval, (err: Error, responseBody?: any, result?: any) => {
      if (err) {
        debug('error executing PUT: ' + err.toString());
        callback(err);
      } else {
        debug('PUT response received:');
        debug(JSON.stringify(responseBody));
        callback(null, responseBody, result, this._config.pollingInterval);
      }
    });

  }

  queryOperationStatus(registrationId: string, operationId: string, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void {
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_022: [ operation status request polling shall be a GET operation sent to 'https://global.azure-devices-provisioning.net/{idScope}/registrations/{registrationId}/operations/{operationId}' ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_037: [ The operation status request shall include the current `api-version` as a URL query string value named 'api-version'. ] */
    let path: string = '/' + this._idScope + '/registrations/' + registrationId + '/operations/' + operationId + '?api-version=' + ProvisioningDeviceConstants.apiVersion;

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_020: [ The operation status request shall have the following in the Http header:
      Accept: application/json
      Content-Type: application/json; charset=utf-8 ] */
    let httpHeaders = JSON.parse(JSON.stringify(_defaultHeaders));

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_021: [ If an `authorization` string is specifed, it shall be URL encoded and included in the Http Authorization header of the operation status request. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_023: [ If the operation status request times out, `register` shall stop polling and call the `callback` with with the lower level error ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_024: [ `register` shall deserialize the body of the operation status response into an object. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_025: [ If the body of the operation status response fails to deserialize, `register` will throw a `SyntaxError` error. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_026: [ If the operation status response contains a failure status code, `register` shall stop polling and call the `callback` with an error created using `translateError`. ] */
    debug('submitting status GET for ' + registrationId + ' to ' + path);
    this._restApiClient.executeApiCall('GET', path, httpHeaders, {}, this._config.timeoutInterval, (err: Error, responseBody?: any, result?: any) => {
      if (err) {
        debug('error executing GET: ' + err.toString());
        callback(err, null);
      } else {
        debug('GET response received:');
        debug(JSON.stringify(responseBody));
        callback(null, responseBody, result, this._config.pollingInterval);
      }
    });
  }

  getErrorResult(result: any): any {
    return new Error();
  }

}
// The following are legacy requirements.  The used to be handled by http.ts, but they've been moved into transport_state_machine.ts.
// We're keeping these here mostly for the Http tests, which now overlap with the TransportStateMachine tests, but we're keeping
// the tests here for the extra test coverage.

/* Codes_SRS_NODE_PROVISIONING_HTTP_18_016: [ If the registration response has a success code with a 'status' of 'Assigning', `register` shall fire an `operationStatus` event with the deserialized body ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_017: [ If the registration response has a success code with a 'status' of 'Assigning', `register` shall start polling for operation updates ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_015: [ If the registration response has a success code with a 'status' of 'Assigned', `register` call the `callback` with `err` == `null` and result `containing` the deserialized body ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_029: [ If the registration response has a success code with a 'status' that is any other value', `register` shall call the callback with a `SyntaxError` error. ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_036: [ `register` shall call the `callback` with an `InvalidOperationError` if it is called while a previous registration is in progress. ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_018: [ `register` shall poll for operation status every `operationStatusPollingInterval` milliseconds ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_036: [ `register` shall call the `callback` with an `InvalidOperationError` if it is called while a previous registration is in progress. ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_028: [ If the operation status response contains a success status code with a 'status' that is 'Assigning', `register` shall fire an `operationStatus` event with the deserialized body and continue polling. ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_027: [ If the operation status response contains a success status code with a 'status' of 'Assigned', `register` shall stop polling and call the `callback` with `err` == null and the body containing the deserialized body. ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_030: [ If the operation status response has a success code with a 'status' that is any other value, `register` shall call the callback with a `SyntaxError` error and stop polling. ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_036: [ `register` shall call the `callback` with an `InvalidOperationError` if it is called while a previous registration is in progress. ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_035: [ disconnect will cause polling to cease ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_031: [ If `disconnect` is called while the registration request is in progress, `register` shall call the `callback` with an `OperationCancelledError` error. ] */
/* Codes_SRS_NODE_PROVISIONING_HTTP_18_033: [ If `disconnect` is called while the register is waiting between polls, `register` shall call the `callback` with an `OperationCancelledError` error. ] */




