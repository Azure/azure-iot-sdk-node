import { IncomingMessage } from 'http';
/**
 * @private
 */
export declare class HttpTransportError extends Error {
    response?: IncomingMessage;
    responseBody?: any;
}
/**
 * @private
 */
export declare function translateError(message: string, body: any, response: IncomingMessage): HttpTransportError;
