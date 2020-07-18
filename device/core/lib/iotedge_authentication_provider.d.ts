import { AuthenticationProvider } from 'azure-iot-common';
import { SharedAccessKeyAuthenticationProvider } from './sak_authentication_provider';
/**
 * @private
 *
 * The iotedged HTTP API version this code is built to work with.
 */
export declare const WORKLOAD_API_VERSION = "2018-06-28";
/**
 * @private
 *
 * This interface defines the configuration information that this class needs in order to be able to communicate with iotedged.
 */
export interface EdgedAuthConfig {
    workloadUri: string;
    deviceId: string;
    moduleId: string;
    iothubHostName: string;
    authScheme: string;
    gatewayHostName?: string;
    generationId: string;
}
/**
 * Provides an `AuthenticationProvider` implementation that delegates token generation to iotedged. This implementation is meant to be used when using the module client with Azure IoT Edge.
 *
 * This type inherits from `SharedAccessKeyAuthenticationProvider` and is functionally identical to that type except for the token generation part which it overrides by implementing the `_sign` method.
 */
export declare class IotEdgeAuthenticationProvider extends SharedAccessKeyAuthenticationProvider implements AuthenticationProvider {
    private _authConfig;
    private _restApiClient;
    private _workloadUri;
    /**
     * @private
     *
     * Initializes a new instance of the IotEdgeAuthenticationProvider.
     *
     * @param _authConfig                    iotedged connection configuration information.
     * @param tokenValidTimeInSeconds        [optional] The number of seconds for which a token is supposed to be valid.
     * @param tokenRenewalMarginInSeconds    [optional] The number of seconds before the end of the validity period during which the `IotEdgeAuthenticationProvider` should renew the token.
     */
    constructor(_authConfig: EdgedAuthConfig, tokenValidTimeInSeconds?: number, tokenRenewalMarginInSeconds?: number);
    getTrustBundle(callback: (err?: Error, ca?: string) => void): void;
    protected _sign(resourceUri: string, expiry: number, callback: (err: Error, signature?: string) => void): void;
    private _getRequestOptions;
}
