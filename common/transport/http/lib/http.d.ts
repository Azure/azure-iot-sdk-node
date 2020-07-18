import { ClientRequest, IncomingMessage } from 'http';
import { RequestOptions } from 'https';
import { Message, X509 } from 'azure-iot-common';
/**
 * @private
 */
export declare type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/**
 * @private
 */
export declare type HttpCallback = (err: Error, body?: string, response?: IncomingMessage) => void;
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
export declare class Http {
    private _options;
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
    buildRequest(method: HttpMethod, path: string, httpHeaders: {
        [key: string]: string | string[] | number;
    }, host: string | {
        socketPath: string;
    }, options: X509 | HttpRequestOptions | HttpCallback, done?: HttpCallback): ClientRequest;
    /**
     * @method                              module:azure-iot-http-base.Http.toMessage
     * @description                         Transforms the body of an HTTP response into a {@link module:azure-iot-common.Message} that can be treated by the client.
     *
     * @param {module:http.IncomingMessage} response        A response as returned from the node.js http module
     * @param {Object}                      body            The section of the URI that should be appended after the hostname.
     *
     * @returns {module:azure-iot-common.Message} A Message object.
     */
    toMessage(response: IncomingMessage, body: Message.BufferConvertible): Message;
    /**
     * @private
     */
    setOptions(options: any): void;
    /**
     * @private
     */
    isX509Options(options: any): boolean;
    /**
     * @private
     */
    isHttpRequestOptions(options: any): boolean;
    /**
     * @method              module:azure-iot-http-base.Http#parseErrorBody
     * @description         Parses the body of an error response and returns it as an object.
     *
     * @params {String}     body  The body of the HTTP error response
     * @returns {Object}    An object with 2 properties: code and message.
     */
    static parseErrorBody(body: string): {
        code: string;
        message: string;
    };
}
