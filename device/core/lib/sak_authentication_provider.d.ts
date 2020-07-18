import { EventEmitter } from 'events';
import { AuthenticationProvider, AuthenticationType, TransportConfig, Callback } from 'azure-iot-common';
/**
 * Provides an `AuthenticationProvider` object that can be created simply with a connection string and is then used by the device client and transports to authenticate
 * with the Azure IoT hub instance.
 *
 * The `SharedAccessKeyAuthenticationProvider` object takes care of creating shared access signature tokens on a regular cadence and emits the `newTokenAvailable` event for the transports
 * to renew their credentials with the Azure IoT hub instance and stay connected.
 */
export declare class SharedAccessKeyAuthenticationProvider extends EventEmitter implements AuthenticationProvider {
    type: AuthenticationType;
    protected _credentials: TransportConfig;
    protected _tokenValidTimeInSeconds: number;
    private _tokenRenewalMarginInSeconds;
    private _currentTokenExpiryTimeInSeconds;
    private _renewalTimeout;
    /**
     * @private
     *
     * Initializes a new instance of the SharedAccessKeyAuthenticationProvider - users should only use the factory methods though.
     *
     * @param credentials                    Credentials to be used by the device to connect to the IoT hub.
     * @param tokenValidTimeInSeconds        [optional] The number of seconds for which a token is supposed to be valid.
     * @param tokenRenewalMarginInSeconds    [optional] The number of seconds before the end of the validity period during which the `SharedAccessKeyAuthenticationProvider` should renew the token.
     */
    constructor(credentials: TransportConfig, tokenValidTimeInSeconds?: number, tokenRenewalMarginInSeconds?: number);
    /**
     * This method allows the caller to set new values for the authentication renewal.
     *
     * This function completes synchronously, BUT, will cause actions to occur asynchronously.
     * If the provider is already doing token renewals, for instance - if a network connection has
     * been make, invoking this function will cause a new renewal to take place on the almost immediately.
     * Depending on the protocol, this could cause a disconnect and reconnect to occur.  However, if renewals
     * are NOT currently occurring, we simply save off the new values for use later.
     *
     * @param tokenValidTimeInSeconds        The number of seconds for which a token is supposed to be valid.
     * @param tokenRenewalMarginInSeconds    The number of seconds before the end of the validity period during which the `SharedAccessKeyAuthenticationProvider` should renew the token.
     */
    setTokenRenewalValues(tokenValidTimeInSeconds: number, tokenRenewalMarginInSeconds: number): void;
    /**
     * This method is used by the transports to gets the most current device credentials in the form of a `TransportConfig` object.
     *
     * @param [callback] optional function that will be called with either an error or a set of device credentials that can be used to authenticate with the IoT hub.
     * @returns {Promise<TransportConfig> | void} Promise if no callback function was passed, void otherwise.
     */
    getDeviceCredentials(callback: Callback<TransportConfig>): void;
    getDeviceCredentials(): Promise<TransportConfig>;
    /**
     * Stops the timer used to renew to SAS token.
     */
    stop(): void;
    protected _sign(resourceUri: string, expiry: number, callback: (err: Error, signature?: string) => void): void;
    private _shouldRenewToken;
    private _renewToken;
    private _expiryTimerHandler;
    private _scheduleNextExpiryTimeout;
    /**
     * Creates a new `SharedAccessKeyAuthenticationProvider` from a connection string
     *
     * @param connectionString              A device connection string containing the required parameters for authentication with the IoT hub.
     * @param tokenValidTimeInSeconds       [optional] The number of seconds for which a token is supposed to be valid.
     * @param tokenRenewalMarginInSeconds   [optional] The number of seconds before the end of the validity period during which the `SharedAccessKeyAuthenticationProvider` should renew the token.
     */
    static fromConnectionString(connectionString: string, tokenValidTimeInSeconds?: number, tokenRenewalMarginInSeconds?: number): SharedAccessKeyAuthenticationProvider;
}
