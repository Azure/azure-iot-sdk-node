import { Amqp as Base } from 'azure-iot-amqp-base';
import { RegistrationRequest } from 'azure-iot-provisioning-device';
import { Amqp } from './amqp';
/**
 * Transport used to provision a device over AMQP over Websockets.
 */
export declare class AmqpWs extends Amqp {
    /**
     * @private
     */
    constructor(amqpBase?: Base);
    /**
     * @private
     */
    protected _getConnectionUri(request: RegistrationRequest): string;
}
