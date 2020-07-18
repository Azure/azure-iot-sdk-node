import { EventEmitter } from 'events';
import { X509 } from 'azure-iot-common';
import { ProvisioningTransportOptions, X509ProvisioningTransport, TpmProvisioningTransport, SymmetricKeyProvisioningTransport, RegistrationRequest } from 'azure-iot-provisioning-device';
import { Amqp as Base } from 'azure-iot-amqp-base';
/**
 * Transport used to provision a device over AMQP.
 */
export declare class Amqp extends EventEmitter implements X509ProvisioningTransport, TpmProvisioningTransport, SymmetricKeyProvisioningTransport {
    private _amqpBase;
    private _config;
    private _amqpStateMachine;
    private _x509Auth;
    private _sas;
    private _endorsementKey;
    private _storageRootKey;
    private _customSaslMechanism;
    private _getSasTokenCallback;
    private _receiverLink;
    private _senderLink;
    private _operations;
    /**
     * @private
     */
    constructor(amqpBase?: Base);
    /**
     * @private
     */
    setTransportOptions(options: ProvisioningTransportOptions): void;
    /**
     * @private
     */
    setAuthentication(auth: X509): void;
    /**
     * @private
     */
    setSharedAccessSignature(sas: string): void;
    /**
     * @private
     */
    registrationRequest(request: RegistrationRequest, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void;
    /**
     * @private
     */
    queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void;
    /**
     * @private
     */
    setTpmInformation(endorsementKey: Buffer, storageRootKey: Buffer): void;
    /**
     * @private
     */
    getAuthenticationChallenge(request: RegistrationRequest, callback: (err: Error, tpmChallenge?: Buffer) => void): void;
    /**
     * @private
     */
    respondToAuthenticationChallenge(request: RegistrationRequest, sasToken: string, callback: (err?: Error) => void): void;
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
    protected _getConnectionUri(request: RegistrationRequest): string;
    /**
     * @private
     */
    private _cancelAllOperations;
    private _getAuthChallenge;
    private _respondToAuthChallenge;
}
