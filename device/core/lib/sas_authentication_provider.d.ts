import { EventEmitter } from 'events';
import { AuthenticationProvider, AuthenticationType, TransportConfig, Callback } from 'azure-iot-common';
/**
 * Provides an `AuthenticationProvider` object that can be created simply with a shared access signature and is then used by the device client and transports to authenticate
 * with the Azure IoT hub instance.
 *
 * The `SharedAccessSignatureAuthenticationProvider` object does not renew the shared access signature token automatically, so the user needs to feed non-expired shared access signature
 * tokens to it using the `updateSharedAccessSignature` method. For each call to this method, the `SharedAccessSignatureAuthenticationProvider` will emit a `newTokenAvailable` event that
 * transports will use to authenticate with the Azure IoT hub instance.
 */
export declare class SharedAccessSignatureAuthenticationProvider extends EventEmitter implements AuthenticationProvider {
    type: AuthenticationType;
    private _credentials;
    /**
     * @private
     *
     * Initializes a new instance of the SharedAccessSignatureAuthenticationProvider - users should only use the factory methods though.
     *
     * @param credentials       Credentials to be used by the device to connect to the IoT hub.
     * @param securityProvider  Object used to sign the tokens that are going to be used during authentication.
     */
    constructor(credentials: TransportConfig);
    /**
     * This method is used by the transports to gets the most current device credentials in the form of a `TransportConfig` object.
     *
     * @param [callback] optional function that will be called with either an error or a set of device credentials that can be used to authenticate with the IoT hub.
     * @returns {Promise<TransportConfig> | void} Promise if no callback function was passed, void otherwise.
     */
    getDeviceCredentials(callback: Callback<TransportConfig>): void;
    getDeviceCredentials(): Promise<TransportConfig>;
    /**
     * does nothing and returns - this is part of the token-based authentication provider API but there are no resources to stop/free here.
     */
    stop(): void;
    /**
     * Updates the shared access signature token that transports should use to authenticate. When called, the `SharedAccessSignatureAuthenticationProvider` will emit
     * a `newTokenAvailable` event that the transports can then use to authenticate with the Azure IoT hub instance.
     *
     * @param sharedAccessSignature         A shared access signature string containing the required parameters for authentication with the IoT hub.
     */
    updateSharedAccessSignature(sharedAccessSignature: string): void;
    /**
     * Creates a new `SharedAccessSignatureAuthenticationProvider` from a connection string
     *
     * @param sharedAccessSignature         A shared access signature string containing the required parameters for authentication with the IoT hub.
     */
    static fromSharedAccessSignature(sharedAccessSignature: string): SharedAccessSignatureAuthenticationProvider;
}
