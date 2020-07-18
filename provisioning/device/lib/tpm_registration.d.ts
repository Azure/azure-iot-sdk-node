import { EventEmitter } from 'events';
import { Callback, ErrorCallback } from 'azure-iot-common';
import { RegistrationClient, RegistrationResult } from './interfaces';
import { TpmProvisioningTransport, TpmSecurityClient } from './interfaces';
import { ProvisioningPayload } from './interfaces';
/**
 * @private
 */
export declare class TpmRegistration extends EventEmitter implements RegistrationClient {
    private _fsm;
    private _transport;
    private _securityClient;
    private _provisioningHost;
    private _idScope;
    private _pollingStateMachine;
    private _provisioningPayload;
    constructor(provisioningHost: string, idScope: string, transport: TpmProvisioningTransport, securityClient: TpmSecurityClient);
    /**
     * Sets the custom payload for registration that will be sent to the custom allocation policy implemented in an Azure Function.
     *
     * @param payload The payload sent to the provisioning service at registration.
     */
    setProvisioningPayload(payload: ProvisioningPayload): void;
    register(callback: Callback<RegistrationResult>): void;
    register(): Promise<RegistrationResult>;
    cancel(callback: ErrorCallback): void;
    cancel(): Promise<void>;
    private _createRegistrationSas;
}
