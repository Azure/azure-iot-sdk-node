import { Amqp } from './amqp.js';
import { AuthenticationProvider, TransportConfig } from 'azure-iot-common';
/**
 * Constructs a transport object that can be used by the device {@link azure-iot-device.Client} to send and receive messages to and from an IoT Hub instance, using the AMQP protocol over secure websockets.
 * This class overloads the constructor of the base {@link azure-iot-device-amqp.Amqp} class from the AMQP transport, and inherits all methods from it.
 *
 * @augments module:azure-iot-device-amqp.Amqp
 */
export declare class AmqpWs extends Amqp {
    /**
     * @private
     * @constructor
     * @param {Object}  config   Configuration object generated from the connection string by the client.
     */
    constructor(authenticationProvider: AuthenticationProvider);
    protected _getConnectionUri(credentials: TransportConfig): string;
}
