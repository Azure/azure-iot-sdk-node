import { Mqtt } from './mqtt';
import { MqttBaseTransportConfig } from 'azure-iot-mqtt-base';
import { AuthenticationProvider, TransportConfig } from 'azure-iot-common';
/**
 * Provides MQTT over WebSockets transport for the device [client]{@link module:azure-iot-device.Client} class.
 * This class is not meant to be used directly, instead it should just be passed to the [client]{@link module:azure-iot-device.Client} object.
 */
export declare class MqttWs extends Mqtt {
    /**
     * @private
     * @constructor
     * @param   {Object}    config  Configuration object derived from the connection string by the client.
     */
    constructor(authenticationProvider: AuthenticationProvider, mqttBase?: any);
    protected _getBaseTransportConfig(credentials: TransportConfig): MqttBaseTransportConfig;
}
