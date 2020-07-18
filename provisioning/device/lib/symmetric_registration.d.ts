import { RegistrationClient, RegistrationResult } from './interfaces';
import { ProvisioningPayload } from './interfaces';
import { SymmetricKeyProvisioningTransport, SymmetricKeySecurityClient } from './interfaces';
import { Callback, ErrorCallback } from 'azure-iot-common';
/**
 * Client used to run the registration of a device using Symmetric Key authentication.
 */
export declare class SymmetricKeyRegistration implements RegistrationClient {
    private _transport;
    private _securityClient;
    private _provisioningHost;
    private _idScope;
    private _pollingStateMachine;
    private _provisioningPayload;
    constructor(provisioningHost: string, idScope: string, transport: SymmetricKeyProvisioningTransport, securityClient: SymmetricKeySecurityClient);
    /**
     * Sets the custom payload for registration that will be sent to the custom allocation policy implemented in an Azure Function.
     *
     * @param payload The payload sent to the provisioning service at registration.
     */
    setProvisioningPayload(payload: ProvisioningPayload): void;
    /**
     * Register the device with the provisioning service.
     *
     * @param registrationId The registration Id for the device
     * @param forceRegistration Set to true to force re-registration
     * @param [callback] optional function called when registration is complete.
     * @returns {Promise<RegistrationResult> | void} Promise if no callback function was passed, void otherwise.
     */
    register(callback?: Callback<RegistrationResult>): Promise<RegistrationResult> | void;
    /**
     * Cancels the current registration process.
     *
     * @param [callback] optional function called when the registration has already been canceled.
     * @returns {Promise<void> | void} Promise if no callback function was passed, void otherwise.
     */
    cancel(callback?: ErrorCallback): Promise<void> | void;
}
