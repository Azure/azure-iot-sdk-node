// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { EventEmitter } from 'events';
import { AuthenticationProvider, AuthenticationType, SharedAccessSignature, TransportConfig } from 'azure-iot-common';

export class SharedAccessSignatureAuthenticationProvider extends EventEmitter implements AuthenticationProvider {
  type: AuthenticationType = AuthenticationType.Token;
  private _credentials: TransportConfig;

  /**
   * @private
   *
   * Initializes a new instance of the TokenAuthenticationProvider - users should only use the factory methods though.
   *
   * @param credentials       Credentials to be used by the device to connect to the IoT hub.
   * @param securityProvider  Object used to sign the tokens that are going to be used during authentication.
   */
  constructor(credentials: TransportConfig) {
    super();
    /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_001: [The `constructor` shall store the credentials passed in the `credentials` argument.]*/
    this._credentials  = credentials;
  }

  getDeviceCredentials(callback: (err: Error, credentials: TransportConfig) => void): void {
    /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_002: [The `getDeviceCredentials` method shall call its callback with a `null` error parameter and the stored `credentials` object containing the current device credentials.]*/
    callback(null, this._credentials);
  }

  updateSharedAccessSignature(sharedAccessSignature: string): void {
    /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_003: [The `updateSharedAccessSignature` method shall update the stored credentials with the new `sharedAccessSignature` value passed as an argument.]*/
    this._credentials.sharedAccessSignature = sharedAccessSignature;
    /*Codes_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_004: [The `updateSharedAccessSignature` method shall emit a `newTokenAvailable` event with the updated credentials.]*/
    this.emit('newTokenAvailable', this._credentials);
  }

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
