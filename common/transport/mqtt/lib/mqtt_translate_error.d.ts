/**
 * @method          module:azure-iot-mqtt-base.translateError
 * @description     Convert an error returned by MQTT.js into a transport-agnistic error.
 *
 * @param {Object}        mqttError the error returned by the MQTT.js library
 * @return {Object}   transport-agnostic error object
 */
/**
 * @private
 */
export declare class MqttTransportError extends Error {
    transportError?: Error;
}
/**
 * @private
 */
export declare function translateError(mqttError: Error): MqttTransportError;
