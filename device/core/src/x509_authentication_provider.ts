// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { AuthenticationProvider, AuthenticationType, errors, TransportConfig, X509 } from 'azure-iot-common';

export class X509AuthenticationProvider implements AuthenticationProvider {
  type: AuthenticationType = AuthenticationType.X509;
  private _credentials: TransportConfig;

  constructor(credentials: TransportConfig) {
    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_001: [The `constructor` shall store the credentials passed as argument.]*/
    this._credentials = credentials;
  }

  getDeviceCredentials(callback: (err: Error, credentials?: TransportConfig) => void): void {
    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_002: [The `getDeviceCredentials` method shall call its callback with a `null` error object and the stored device credentials as a second argument.]*/
    callback(null, this._credentials);
  }

  setX509Options(x509: X509): void {
    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_003: [The `setX509Options` method shall store the `X509` object passed as an argument with the existing credentials.]*/
    this._credentials.x509 = x509;
  }

  static fromX509Options(deviceId: string, iotHubHostname: string, x509info: X509): X509AuthenticationProvider {
    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_004: [The `fromX509Options` method shall throw a `ReferenceError` if `deviceId` is falsy.]*/
    if (!deviceId) {
      throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
    }

    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_005: [The `fromX509Options` method shall throw a `ReferenceError` if `iotHubHostname` is falsy.]*/
    if (!iotHubHostname) {
      throw new ReferenceError('iotHubHostname cannot be \'' + iotHubHostname + '\'');
    }

    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_006: [The `fromX509Options` method shall throw a `ReferenceError` if `x509info` is falsy.]*/
    if (!x509info) {
      throw new ReferenceError('x509info cannot be \'' + x509info + '\'');
    }

    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_007: [The `fromX509Options` method shall throw an `errors.ArgumentError` if `x509info.cert` is falsy.]*/
    if (!x509info.cert) {
      throw new errors.ArgumentError('x509info.cert cannot be \'' + x509info.cert + '\'');
    }

    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_008: [The `fromX509Options` method shall throw an `errors.ArgumentError` if `x509info.key` is falsy.]*/
    if (!x509info.key) {
      throw new errors.ArgumentError('x509info.key cannot be \'' + x509info.key + '\'');
    }

    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_009: [The `fromX509Options` method shall create a new instance of `X509AuthenticationProvider` with a credentials object created from the arguments.]*/
    return new X509AuthenticationProvider({
      deviceId: deviceId,
      host: iotHubHostname,
      x509: x509info
    });
  }
}
