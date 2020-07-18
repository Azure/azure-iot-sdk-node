import { AuthenticationProvider, AuthenticationType, TransportConfig, X509, Callback } from 'azure-iot-common';
/**
 * Provides an `AuthenticationProvider` object that can be created simply with an X509 certificate and key and is then used by the device client and transports to authenticate
 * with the Azure IoT hub instance.
 *
 * Unlike the `SharedAccessSignatureAuthenticationProvider` and `SharedAccessKeyAuthenticationProvider` objects, the `X509AuthenticationProvider` does not emit a `newTokenAvailable` event
 * since there are no token involved in X509 authentication. The transports will get the credentials using the `getDeviceCredentials` method.
 */
export declare class X509AuthenticationProvider implements AuthenticationProvider {
    type: AuthenticationType;
    private _credentials;
    /**
     * @private
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
     * Updates the certificate and key used by the device to connect and authenticate with an Azure IoT hub instance.
     * @param x509 The `X509` object containing the certificate and key.
     */
    setX509Options(x509: X509): void;
    /**
     * Creates a new `X509AuthenticationProvider` from an `X509` object containing a certificate and key.
     *
     * @param deviceId         The device identifier.
     * @param iotHubHostname   The host name of the Azure IoT hub instance the device should connect to.
     * @param x509info         An `X509` object containing a certificate and key that the device can use to authenticate with the Azure IoT hub instance.
     */
    static fromX509Options(deviceId: string, iotHubHostname: string, x509info: X509): X509AuthenticationProvider;
}
