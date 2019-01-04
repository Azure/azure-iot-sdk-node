// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { request as http_request, ClientRequest, IncomingMessage } from 'http';
import { request as https_request, RequestOptions } from 'https';
import { Message, X509 } from 'azure-iot-common';
import dbg = require('debug');
const debug = dbg('azure-iot-http-base.Http');

/**
 * @private
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * @private
 */
export type HttpCallback = (err: Error, body?: string, response?: IncomingMessage) => void;

/**
 * @private
 *
 * This interface defines optional HTTP request options that one can set on a per request basis.
 */
export interface HttpRequestOptions {
  /**
   * The TCP port to use when connecting to the HTTP server. Defaults to 80 for HTTP
   * traffic and 443 for HTTPS traffic.
   */
  port?: number;

  /**
   * The request function to use when connecting to the HTTP server. Must be the 'request'
   * function from either the 'http' Node.js package or the 'https' Node.js package.
   */
  request?: (options: RequestOptions | string, callback?: (res: IncomingMessage) => void) => ClientRequest;
}

/**
 * @private
 * @class           module:azure-iot-http-base.Http
 * @classdesc       Basic HTTP request/response functionality used by higher-level IoT Hub libraries.
 *                  You generally want to use these higher-level objects (such as [azure-iot-device-http.Http]{@link module:azure-iot-device-http.Http}) rather than this one.
 */
export class Http {
  private _options: any;

  /**
   * @method              module:azure-iot-http-base.Http.buildRequest
   * @description         Builds an HTTP request object using the parameters supplied by the caller.
   *
   * @param {String}      method          The HTTP verb to use (GET, POST, PUT, DELETE...).
   * @param {String}      path            The section of the URI that should be appended after the hostname.
   * @param {Object}      httpHeaders     An object containing the headers that should be used for the request.
   * @param {String}      host            Fully-Qualified Domain Name of the server to which the request should be sent to.
   * @param {Object}      options         X509 options or HTTP request options
   * @param {Function}    done            The callback to call when a response or an error is received.
   *
   * @returns An HTTP request object.
   */
  /*Codes_SRS_NODE_HTTP_05_001: [buildRequest shall accept the following arguments:
      method - an HTTP verb, e.g., 'GET', 'POST', 'DELETE'
      path - the path to the resource, not including the hostname
      httpHeaders - an object whose properties represent the names and values of HTTP headers to include in the request
      host - the fully-qualified DNS hostname of the IoT hub
      options - [optional] the x509 certificate options or HTTP request options
      done - a callback that will be invoked when a completed response is returned from the server]*/
  buildRequest (method: HttpMethod,
                path: string,
                httpHeaders: { [key: string]: string | string[] | number },
                host: string | { socketPath: string },
                options: X509 | HttpRequestOptions | HttpCallback,
                done?: HttpCallback): ClientRequest {

    // NOTE: The `options` parameter above, the way its structured prevents
    // this function from being called with *both* X509 options AND
    // HttpRequestOptions simultaneously. This is not strictly required at
    // this time. But when it is required, we may need to split the request
    // options out as its own parameter and then appropriately modify the
    // overload detection logic below.

    if (!done && (typeof options === 'function')) {
      done = options;
      options = undefined;
    }

    let requestOptions: HttpRequestOptions = null;
    if (options && this.isHttpRequestOptions(options)) {
      requestOptions = options as HttpRequestOptions;
      options = undefined;
    }

    let x509Options: X509 = null;
    if (options && this.isX509Options(options)) {
      x509Options = options as X509;
      options = undefined;
    }

    let httpOptions: RequestOptions = {
      path: path,
      method: method,
      headers: httpHeaders
    };

    // Codes_SRS_NODE_HTTP_13_004: [ Use the request object from the `options` object if one has been provided or default to HTTPS request. ]
    let request = https_request;
    if (requestOptions && requestOptions.request) {
      request = requestOptions.request;
    }

    if (typeof(host) === 'string') {
      // Codes_SRS_NODE_HTTP_13_002: [ If the host argument is a string then assign its value to the host property of httpOptions. ]
      httpOptions.host = host;

      // Codes_SRS_NODE_HTTP_13_006: [ If the options object has a port property set then assign that to the port property on httpOptions. ]
      if (requestOptions && requestOptions.port) {
        httpOptions.port = requestOptions.port;
      }
    } else {
      // Codes_SRS_NODE_HTTP_13_003: [ If the host argument is an object then assign its socketPath property to the socketPath property of httpOptions. ]

      // this is a unix domain socket so use `socketPath` property in options
      // instead of `host`
      httpOptions.socketPath = host.socketPath;

      // Codes_SRS_NODE_HTTP_13_005: [ Use the request object from the http module when dealing with unix domain socket based HTTP requests. ]

      // unix domain sockets only work with the HTTP request function; https's
      // request function cannot handle UDS
      request = http_request;
    }

    /*Codes_SRS_NODE_HTTP_18_001: [ If the `options` object passed into `setOptions` has a value in `http.agent`, that value shall be passed into the `request` function as `httpOptions.agent` ]*/
    if (this._options && this._options.http && this._options.http.agent) {
      httpOptions.agent = this._options.http.agent;
    }

    /*Codes_SRS_NODE_HTTP_16_001: [If `options` has x509 properties, the certificate, key and passphrase in the structure shall be used to authenticate the connection.]*/
    if (x509Options) {
      httpOptions.cert = (x509Options as X509).cert;
      httpOptions.key = (x509Options as X509).key;
      httpOptions.passphrase = (x509Options as X509).passphrase;
      httpOptions.clientCertEngine = (x509Options as X509).clientCertEngine;
    }

    if (this._options && this._options.ca) {
      httpOptions.ca = this._options.ca;
    }

    let httpReq = request(httpOptions, (response: IncomingMessage): void => {
      let responseBody = '';
      response.on('error', (err: Error): void => {
        done(err);
      });
      response.on('data', (chunk: string | Buffer): void => {
        responseBody += chunk;
      });
      response.on('end', (): void => {
        /*Codes_SRS_NODE_HTTP_05_005: [When an HTTP response is received, the callback function indicated by the done argument shall be invoked with the following arguments:
        err - the standard JavaScript Error object if status code >= 300, otherwise null
        body - the body of the HTTP response as a string
        response - the Node.js http.IncomingMessage object returned by the transport]*/
        let err = (response.statusCode >= 300) ?
          new Error(response.statusMessage) :
          null;
        done(err, responseBody, response);
      });
    });

    /*Codes_SRS_NODE_HTTP_05_003: [If buildRequest encounters an error before it can send the request, it shall invoke the done callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    httpReq.on('error', done);
    /*Codes_SRS_NODE_HTTP_05_002: [buildRequest shall return a Node.js https.ClientRequest/http.ClientRequest object, upon which the caller must invoke the end method in order to actually send the request.]*/
    return httpReq;
  }

  /**
   * @method                              module:azure-iot-http-base.Http.toMessage
   * @description                         Transforms the body of an HTTP response into a {@link module:azure-iot-common.Message} that can be treated by the client.
   *
   * @param {module:http.IncomingMessage} response        A response as returned from the node.js http module
   * @param {Object}                      body            The section of the URI that should be appended after the hostname.
   *
   * @returns {module:azure-iot-common.Message} A Message object.
   */
  toMessage (response: IncomingMessage, body: Message.BufferConvertible): Message {
    let msg: Message;
    /*Codes_SRS_NODE_HTTP_05_006: [If the status code of the HTTP response < 300, toMessage shall create a new azure-iot-common.Message object with data equal to the body of the HTTP response.]*/
    if (response.statusCode < 300) {
      msg = new Message(body);
      for (let item in response.headers) {
        if (item.search('iothub-') !== -1) {
          if (item.toLowerCase() === 'iothub-messageid') {
            /*Codes_SRS_NODE_HTTP_05_007: [If the HTTP response has an 'iothub-messageid' header, it shall be saved as the messageId property on the created Message.]*/
            msg.messageId = response.headers[item] as any;
          } else if (item.toLowerCase() === 'iothub-to') {
            /*Codes_SRS_NODE_HTTP_05_008: [If the HTTP response has an 'iothub-to' header, it shall be saved as the to property on the created Message.]*/
            msg.to = response.headers[item] as any;
          } else if (item.toLowerCase() === 'iothub-expiry') {
            /*Codes_SRS_NODE_HTTP_05_009: [If the HTTP response has an 'iothub-expiry' header, it shall be saved as the expiryTimeUtc property on the created Message.]*/
            msg.expiryTimeUtc = response.headers[item] as any;
          } else if (item.toLowerCase() === 'iothub-correlationid') {
            /*Codes_SRS_NODE_HTTP_05_010: [If the HTTP response has an 'iothub-correlationid' header, it shall be saved as the correlationId property on the created Message.]*/
            msg.correlationId = response.headers[item] as any;
          } else if (item.search('iothub-app-') !== -1) {
            /*Codes_SRS_NODE_HTTP_13_001: [ If the HTTP response has a header with the prefix iothub-app- then a new property with the header name and value as the key and value shall be added to the message. ]*/
              msg.properties.add(item, response.headers[item] as string);
          }
        } else if (item.toLowerCase() === 'etag') {
          /*Codes_SRS_NODE_HTTP_05_011: [If the HTTP response has an 'etag' header, it shall be saved as the lockToken property on the created Message, minus any surrounding quotes.]*/
          // Need to strip the quotes from the string
          const len = response.headers[item].length;
          msg.lockToken = (response.headers[item] as string).substring(1, len - 1);
        }
      }
    }

    return msg;
  }

  /**
   * @private
   */
  setOptions(options: any): void {
    this._options = options;
  }

  /**
   * @private
   */
  isX509Options(options: any): boolean {
    return !!options && typeof(options) === 'object' &&
      (options.cert || options.key || options.passphrase ||
        options.certFile || options.keyFile || options.clientCertEngine);
  }

  /**
   * @private
   */
  isHttpRequestOptions(options: any): boolean {
    return !!options && typeof(options) === 'object' &&
      (typeof(options.port) === 'number' || typeof(options.request) === 'function');
  }

  /**
   * @method              module:azure-iot-http-base.Http#parseErrorBody
   * @description         Parses the body of an error response and returns it as an object.
   *
   * @params {String}     body  The body of the HTTP error response
   * @returns {Object}    An object with 2 properties: code and message.
   */
  static parseErrorBody (body: string): { code: string, message: string } {
    let result = null;

    try {
      const jsonErr = JSON.parse(body);
      const errParts = jsonErr.Message.split(';');
      const errMessage = errParts[1];
      const errCode = errParts[0].split(':')[1];

      if (!!errCode && !!errMessage) {
        result = {
          message: errMessage,
          code: errCode
        };
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        debug('Could not parse error body: Invalid JSON');
      } else if (err instanceof TypeError) {
        debug('Could not parse error body: Unknown body format');
      } else {
        throw err;
      }
    }

    return result;
  }
}
