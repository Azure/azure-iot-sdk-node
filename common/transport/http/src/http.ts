// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { ClientRequest, IncomingMessage } from 'http';
import { request, RequestOptions} from 'https';
import { Message, X509 } from 'azure-iot-common';
import dbg = require('debug');
const debug = dbg('azure-iot-common.Http');

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpCallback = (err: Error, body?: string, response?: IncomingMessage) => void;

/**
 * @class           module:azure-iot-http-base.Http
 * @classdesc       Basic HTTP request/response functionality used by higher-level IoT Hub libraries.
 *                  You generally want to use these higher-level objects (such as [azure-iot-device-http.Http]{@link module:azure-iot-device-http.Http}) rather than this one.
 */
export class Http {
  /**
   * @method              module:azure-iot-http-base.Http.buildRequest
   * @description         Builds an HTTP request object using the parameters supplied by the caller.
   *
   * @param {String}      method          The HTTP verb to use (GET, POST, PUT, DELETE...).
   * @param {String}      path            The section of the URI that should be appended after the hostname.
   * @param {Object}      httpHeaders     An object containing the headers that should be used for the request.
   * @param {String}      host            Fully-Qualified Domain Name of the server to which the request should be sent to.
   * @param {Function}    done            The callback to call when a response or an error is received.
   *
   * @returns An HTTP request object.
   */
  /*Codes_SRS_NODE_HTTP_05_001: [buildRequest shall accept the following arguments:
      method - an HTTP verb, e.g., 'GET', 'POST', 'DELETE'
      path - the path to the resource, not including the hostname
      httpHeaders - an object whose properties represent the names and values of HTTP headers to include in the request
      host - the fully-qualified DNS hostname of the IoT hub
      x509Options - [optional] the x509 certificate, key and passphrase that are needed to connect to the service using x509 certificate authentication
      done - a callback that will be invoked when a completed response is returned from the server]*/

  buildRequest (method: HttpMethod,
                path: string,
                httpHeaders: { [key: string]: string | string[] | number },
                host: string,
                x509Options: X509 | HttpCallback,
                done?: HttpCallback): ClientRequest {

    if (!done && (typeof x509Options === 'function')) {
      done = x509Options;
      x509Options = undefined;
    }

    let httpOptions: RequestOptions = {
      host: host,
      path: path,
      method: method,
      headers: httpHeaders
    };

    /*Codes_SRS_NODE_HTTP_16_001: [If `x509Options` is specified, the certificate, key and passphrase in the structure shall be used to authenticate the connection.]*/
    if (x509Options) {
      httpOptions.cert = (x509Options as X509).cert;
      httpOptions.key = (x509Options as X509).key;
      httpOptions.passphrase = (x509Options as X509).passphrase;
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
    /*Codes_SRS_NODE_HTTP_05_002: [buildRequest shall return a Node.js https.ClientRequest object, upon which the caller must invoke the end method in order to actually send the request.]*/
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
            msg.messageId = response.headers[item];
          } else if (item.toLowerCase() === 'iothub-to') {
            /*Codes_SRS_NODE_HTTP_05_008: [If the HTTP response has an 'iothub-to' header, it shall be saved as the to property on the created Message.]*/
            msg.to = response.headers[item];
          } else if (item.toLowerCase() === 'iothub-expiry') {
            /*Codes_SRS_NODE_HTTP_05_009: [If the HTTP response has an 'iothub-expiry' header, it shall be saved as the expiryTimeUtc property on the created Message.]*/
            msg.expiryTimeUtc = response.headers[item];
          } else if (item.toLowerCase() === 'iothub-correlationid') {
            /*Codes_SRS_NODE_HTTP_05_010: [If the HTTP response has an 'iothub-correlationid' header, it shall be saved as the correlationId property on the created Message.]*/
            msg.correlationId = response.headers[item];
          } else if (item.search('iothub-app-') !== -1) {
            /*Codes_SRS_NODE_HTTP_13_001: [ If the HTTP response has a header with the prefix iothub-app- then a new property with the header name and value as the key and value shall be added to the message. ]*/
              msg.properties.add(item, response.headers[item]);
          }
        } else if (item.toLowerCase() === 'etag') {
          /*Codes_SRS_NODE_HTTP_05_011: [If the HTTP response has an 'etag' header, it shall be saved as the lockToken property on the created Message, minus any surrounding quotes.]*/
          // Need to strip the quotes from the string
          const len = response.headers[item].length;
          msg.lockToken = response.headers[item].substring(1, len - 1);
        }
      }
    }

    return msg;
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
