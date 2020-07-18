import { EventEmitter } from 'events';
import { IClientPublishOptions, IClientSubscribeOptions } from 'mqtt';
import { SharedAccessSignature, X509 } from 'azure-iot-common';
/**
 * @private
 */
export declare class MqttBase extends EventEmitter {
    private mqttprovider;
    private _config;
    private _mqttClient;
    private _fsm;
    private _options;
    constructor(mqttprovider?: any);
    connect(config: MqttBaseTransportConfig, done: (err?: Error, result?: any) => void): void;
    disconnect(done: (err?: Error, result?: any) => void): void;
    publish(topic: string, payload: any, options: IClientPublishOptions, done: (err?: Error, result?: any) => void): void;
    subscribe(topic: string, options: IClientSubscribeOptions, callback: (err?: Error, result?: any) => void): void;
    unsubscribe(topic: string, callback: (err?: Error, result?: any) => void): void;
    updateSharedAccessSignature(sharedAccessSignature: string, callback: (err?: Error) => void): void;
    /**
     * @private
     */
    setOptions(options: any): void;
    private _connectClient;
    private _disconnectClient;
}
/**
 * @private
 */
export interface MqttBaseTransportConfig {
    sharedAccessSignature?: string | SharedAccessSignature;
    clientId: string;
    x509?: X509;
    username: string;
    clean?: boolean;
    uri: string;
}
