/**
 * @private
 */
export interface AmqpTransportError extends Error {
    amqpError?: Error;
}
/**
 * @private
 */
export declare function translateError(message: string, amqpError: Error): AmqpTransportError;
