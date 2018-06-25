import { request as http_request } from 'http';
import { AuthenticationProvider, encodeUriComponentStrict, SharedAccessSignature } from 'azure-iot-common';
import { SharedAccessKeyAuthenticationProvider } from './sak_authentication_provider';
import { HttpRequestOptions, RestApiClient } from 'azure-iot-http-base';
import * as url from 'url';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

/**
 * @private
 *
 * The iotedged HTTP API version this code is built to work with.
 */
export const WORKLOAD_API_VERSION = '2018-06-28';
const DEFAULT_SIGN_ALGORITHM = 'HMACSHA256';
const DEFAULT_KEY_ID = 'primary';

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

interface SignRequest {
  keyId: string;
  algo: string;
  data: string;
}

interface SignResponse {
  digest: string;
}

/**
 * Provides an `AuthenticationProvider` implementation that delegates token generation to iotedged. This implementation is meant to be used when using the module client with Azure IoT Edge.
 *
 * This type inherits from `SharedAccessKeyAuthenticationProvider` and is functionally identical to that type except for the token generation part which it overrides by implementing the `_sign` method.
 */
export class IotEdgeAuthenticationProvider extends SharedAccessKeyAuthenticationProvider implements AuthenticationProvider {
  private _restApiClient: RestApiClient;
  private _workloadUri: url.UrlWithStringQuery;

  /**
   * @private
   *
   * Initializes a new instance of the IotEdgeAuthenticationProvider.
   *
   * @param _authConfig                    iotedged connection configuration information.
   * @param tokenValidTimeInSeconds        [optional] The number of seconds for which a token is supposed to be valid.
   * @param tokenRenewalMarginInSeconds    [optional] The number of seconds before the end of the validity period during which the `IotEdgeAuthenticationProvider` should renew the token.
   */
  constructor(private _authConfig: EdgedAuthConfig, tokenValidTimeInSeconds?: number, tokenRenewalMarginInSeconds?: number) {
    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_016: [ The constructor shall create the initial token value using the credentials parameter. ]
    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_017: [ The constructor shall throw an ArgumentError if the tokenRenewalMarginInSeconds is less than or equal tokenValidTimeInSeconds. ]
    super(
      {
        host: _authConfig && _authConfig.iothubHostName,
        deviceId: _authConfig && _authConfig.deviceId,
        moduleId: _authConfig && _authConfig.moduleId,
        gatewayHostName: _authConfig && _authConfig.gatewayHostName
      },
      tokenValidTimeInSeconds,
      tokenRenewalMarginInSeconds
    );

    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_001: [ The constructor shall throw a ReferenceError if the _authConfig parameter is falsy. ]
    if (!this._authConfig) {
      throw new ReferenceError('_authConfig cannot be \'' + _authConfig + '\'');
    }

    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_002: [ The constructor shall throw a ReferenceError if the _authConfig.workloadUri field is falsy. ]
    if (!this._authConfig.workloadUri) {
      throw new ReferenceError('_authConfig.workloadUri cannot be \'' + this._authConfig.workloadUri + '\'');
    }

    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_003: [ The constructor shall throw a ReferenceError if the _authConfig.moduleId field is falsy. ]
    if (!this._authConfig.moduleId) {
      throw new ReferenceError('_authConfig.moduleId cannot be \'' + this._authConfig.moduleId + '\'');
    }

    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_004: [ The constructor shall throw a ReferenceError if the _authConfig.generationId field is falsy. ]
    if (!this._authConfig.generationId) {
      throw new ReferenceError('_authConfig.generationId cannot be \'' + this._authConfig.generationId + '\'');
    }

    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_005: [ The constructor shall throw a TypeError if the _authConfig.workloadUri field is not a valid URI. ]
    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_006: [ The constructor shall build a unix domain socket path host if the workload URI protocol is unix. ]
    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_007: [ The constructor shall build a string host if the workload URI protocol is not unix. ]
    this._workloadUri = url.parse(this._authConfig.workloadUri);
    const config: RestApiClient.TransportConfig = {
      host: this._workloadUri.protocol === 'unix:' ? { socketPath: this._workloadUri.pathname } : this._workloadUri.hostname
    };

    // TODO: The user agent string below needs to be constructed using the utils.getUserAgentString function.
    // But that is an async function and since we can't do async things while initializing fields, one way to
    // handle this might be to make this._restApiClient a lazily initialized object.
    this._restApiClient = new RestApiClient(config, `${packageJson.name}/${packageJson.version}`);
  }

  public getTrustBundle(callback: (err?: Error, ca?: string) => void): void {
    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_020: [ The getTrustBundle method shall throw a ReferenceError if the callback parameter is falsy or is not a function. ]
    if (!callback || typeof callback !== 'function') {
      throw new ReferenceError('callback cannot be \'' + callback + '\'');
    }

    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_022: [ The getTrustBundle method shall build the HTTP request path in the format /trust-bundle?api-version=2018-06-28. ]
    const path = `/trust-bundle?api-version=${encodeUriComponentStrict(WORKLOAD_API_VERSION)}`;

    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_021: [ The getTrustBundle method shall invoke this._restApiClient.executeApiCall to make the REST call on iotedged using the GET method. ]
    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_023: [** The `getTrustBundle` method shall set the HTTP request option's `request` property to use the `http.request` object.
    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_024: [** The `getTrustBundle` method shall set the HTTP request option's `port` property to use the workload URI's port if available.
    this._restApiClient.executeApiCall('GET', path, null, null, this._getRequestOptions(), (err, ca) => {
      if (err) {
        callback(err);
      } else {
        callback(null, ca.certificate);
      }
    });
  }

  protected _sign(resourceUri: string, expiry: number, callback: (err: Error, signature?: string) => void): void {
    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_009: [ The _sign method shall throw a ReferenceError if the callback parameter is falsy or is not a function. ]
    if (!callback || typeof callback !== 'function') {
      throw new ReferenceError('callback cannot be \'' + callback + '\'');
    }

    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_010: [ The _sign method invoke callback with a ReferenceError if the resourceUri parameter is falsy. ]
    if (!resourceUri) {
      callback(new ReferenceError('resourceUri cannot be \'' + resourceUri + '\''), null);
      return;
    }

    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_011: [ The _sign method shall build the HTTP request path in the format /modules/<module id>/genid/<generation id>/sign?api-version=2018-06-28. ]

    // the request path needs to look like this:
    //  /modules/<module id>/genid/<generation id>/sign?api-version=2018-06-28
    const path = `/modules/${encodeUriComponentStrict(this._authConfig.moduleId)}/genid/${encodeUriComponentStrict(
      this._authConfig.generationId
    )}/sign?api-version=${encodeUriComponentStrict(WORKLOAD_API_VERSION)}`;

    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_027: [** The `_sign` method shall use the `SharedAccessSignature.createWithSigningFunction` function to build the data buffer which is to be signed by iotedged.
    SharedAccessSignature.createWithSigningFunction(this._credentials, expiry, (buffer, signCallback) => {
      // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_014: [ The _sign method shall build an object with the following schema as the HTTP request body as the sign request:
      //   interface SignRequest {
      //     keyId: string;
      //     algo: string;
      //     data: string;
      //   }
      //   ]

      // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_013: [ The _sign method shall build the sign request using the following values:
      //   const signRequest = {
      //     keyId: "primary"
      //     algo: "HMACSHA256"
      //     data: `${data}\n${expiry}`
      //   };
      //   ]
      const signRequest: SignRequest = {
        keyId: DEFAULT_KEY_ID,
        algo: DEFAULT_SIGN_ALGORITHM,
        data: buffer.toString('base64')
      };

      // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_019: [ The _sign method shall invoke this._restApiClient.executeApiCall to make the REST call on iotedged using the POST method. ]
      // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_025: [** The `_sign` method shall set the HTTP request option's `request` property to use the `http.request` object.
      // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_026: [** The `_sign` method shall set the HTTP request option's `port` property to use the workload URI's port if available.
      this._restApiClient.executeApiCall(
        'POST',
        path,
        { 'Content-Type': 'application/json' },
        signRequest,
        this._getRequestOptions(),
        (err, body: SignResponse, response) => {
          if (err) {
            signCallback(err, null);
          } else {
            // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_015: [ The _sign method shall invoke callback when the signature is available. ]
            signCallback(null, Buffer.from(body.digest, 'base64'));
          }
        });
    }, (err, sas) => {
      if (err) {
        callback(err);
      } else {
        callback(null, sas.toString());
      }
    });
  }

  private _getRequestOptions(): HttpRequestOptions {
    const requestOptions: HttpRequestOptions = {
      request: http_request,
    };
    if (this._workloadUri.port) {
      const port = parseInt(this._workloadUri.port);
      if (!isNaN(port)) {
        requestOptions.port = port;
      }
    }

    return requestOptions;
  }
}
