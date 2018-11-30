// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { EventEmitter } from 'events';
import { AuthenticationProvider, AuthenticationType, SharedAccessSignature, TransportConfig, Callback, callbackToPromise } from 'azure-iot-common';

/**
 * Provides an `AuthenticationProvider` object that can be created simply with a shared access signature and is then used by the device client and transports to authenticate
 * with the Azure IoT hub instance.
 *
 * The `SharedAccessSignatureAuthenticationProvider` object does not renew the shared access signature token automatically, so the user needs to feed non-expired shared access signature
 * tokens to it using the `updateSharedAccessSignature` method. For each call to this method, the `SharedAccessSignatureAuthenticationProvider` will emit a `newTokenAvailable` event that
 * transports will use to authenticate with the Azure IoT hub instance.
 */
export class SharedAccessSignatureAuthenticationProvider extends EventEmitter implements AuthenticationProvider {
  type: AuthenticationType = AuthenticationType.Token;
  private _credentials: TransportConfig;

  /**
   * @private
   *
   * Initializes a new instance of the SharedAccessSignatureAuthenticationProvider - users should only use the factory methods though.
   *
   * @param credentials       Credentials to be used by the device to connect to the IoT hub.
   * @param securityProvider  Object used to sign the tokens that are going to be used during authentication.
   */
  constructor(credentials: TransportConfig) {
    super();
    /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_001: [The `constructor` shall store the credentials passed in the `credentials` argument.]*/
    this._credentials = credentials;
  }

  /**
   * This method is used by the transports to gets the most current device credentials in the form of a `TransportConfig` object.
   *
   * @param [callback] optional function that will be called with either an error or a set of device credentials that can be used to authenticate with the IoT hub.
   * @returns {Promise<TransportConfig> | void} Promise if no callback function was passed, void otherwise.
   */
  getDeviceCredentials(callback: Callback<TransportConfig>): void;
  getDeviceCredentials(): Promise<TransportConfig>;
  getDeviceCredentials(callback?: Callback<TransportConfig>): Promise<TransportConfig> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_002: [The `getDeviceCredentials` method shall call its callback with a `null` error parameter and the stored `credentials` object containing the current device credentials.]*/
      _callback(null, this._credentials);
    }, callback);
  }

  /**
   * does nothing and returns - this is part of the token-based authentication provider API but there are no resources to stop/free here.
   */
  stop(): void {
    /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_007: [The `stop` method shall simply return since there is no timeout or resources to clear.]*/
    return;
  }

  /**
   * Updates the shared access signature token that transports should use to authenticate. When called, the `SharedAccessSignatureAuthenticationProvider` will emit
   * a `newTokenAvailable` event that the transports can then use to authenticate with the Azure IoT hub instance.
   *
   * @param sharedAccessSignature         A shared access signature string containing the required parameters for authentication with the IoT hub.
   */
  updateSharedAccessSignature(sharedAccessSignature: string): void {
    /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_003: [The `updateSharedAccessSignature` method shall update the stored credentials with the new `sharedAccessSignature` value passed as an argument.]*/
    this._credentials.sharedAccessSignature = sharedAccessSignature;
    /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_004: [The `updateSharedAccessSignature` method shall emit a `newTokenAvailable` event with the updated credentials.]*/
    this.emit('newTokenAvailable', this._credentials);
  }

  /**
   * Creates a new `SharedAccessSignatureAuthenticationProvider` from a connection string
   *
   * @param sharedAccessSignature         A shared access signature string containing the required parameters for authentication with the IoT hub.
   */
  static fromSharedAccessSignature(sharedAccessSignature: string): SharedAccessSignatureAuthenticationProvider {
    if (!sharedAccessSignature) {
      /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_005: [The `fromSharedAccessSignature` method shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
      throw new ReferenceError('sharedAccessSignature cannot be \'' + sharedAccessSignature + '\'');
    }
    const sas: SharedAccessSignature = SharedAccessSignature.parse(sharedAccessSignature);
    const decodedUri = decodeURIComponent(sas.sr);
    const uriSegments = decodedUri.split('/');
    const credentials: TransportConfig = {
      host: uriSegments[0],
      deviceId: uriSegments[uriSegments.length - 1],
      sharedAccessSignature: sharedAccessSignature
    };

    /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_006: [The `fromSharedAccessSignature` shall return a new `SharedAccessSignatureAuthenticationProvider` object initialized with the credentials parsed from the `sharedAccessSignature` argument.]*/
    return new SharedAccessSignatureAuthenticationProvider(credentials);
  }
}
