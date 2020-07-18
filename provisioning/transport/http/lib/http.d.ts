import { EventEmitter } from 'events';
import { Http as Base } from 'azure-iot-http-base';
import { X509 } from 'azure-iot-common';
import { X509ProvisioningTransport, TpmProvisioningTransport, SymmetricKeyProvisioningTransport } from 'azure-iot-provisioning-device';
import { RegistrationRequest, DeviceRegistrationResult } from 'azure-iot-provisioning-device';
import { ProvisioningTransportOptions } from 'azure-iot-provisioning-device';
/**
 * Transport used to provision a device over HTTP.
 */
export declare class Http extends EventEmitter implements X509ProvisioningTransport, TpmProvisioningTransport, SymmetricKeyProvisioningTransport {
    private _restApiClient;
    private _httpBase;
    private _config;
    private _auth;
    private _sas;
    private _tpmPublicKeys;
    /**
     * @private
     */
    constructor(httpBase?: Base);
    /**
     * @private
     *
     */
    respondToAuthenticationChallenge(request: RegistrationRequest, sasToken: string, callback: (err?: Error) => void): void;
    /**
     * @private
     *
     */
    setTpmInformation(endorsementKey: Buffer, storageRootKey: Buffer): void;
    /**
     * @private
     *
     */
    getAuthenticationChallenge(request: RegistrationRequest, callback: (err: Error, tpmChallenge?: Buffer) => void): void;
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
     *
     */
    setTransportOptions(options: ProvisioningTransportOptions): void;
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
    registrationRequest(request: RegistrationRequest, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void;
    /**
     * @private
     */
    queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void;
    /**
     * @private
     */
    private _ensureRestApiClient;
}
