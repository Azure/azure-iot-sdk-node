import { Mqtt } from './mqtt';
import { RegistrationRequest } from 'azure-iot-provisioning-device';
import { MqttBase } from 'azure-iot-mqtt-base';
/**
 * Transport used to provision a device over MQTT over Websockets.
 */
export declare class MqttWs extends Mqtt {
    /**
     * @private
     */
    constructor(mqttBase?: MqttBase);
    /**
     * @private
     */
    protected _getConnectionUri(request: RegistrationRequest): string;
}
