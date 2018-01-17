// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { RestApiClient, Http as Base } from 'azure-iot-http-base';
import { X509, errors } from 'azure-iot-common';
import { X509ProvisioningTransport, TpmProvisioningTransport } from 'azure-iot-provisioning-device';
import { RegistrationRequest, DeviceRegistrationResult } from 'azure-iot-provisioning-device';
import { ProvisioningDeviceConstants, ProvisioningTransportOptions } from 'azure-iot-provisioning-device';
import { TpmChallenge } from 'azure-iot-provisioning-device';
import { translateError } from 'azure-iot-provisioning-device';
import * as dbg from 'debug';
import { HttpTransportError } from '../../../../common/transport/http/lib/rest_api_client';
const debug = dbg('azure-iot-provisioning-device-http:Http');

const _defaultHeaders = {
  'Accept' : 'application/json',
  'Content-Type' : 'application/json; charset=utf-8'
};

/**
 * Transport used to provision a device over HTTP.
 */
export class Http extends EventEmitter implements X509ProvisioningTransport, TpmProvisioningTransport {
  private _restApiClient: RestApiClient;
  private _httpBase: Base;
  private _config: ProvisioningTransportOptions = {};
  private _auth: X509;
  private _sasToken: string;
  private _tpm: {};

  /**
   * @private
   */
  /* Codes_SRS_NODE_PROVISIONING_HTTP_18_001: [ The `Http` constructor shall accept the following properties:
  - `idScope` - the ID Scope value for the provisioning service
  - `httpBase` - an optional test implementation of azure-iot-http-base ] */
  constructor(httpBase?: Base) {
    super();
    this._httpBase = httpBase || new Base();
    this._config.pollingInterval = ProvisioningDeviceConstants.defaultPollingInterval;
    this._config.timeoutInterval = ProvisioningDeviceConstants.defaultTimeoutInterval;
  }

  /**
   * @private
   *
   */
  setSasToken(sasToken: string): void {
    this._sasToken = sasToken;
  }

  /**
   * @private
   *
   */
  setTpmInformation(ek: Buffer, srk: Buffer): void {
    this._tpm = { endorsementKey: ek.toString('base64'), storageRootKey: srk.toString('base64') };
  }

  /**
   * @private
   *
   */
  getAuthenticationChallenge(request: RegistrationRequest, callback: (err: Error, tpmChallenge?: TpmChallenge) => void): void {
    let simpleRegistrationRequest: RegistrationRequest = {registrationId: request.registrationId, provisioningHost: request.provisioningHost, idScope: request.idScope};
    this.registrationRequest(simpleRegistrationRequest, (err: HttpTransportError, result?: any, response?: any) => {
      if (err && err.response && (err.response.statusCode === 401))  {

        //
        // So far so bad.  Parse the response body and pull out the message, authenticationKey and the keyName.
        //
        let authenticationResponse;
        try {
          authenticationResponse = JSON.parse(err.responseBody);
        } catch (parseError) {
          debug('inappropriate challenge received: ' + err);
          callback(new errors.InternalServerError('The server did NOT respond with an appropriately formatted authentication blob.'));
          return;
        }

        if (authenticationResponse.authenticationKey && authenticationResponse.keyName && (typeof authenticationResponse.authenticationKey === 'string') &&  (typeof authenticationResponse.keyName === 'string')) {
          callback(null, { message: authenticationResponse.message, authenticationKey: authenticationResponse.authenticationKey, keyName: authenticationResponse.keyName });
        } else {
          debug('inadequate challenge response received: ' + err.responseBody);
          callback(new errors.InternalServerError('The server did NOT respond with an appropriately formatted authentication blob.'));
        }
      } else {
        //
        // We should ALWAYS get an error for the un-authenticated request we just made.  The server is sending back something we
        // have no real context to interpret.
        //
        callback(new errors.InternalServerError('The server did NOT respond with an unauthorized error.  For a TPM challenge this is incorrect.'));
        debug('PUT response received:');
        debug(err);
      }
    });
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
      'pollingInterval',
      'timeoutInterval'
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
    // Nothing to do.
    callback();
  }

  /**
   * private
   */
  registrationRequest(request: RegistrationRequest, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void {

    this._restApiClient = new RestApiClient({ 'host' : request.provisioningHost , 'x509' : this._auth}, ProvisioningDeviceConstants.userAgent, this._httpBase);

    let requestBody: any = { registrationId : request.registrationId };

    if (this._tpm) {
      requestBody.tpm = this._tpm;
    }

    /* update Codes_SRS_NODE_PROVISIONING_HTTP_18_009: [ `register` shall PUT the registration request to 'https://global.azure-devices-provisioning.net/{idScope}/registrations/{registrationId}/register' ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_005: [ The registration request shall include the current `api-version` as a URL query string value named 'api-version'. ] */
    let path: string = '/' + request.idScope + '/registrations/' + request.registrationId + '/register?api-version=' + ProvisioningDeviceConstants.apiVersion;

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_008: [ If `forceRegistration` is specified, the registration request shall include this as a query string value named 'forceRegistration' ] */
    if (request.forceRegistration) {
      path += '&forceRegistration=true';
    }

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_006: [ The registration request shall specify the following in the Http header:
      Accept: application/json
      Content-Type: application/json; charset=utf-8 ] */
    let httpHeaders = JSON.parse(JSON.stringify(_defaultHeaders));

    if (this._sasToken) {
      httpHeaders.Authorization = this._sasToken;
    }

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_007: [ If an `auth` string is specified, it shall be URL encoded and included in the Http Authorization header. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_011: [ If the registration request times out, `register` shall call the `callback` with the lower level error] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_012: [ If the registration response contains a body, `register` shall deserialize this into an object. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_013: [ If registration response body fails to deserialize, `register` will throw an `SyntaxError` error. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_014: [ If the registration response has a failed status code, `register` shall use `translateError` to translate this to a common error object and pass this into the `callback` function along with the deserialized body of the response. ] */
    debug('submitting PUT for ' + request.registrationId + ' to ' + path);
    debug(JSON.stringify(requestBody));
    this._restApiClient.executeApiCall('PUT', path, httpHeaders, requestBody, this._config.timeoutInterval, (err: Error, result?: any, response?: any) => {
      if (err) {
        debug('error executing PUT: ' + err.toString());
        callback(err, result, response);
      } else {
        debug('PUT response received:');
        debug(JSON.stringify(result));
        if (response.statusCode < 300) {
          callback(null, result, response, this._config.pollingInterval);
        } else {
          callback(translateError('PUT operation returned failure', response.statusCode, result, response));
        }
      }
    });
  }

  /**
   * private
   */
  queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void {
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_022: [ operation status request polling shall be a GET operation sent to 'https://global.azure-devices-provisioning.net/{idScope}/registrations/{registrationId}/operations/{operationId}' ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_037: [ The operation status request shall include the current `api-version` as a URL query string value named 'api-version'. ] */
    let path: string = '/' + request.idScope + '/registrations/' + request.registrationId + '/operations/' + operationId + '?api-version=' + ProvisioningDeviceConstants.apiVersion;

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_020: [ The operation status request shall have the following in the Http header:
      Accept: application/json
      Content-Type: application/json; charset=utf-8 ] */
    let httpHeaders = JSON.parse(JSON.stringify(_defaultHeaders));

    if (this._sasToken) {
      httpHeaders.Authorization = this._sasToken;
    }

    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_021: [ If an `auth` string is specified, it shall be URL encoded and included in the Http Authorization header of the operation status request. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_023: [ If the operation status request times out, `register` shall stop polling and call the `callback` with with the lower level error ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_024: [ `register` shall deserialize the body of the operation status response into an object. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_025: [ If the body of the operation status response fails to deserialize, `register` will throw a `SyntaxError` error. ] */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_026: [ If the operation status response contains a failure status code, `register` shall stop polling and call the `callback` with an error created using `translateError`. ] */
    debug('submitting status GET for ' + request.registrationId + ' to ' + path);
    this._restApiClient.executeApiCall('GET', path, httpHeaders, {}, this._config.timeoutInterval, (err: Error, result?: any, response?: any) => {
      if (err) {
        debug('error executing GET: ' + err.toString());
        callback(err, result, response);
      } else {
        debug('GET response received:');
        debug(JSON.stringify(result));
        if (response.statusCode < 300) {
          callback(null, result, response, this._config.pollingInterval);
        } else {
          callback(translateError('GET operation returned failure', response.statusCode, result, response));
        }
      }
    });
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
