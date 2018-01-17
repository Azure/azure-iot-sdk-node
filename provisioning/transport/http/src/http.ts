// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { RestApiClient, Http as Base } from 'azure-iot-http-base';
import { X509 } from 'azure-iot-common';
import { X509ProvisioningTransport } from 'azure-iot-provisioning-device';
import { RegistrationRequest, DeviceRegistrationResult } from 'azure-iot-provisioning-device';
import { ProvisioningDeviceConstants, ProvisioningTransportOptions } from 'azure-iot-provisioning-device';
import { translateError } from 'azure-iot-provisioning-device';
import * as dbg from 'debug';
const debug = dbg('azure-iot-provisioning-device-http:Http');

const _defaultHeaders = {
  'Accept' : 'application/json',
  'Content-Type' : 'application/json; charset=utf-8'
};

/**
 * Transport used to provision a device over HTTP.
 */
export class Http extends EventEmitter implements X509ProvisioningTransport {
  private _restApiClient: RestApiClient;
  private _httpBase: Base;
  private _config: ProvisioningTransportOptions = {};
  private _auth: X509;

  /**
   * @private
   */
  /* Codes_SRS_NODE_PROVISIONING_HTTP_18_001: [ The `Http` constructor shall accept the following properties:
  - `httpBase` - an optional test implementation of azure-iot-http-base ] */
  constructor(httpBase?: Base) {
    super();
    this._httpBase = httpBase || new Base();
    this._config.pollingInterval = ProvisioningDeviceConstants.defaultPollingInterval;
  }

  setAuthentication(auth: X509): void {
    this._auth = auth;
  }

  /**
   * @private
   *
   */
  setTransportOptions(options: ProvisioningTransportOptions): void {
    [
      'pollingInterval'
    ].forEach((optionName) => {
      if (options.hasOwnProperty(optionName)) {
        this._config[optionName] = options[optionName];
      }
    });
  }

  /**
   * private
   */
  cancel(callback: (err?: Error) => void): void {
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_041: [ `cancel` shall immediately call `callback` passing null. ] */
    callback();
  }

  disconnect(callback: (err?: Error) => void): void {
    // nothing to do
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_040: [ `disconnect` shall immediately call `callback` passing null. ] */
    callback();
  }

  /**
   * private
   */
  registrationRequest(request: RegistrationRequest, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void {

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_007: [ If an X509 cert if provided, `registrationRequest` shall include it in the Http authorization header. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_021: [ If an X509 cert if provided, `queryOperationStatus` shall include it in the Http authorization header. ] */
    this._restApiClient = new RestApiClient({ 'host' : request.provisioningHost , 'x509' : this._auth}, ProvisioningDeviceConstants.userAgent, this._httpBase);

    let requestBody: any = { registrationId : request.registrationId };

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_005: [ `registrationRequest` shall include the current `api-version` as a URL query string value named 'api-version'. ] */
    let path: string = '/' + request.idScope + '/registrations/' + request.registrationId + '/register?api-version=' + ProvisioningDeviceConstants.apiVersion;

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_008: [ If `forceRegistration` is specified, `registrationRequest` shall include this as a query string value named 'forceRegistration' ] */
    if (request.forceRegistration) {
      path += '&forceRegistration=true';
    }

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_006: [ `registrationRequest` shall specify the following in the Http header:
      Accept: application/json
      Content-Type: application/json; charset=utf-8 ] */
    let httpHeaders = JSON.parse(JSON.stringify(_defaultHeaders));

    debug('submitting PUT for ' + request.registrationId + ' to ' + path);
    debug(JSON.stringify(requestBody));
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_009: [ `registrationRequest` shall PUT the registration request to 'https://{provisioningHost}/{idScope}/registrations/{registrationId}/register' ] */
    this._restApiClient.executeApiCall('PUT', path, httpHeaders, requestBody, (err: Error, result?: any, response?: any) => {
      if (err) {
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_044: [ If the Http request fails for any reason, `registrationRequest` shall call `callback`, passing the error along with the `result` and `response` objects. ] */
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_043: [ If `cancel` is called while the registration request is in progress, `register` shall call the `callback` with an `OperationCancelledError` error. ] */
        debug('error executing PUT: ' + err.toString());
        callback(err, result, response);
      } else {
        debug('PUT response received:');
        debug(JSON.stringify(result));
        if (response.statusCode < 300) {
          /* Codes_SRS_NODE_PROVISIONING_HTTP_18_045: [ If the Http request succeeds, `registrationRequest` shall call `callback`, passing a `null` error along with the `result` and `response` objects. ] */
          callback(null, result, response, this._config.pollingInterval);
        } else {
          /* Codes_SRS_NODE_PROVISIONING_HTTP_18_014: [ If the Http response has a failed status code, `registrationRequest` shall use `translateError` to translate this to a common error object ] */
          /* Codes_SRS_NODE_PROVISIONING_HTTP_18_044: [ If the Http request fails for any reason, `registrationRequest` shall call `callback`, passing the error along with the `result` and `response` objects. ] */
          callback(translateError('PUT operation returned failure', response.statusCode, result, response));
        }
      }
    });
  }

  /**
   * private
   */
  queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void {
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_037: [ `queryOperationStatus` shall include the current `api-version` as a URL query string value named 'api-version'. ] */
    let path: string = '/' + request.idScope + '/registrations/' + request.registrationId + '/operations/' + operationId + '?api-version=' + ProvisioningDeviceConstants.apiVersion;

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_020: [ `queryOperationStatus` shall specify the following in the Http header:
      Accept: application/json
      Content-Type: application/json; charset=utf-8 ] */
    let httpHeaders = JSON.parse(JSON.stringify(_defaultHeaders));

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_022: [ `queryOperationStatus` shall send a GET operation sent to 'https://{provisioningHost}/{idScope}/registrations/{registrationId}/operations/{operationId}'  ] */
    debug('submitting status GET for ' + request.registrationId + ' to ' + path);
    this._restApiClient.executeApiCall('GET', path, httpHeaders, {}, (err: Error, result?: any, response?: any) => {
      if (err) {
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_038: [ If the Http request fails for any reason, `queryOperationStatus` shall call `callback`, passing the error along with the `result` and `response` objects. ] */
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_042: [ If `cancel` is called while the operation status request is in progress, `queryOperationStatus` shall call the `callback` with an `OperationCancelledError` error. ] */
        debug('error executing GET: ' + err.toString());
        callback(err, result, response);
      } else {
        debug('GET response received:');
        debug(JSON.stringify(result));
        if (response.statusCode < 300) {
          /* Codes_SRS_NODE_PROVISIONING_HTTP_18_039: [ If the Http request succeeds, `queryOperationStatus` shall call `callback`, passing a `null` error along with the `result` and `response` objects. ] */
          callback(null, result, response, this._config.pollingInterval);
        } else {
          /* Codes_SRS_NODE_PROVISIONING_HTTP_18_026: [ If the Http response has a failed status code, `queryOperationStatus` shall use `translateError` to translate this to a common error object ] */
          /* Codes_SRS_NODE_PROVISIONING_HTTP_18_038: [ If the Http request fails for any reason, `queryOperationStatus` shall call `callback`, passing the error along with the `result` and `response` objects. ] */
          callback(translateError('GET operation returned failure', response.statusCode, result, response));
        }
      }
    });
  }
}

