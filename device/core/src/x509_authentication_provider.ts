// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { AuthenticationProvider, AuthenticationType, errors, TransportConfig, X509, Callback, callbackToPromise } from 'azure-iot-common';

/**
 * Provides an `AuthenticationProvider` object that can be created simply with an X509 certificate and key and is then used by the device client and transports to authenticate
 * with the Azure IoT hub instance.
 *
 * Unlike the `SharedAccessSignatureAuthenticationProvider` and `SharedAccessKeyAuthenticationProvider` objects, the `X509AuthenticationProvider` does not emit a `newTokenAvailable` event
 * since there are no token involved in X509 authentication. The transports will get the credentials using the `getDeviceCredentials` method.
 */
export class X509AuthenticationProvider implements AuthenticationProvider {
  type: AuthenticationType = AuthenticationType.X509;
  private _credentials: TransportConfig;

  /**
   * @private
   */
  constructor(credentials: TransportConfig) {
    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_001: [The `constructor` shall store the credentials passed as argument.]*/
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
      /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_002: [The `getDeviceCredentials` method shall call its callback with a `null` error object and the stored device credentials as a second argument.]*/
      _callback(null, this._credentials);
    }, callback);
  }

  /**
   * Updates the certificate and key used by the device to connect and authenticate with an Azure IoT hub instance.
   * @param x509 The `X509` object containing the certificate and key.
   */
  setX509Options(x509: X509): void {
    /*Codes_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_003: [The `setX509Options` method shall store the `X509` object passed as an argument with the existing credentials.]*/
    this._credentials.x509 = x509;
  }

  /**
   * Creates a new `X509AuthenticationProvider` from an `X509` object containing a certificate and key.
   *
   * @param deviceId         The device identifier.
   * @param iotHubHostname   The host name of the Azure IoT hub instance the device should connect to.
   * @param x509info         An `X509` object containing a certificate and key that the device can use to authenticate with the Azure IoT hub instance.
   */
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
