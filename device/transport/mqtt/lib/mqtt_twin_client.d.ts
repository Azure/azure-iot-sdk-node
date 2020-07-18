import { EventEmitter } from 'events';
import { TwinProperties } from 'azure-iot-device';
import { MqttBase } from 'azure-iot-mqtt-base';
/**
 * @private
 * @class        module:azure-iot-device-mqtt.MqttTwinReceiver
 * @classdesc    Acts as a receiver for device-twin traffic
 *
 * @param {Object} config   configuration object
 * @fires MqttTwinReceiver#subscribed   an MQTT topic has been successfully subscribed to
 * @fires MqttTwinReceiver#error    an error has occured while subscribing to an MQTT topic
 * @fires MqttTwinReceiver#response   a response message has been received from the service
 * @fires MqttTwinReceiver#post a post message has been received from the service
 * @throws {ReferenceError} If client parameter is falsy.
 *
 */
export declare class MqttTwinClient extends EventEmitter {
    static desiredPropertiesUpdateEvent: string;
    private _mqtt;
    private _pendingTwinRequests;
    private _topicFsm;
    private _responseTopic;
    private _desiredPropertiesUpdatesTopic;
    constructor(client: MqttBase);
    getTwin(callback: (err?: Error, twin?: TwinProperties) => void): void;
    updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;
    enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
    disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
    private _sendTwinRequest;
    private _onMqttMessage;
    private _onResponseMessage;
}
