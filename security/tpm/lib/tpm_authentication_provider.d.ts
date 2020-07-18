import { EventEmitter } from 'events';
import { AuthenticationType, TransportConfig, AuthenticationProvider, Callback } from 'azure-iot-common';
import { TpmSecurityClient } from './tpm';
/**
 * @private
 */
export declare class TpmAuthenticationProvider extends EventEmitter implements AuthenticationProvider {
    type: AuthenticationType;
    automaticRenewal: boolean;
    private _tokenValidTimeInSeconds;
    private _tokenRenewalMarginInSeconds;
    private _renewalTimeout;
    private _fsm;
    private _credentials;
    private _tpmSecurityClient;
    /**
     * @private
     *
     * Initializes a new instance of the TpmAuthenticationProvider - users should only use the factory methods though.
     *
     * @param credentials       Credentials to be used by the device to connect to the IoT hub.
     * @param tpmSecurityClient That client that provides the signingFunction.
     */
    constructor(credentials: TransportConfig, tpmSecurityClient: TpmSecurityClient);
    getDeviceCredentials(): Promise<TransportConfig>;
    getDeviceCredentials(callback: Callback<TransportConfig>): void;
    updateSharedAccessSignature(sharedAccessSignature: string): void;
    stop(): void;
    private _renewToken;
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#fromTpmSecurityClient
     * @description      Returns an authentication provider.
     * @param {string}            deviceId          The device id for the client to be created.
     * @param {string}            iotHubHostname    The name of the IoT hub to be utilized.
     * @param {TpmSecurityClient} tpmSecurityClient The client which provides the tpm security interface. (Signing, activating, etc.)
     */
    static fromTpmSecurityClient(deviceId: string, iotHubHostname: string, tpmSecurityClient: TpmSecurityClient): TpmAuthenticationProvider;
}
