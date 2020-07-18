import { Amqp } from './amqp';
import { Client } from './client';
/**
 * Transport class used by the [service client]{@link azure-iothub.Client} to connect to the Azure IoT hub using the AMQP protocol over secure websockets.
 * This class should not be used directly and instead be passed to one of the {@link azure-iothub.Client} factory methods: {@link azure-iothub.Client.fromConnectionString|fromConnectionString} or {@link azure-iothub.Client.fromSharedAccessSignature|fromSharedAccessSignature}.
 */
export declare class AmqpWs extends Amqp implements Client.Transport {
    /**
     * @private
     */
    constructor(config: Client.TransportConfigOptions);
    protected _getConnectionUri(): string;
}
