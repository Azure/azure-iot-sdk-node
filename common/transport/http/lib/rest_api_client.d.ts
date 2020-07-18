import { SharedAccessSignature, X509 } from 'azure-iot-common';
import { Http as HttpBase, HttpRequestOptions } from './http';
/**
 * @private
 */
export declare type HttpMethodVerb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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
export declare class RestApiClient {
    private _config;
    private _http;
    private _userAgent;
    constructor(config: RestApiClient.TransportConfig, userAgent: string, httpRequestBuilder?: HttpBase);
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
    executeApiCall(method: HttpMethodVerb, path: string, headers: {
        [key: string]: any;
    }, requestBody: any, timeout?: number | HttpRequestOptions | RestApiClient.ResponseCallback, requestOptions?: HttpRequestOptions | number | RestApiClient.ResponseCallback, done?: RestApiClient.ResponseCallback): void;
    /**
     * @method             module:azure-iothub.RestApiClient.updateSharedAccessSignature
     * @description        Updates the shared access signature used to authentify API calls.
     *
     * @param  {string}          sharedAccessSignature  The new shared access signature that should be used.
     *
     * @throws {ReferenceError}  If the new sharedAccessSignature is falsy.
     */
    updateSharedAccessSignature(sharedAccessSignature: string | SharedAccessSignature): void;
    /**
     * @private
     */
    setOptions(options: any): void;
    /**
     * @method             module:azure-iothub.RestApiClient.translateError
     * @description        Translates an HTTP error into a transport-agnostic error.
     *
     * @param {string}   body        The HTTP error response body.
     * @param {string}   response    The HTTP response itself.
     *
     */
    static translateError(body: any, response: any): HttpTransportError;
}
export declare namespace RestApiClient {
    interface TransportConfig {
        host: string | {
            socketPath: string;
        };
        sharedAccessSignature?: string | SharedAccessSignature;
        x509?: X509;
    }
    type ResponseCallback = (err: Error, responseBody?: any, response?: any) => void;
}
