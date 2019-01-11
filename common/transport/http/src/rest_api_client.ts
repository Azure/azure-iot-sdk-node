// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { anHourFromNow, errors, SharedAccessSignature, X509 } from 'azure-iot-common';
import { Http as HttpBase, HttpRequestOptions } from './http';
import  * as uuid from 'uuid';
import { ClientRequest } from 'http';
import dbg = require('debug');
const debug = dbg('azure-iot-http-base.RestApiClient');



/**
 * @private
 */
export type HttpMethodVerb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * @private
 */
export interface HttpTransportError extends Error {
  response?: any;
  responseBody?: any;
}

/**
 * @private
 * @class       module:azure-iothub.RestApiClient
 * @classdesc   Constructs an {@linkcode RestApiClient} object that can be used to make REST calls to the IoT Hub service.
 *
 * @instance    {Object}  config              The configuration object that should be used to connect to the IoT Hub service.
 * @instance    {Object}  httpRequestBuilder  OPTIONAL: The base http transport object. `azure-iot-common.Http` will be used if no argument is provided.
 *
 * @throws {ReferenceError}  If the config argument is falsy
 * @throws {ArgumentError}   If the config argument is missing a host or sharedAccessSignature error
 */
export class RestApiClient {
  private _config: RestApiClient.TransportConfig;
  private _http: HttpBase;
  private _userAgent: string;

  constructor(config: RestApiClient.TransportConfig, userAgent: string, httpRequestBuilder?: HttpBase) {
    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_001: [The `RestApiClient` constructor shall throw a `ReferenceError` if config is falsy.]*/
    if (!config) throw new ReferenceError('config cannot be \'' + config + '\'');
    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_002: [The `RestApiClient` constructor shall throw an `ArgumentError` if config is missing a `host` property.]*/
    if (!config.host) throw new errors.ArgumentError('config.host cannot be \'' + config.host + '\'');
    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_18_001: [The `RestApiClient` constructor shall throw a `ReferenceError` if `userAgent` is falsy.]*/
    if (!userAgent) throw new ReferenceError('userAgent cannot be \'' + userAgent + '\'');

    this._config = config;
    this._userAgent = userAgent;

    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_003: [The `RestApiClient` constructor shall use `azure-iot-common.Http` as the internal HTTP client if the `httpBase` argument is `undefined`.]*/
    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_004: [The `RestApiClient` constructor shall use the value of the `httpBase` argument as the internal HTTP client if present.]*/
    this._http = httpRequestBuilder || new HttpBase();
  }

  /**
   * @method             module:azure-iothub.RestApiClient.executeApiCall
   * @description        Creates an HTTP request, sends it and parses the response, then call the callback with the resulting object.
   *
   * @param {Function}   method        The HTTP method that should be used.
   * @param {Function}   path          The path for the HTTP request.
   * @param {Function}   headers       Headers to add to the request on top of the defaults (Authorization, Request-Id and User-Agent will be populated automatically).
   * @param {Function}   requestBody   Body of the HTTP request.
   * @param {Function}   timeout       [optional] Custom timeout value.
   * @param {Function}   done          Called when a response has been received or if an error happened.
   *
   * @throws {ReferenceError} If the method or path arguments are falsy.
   * @throws {TypeError}      If the type of the requestBody is not a string when Content-Type is text/plain
   */
  executeApiCall(
    method: HttpMethodVerb,
    path: string,
    headers: { [key: string]: any },
    requestBody: any,
    timeout?: number | HttpRequestOptions | RestApiClient.ResponseCallback,
    requestOptions?: HttpRequestOptions | number | RestApiClient.ResponseCallback,
    done?: RestApiClient.ResponseCallback): void {
    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_005: [The `executeApiCall` method shall throw a `ReferenceError` if the `method` argument is falsy.]*/
    if (!method) throw new ReferenceError('method cannot be \'' + method + '\'');
    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_006: [The `executeApiCall` method shall throw a `ReferenceError` if the `path` argument is falsy.]*/
    if (!path) throw new ReferenceError('path cannot be \'' + path + '\'');

    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_029: [If `done` is `undefined` and the `timeout` argument is a function, `timeout` should be used as the callback and mark `requestOptions` and `timeout` as `undefined`.]*/
    if (done === undefined && typeof(timeout) === 'function') {
      done = timeout;
      requestOptions = timeout = undefined;
    }

    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_13_001: [** If `done` is `undefined` and the `requestOptions` argument is a function, then `requestOptions` should be used as the callback and mark `requestOptions` as `undefined`.*/
    if (done === undefined && typeof(requestOptions) === 'function') {
      done = requestOptions;
      requestOptions = undefined;
    }

    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_13_002: [** If `timeout` is an object and `requestOptions` is `undefined`, then assign `timeout` to `requestOptions` and mark `timeout` as `undefined`.*/
    if (typeof(timeout) === 'object' && requestOptions === undefined) {
      requestOptions = timeout;
      timeout = undefined;
    }

    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_007: [The `executeApiCall` method shall add the following headers to the request:
    - Authorization: <this.sharedAccessSignature>
    - Request-Id: <guid>
    - User-Agent: <version string>]*/
    let httpHeaders: any = headers || {};
    if (this._config.sharedAccessSignature) {
      httpHeaders.Authorization = (typeof(this._config.sharedAccessSignature) === 'string') ? this._config.sharedAccessSignature as string : (this._config.sharedAccessSignature as SharedAccessSignature).extend(anHourFromNow());
    }
    httpHeaders['Request-Id'] = uuid.v4();
    httpHeaders['User-Agent'] = this._userAgent;

    let requestBodyString: string;

    if (requestBody) {
      /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_035: [If there's is a `Content-Type` header and its value is `application/json; charset=utf-8` and the `requestBody` argument is a `string` it shall be used as is as the body of the request.]*/
      /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_031: [If there's is a `Content-Type` header and its value is `application/json; charset=utf-8` and the `requestBody` argument is not a `string`, the body of the request shall be stringified using `JSON.stringify()`.]*/
      if (!!headers['Content-Type'] && headers['Content-Type'].indexOf('application/json') >= 0) {
        if (typeof requestBody === 'string') {
          requestBodyString = requestBody;
        } else {
          requestBodyString = JSON.stringify(requestBody);
        }
      } else if (!!headers['Content-Type'] && headers['Content-Type'].indexOf('text/plain') >= 0) {
        if (typeof requestBody !== 'string') {
          /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_033: [The `executeApiCall` shall throw a `TypeError` if there's is a `Content-Type` header and its value is `text/plain; charset=utf-8` and the `body` argument is not a string.]*/
          throw new TypeError('requestBody must be a string');
        } else {
          /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_032: [If there's is a `Content-Type` header and its value is `text/plain; charset=utf-8`, the `requestBody` argument shall be used.]*/
          requestBodyString = requestBody;
        }
      }

      /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_036: [The `executeApiCall` shall set the `Content-Length` header to the length of the serialized value of `requestBody` if it is truthy.]*/
      const requestBodyStringSizeInBytes = Buffer.byteLength(requestBodyString, 'utf8');
      headers['Content-Length'] = requestBodyStringSizeInBytes;
    }

    const requestCallback = (err, responseBody, response) =>  {
      debug(method + ' call to ' + path + ' returned ' + (err ? err : 'success'));
      if (err) {
        if (response) {
          /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_010: [If the HTTP request fails with an error code >= 300 the `executeApiCall` method shall translate the HTTP error into a transport-agnostic error using the `translateError` method and call the `done` callback with the resulting error as the only argument.]*/
          done(RestApiClient.translateError(responseBody, response));
        } else {
          /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_011: [If the HTTP request fails without an HTTP error code the `executeApiCall` shall call the `done` callback with the error itself as the only argument.]*/
          done(err);
        }
      } else {
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_009: [If the HTTP request is successful and the content-type header contains `application/json` the `executeApiCall` method shall parse the JSON response received and call the `done` callback with a `null` first argument, the parsed result as a second argument and the HTTP response object itself as a third argument.]*/
        let result = '';
        let parseError = null;
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_037: [If parsing the body of the HTTP response as JSON fails, the `done` callback shall be called with the SyntaxError thrown as a first argument, an `undefined` second argument, and the HTTP response object itself as a third argument.]*/
        const expectJson = response.headers && response.headers['content-type'] && response.headers['content-type'].indexOf('application/json') >= 0;
        if (responseBody && expectJson) {
          try {
            result = JSON.parse(responseBody);
          } catch (ex) {
            if (ex instanceof SyntaxError) {
              parseError = ex;
              result = undefined;
            } else {
              throw ex;
            }
          }
        }
        done(parseError, result, response);
      }
    };

    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_008: [The `executeApiCall` method shall build the HTTP request using the arguments passed by the caller.]*/
    let request: ClientRequest;
    if (!!this._config.x509) {
      /* Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_18_002: [ If an `x509` cert was passed into the constructor via the `config` object, `executeApiCall` shall use it to establish the TLS connection. ] */
       request = this._http.buildRequest(method, path, httpHeaders, this._config.host, this._config.x509, requestCallback);
    } else {
      /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_13_003: [** If `requestOptions` is not falsy then it shall be passed to the `buildRequest` function.*/
      if (requestOptions) {
        request = this._http.buildRequest(
          method, path, httpHeaders, this._config.host,
          requestOptions as HttpRequestOptions, requestCallback
        );
      } else {
        request = this._http.buildRequest(method, path, httpHeaders, this._config.host, requestCallback);
      }
    }

    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_030: [If `timeout` is defined and is not a function, the HTTP request timeout shall be adjusted to match the value of the argument.]*/
    if (timeout) {
      request.setTimeout(timeout as number);
    }

    debug('sending ' + method + ' call to ' + path);
    if (requestBodyString) {
      debug('with body ' + requestBodyString);
      request.write(requestBodyString);
    }

    request.end();
  }

  /**
   * @method             module:azure-iothub.RestApiClient.updateSharedAccessSignature
   * @description        Updates the shared access signature used to authentify API calls.
   *
   * @param  {string}          sharedAccessSignature  The new shared access signature that should be used.
   *
   * @throws {ReferenceError}  If the new sharedAccessSignature is falsy.
   */
  updateSharedAccessSignature(sharedAccessSignature: string | SharedAccessSignature): void {
    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_034: [The `updateSharedAccessSignature` method shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
    if (!sharedAccessSignature) throw new ReferenceError('sharedAccessSignature cannot be \'' + sharedAccessSignature + '\'');

    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_028: [The `updateSharedAccessSignature` method shall update the `sharedAccessSignature` configuration parameter that is used in the `Authorization` header of all HTTP requests.]*/
    this._config.sharedAccessSignature = sharedAccessSignature;
  }

  /**
   * @private
   */
  setOptions(options: any): void {
    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_18_003: [ `setOptions` shall call `this._http.setOptions` passing the same parameters ]*/
    this._http.setOptions(options);
  }

  /**
   * @method             module:azure-iothub.RestApiClient.translateError
   * @description        Translates an HTTP error into a transport-agnostic error.
   *
   * @param {string}   body        The HTTP error response body.
   * @param {string}   response    The HTTP response itself.
   *
   */
  /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_027: [`translateError` shall accept 2 arguments:
  - the body of  the HTTP response, containing the explanation of why the request failed.
  - the HTTP response object itself.]*/
  static translateError(body: any, response: any): HttpTransportError {
    /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_012: [Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 3 properties:
    - `response` shall contain the `IncomingMessage` object returned by the HTTP layer.
    - `reponseBody` shall contain the content of the HTTP response.
    - `message` shall contain a human-readable error message.]*/
    let error: HttpTransportError;
    const errorContent = HttpBase.parseErrorBody(body);
    const message = errorContent ? errorContent.message : 'Error: ' + body;

    switch (response.statusCode) {
      case 400:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_014: [`translateError` shall return an `ArgumentError` if the HTTP response status code is `400`.]*/
        error = new errors.ArgumentError(message);
        break;
      case 401:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_015: [`translateError` shall return an `UnauthorizedError` if the HTTP response status code is `401`.]*/
        error = new errors.UnauthorizedError(message);
        break;
      case 403:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_016: [`translateError` shall return an `TooManyDevicesError` if the HTTP response status code is `403`.]*/
        error = new errors.TooManyDevicesError(message);
        break;
      case 404:
        if (errorContent && errorContent.code === 'DeviceNotFound') {
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_018: [`translateError` shall return an `DeviceNotFoundError` if the HTTP response status code is `404` and if the error code within the body of the error response is `DeviceNotFound`.]*/
          error = new errors.DeviceNotFoundError(message);
        } else if (errorContent && errorContent.code === 'IotHubNotFound') {
          /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_017: [`translateError` shall return an `IotHubNotFoundError` if the HTTP response status code is `404` and if the error code within the body of the error response is `IotHubNotFound`.]*/
          error = new errors.IotHubNotFoundError(message);
        } else {
          error = new Error('Not found');
        }
        break;
      case 408:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_019: [`translateError` shall return a `DeviceTimeoutError` if the HTTP response status code is `408`.]*/
        error = new errors.DeviceTimeoutError(message);
        break;
      case 409:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_020: [`translateError` shall return an `DeviceAlreadyExistsError` if the HTTP response status code is `409`.]*/
        error = new errors.DeviceAlreadyExistsError(message);
        break;
      case 412:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_021: [`translateError` shall return an `InvalidEtagError` if the HTTP response status code is `412`.]*/
        error = new errors.InvalidEtagError(message);
        break;
      case 429:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_022: [`translateError` shall return an `ThrottlingError` if the HTTP response status code is `429`.]*/
        error = new errors.ThrottlingError(message);
        break;
      case 500:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_023: [`translateError` shall return an `InternalServerError` if the HTTP response status code is `500`.]*/
        error = new errors.InternalServerError(message);
        break;
      case 502:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_024: [`translateError` shall return a `BadDeviceResponseError` if the HTTP response status code is `502`.]*/
        error = new errors.BadDeviceResponseError(message);
        break;
      case 503:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_025: [`translateError` shall return an `ServiceUnavailableError` if the HTTP response status code is `503`.]*/
        error = new errors.ServiceUnavailableError(message);
        break;
      case 504:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_026: [`translateError` shall return a `GatewayTimeoutError` if the HTTP response status code is `504`.]*/
        error = new errors.GatewayTimeoutError(message);
        break;
      default:
        /*Codes_SRS_NODE_IOTHUB_REST_API_CLIENT_16_013: [If the HTTP error code is unknown, `translateError` should return a generic Javascript `Error` object.]*/
        error = new Error(message);
    }

    error.response = response;
    error.responseBody = body;
    return error;
  }
}

export namespace RestApiClient {
    export interface TransportConfig {
        host: string | { socketPath: string };
        sharedAccessSignature?: string | SharedAccessSignature;
        x509?: X509;
    }

    export type ResponseCallback = (err: Error, responseBody?: any, response?: any) => void;
}
