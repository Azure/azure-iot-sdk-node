import { EventEmitter } from 'events';
import { MqttBase } from 'azure-iot-mqtt-base';
import { X509 } from 'azure-iot-common';
import { X509ProvisioningTransport, SymmetricKeyProvisioningTransport } from 'azure-iot-provisioning-device';
import { ProvisioningTransportOptions } from 'azure-iot-provisioning-device';
import { RegistrationRequest, DeviceRegistrationResult } from 'azure-iot-provisioning-device';
/**
 * Transport used to provision a device over MQTT.
 */
export declare class Mqtt extends EventEmitter implements X509ProvisioningTransport, SymmetricKeyProvisioningTransport {
    private _mqttBase;
    private _config;
    private _fsm;
    private _auth;
    private _sas;
    private _subscribed;
    private _operations;
    /**
     * @private
     */
    constructor(mqttBase?: MqttBase);
    /**
     * @private
     *
     */
    setTransportOptions(options: ProvisioningTransportOptions): void;
    /**
     * @private
     */
    registrationRequest(request: RegistrationRequest, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void;
    /**
     * @private
     */
    queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void;
    /**
     * @private
     */
    cancel(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    disconnect(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    setAuthentication(auth: X509): void;
    /**
     * @private
     */
    setSharedAccessSignature(sas: string): void;
    protected _getConnectionUri(request: RegistrationRequest): string;
    private _connect;
    private _disconnect;
    private _sendRegistrationRequest;
    private _sendOperationStatusQuery;
    /**
     * @private
     */
    private _cancelAllOperations;
}
