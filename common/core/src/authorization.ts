/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

import * as crypto from 'crypto';

/**
 * Returns the seconds elapsed since 1 January 1970 00:00:00 UTC until one
 * hour from now.
 *
 * @function anHourFromNow
 */
export function anHourFromNow(): number {
  const raw = (Date.now() / 1000) + 3600;
  return Math.ceil(raw);
}

/*Codes_SRS_NODE_COMMON_AUTHORIZATION_05_004: [<urlEncodedSignature> shall be the URL-encoded <signature>.]*/
/*Codes_SRS_NODE_COMMON_AUTHORIZATION_05_007: [<urlEncodedKeyName> shall be the URL-encoded <keyName>.]*/
export function encodeUriComponentStrict(str: string): string {
  // this stricter version of encodeURIComponent is a recommendation straight out of the MDN docs, see:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent#Description
  return encodeURIComponent(str).replace(/[!'()*]/g, function (c: string): string {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

/*Codes_SRS_NODE_COMMON_AUTHORIZATION_05_006: [<stringToSign> shall be a concatenation of <resourceUri> + '\n' + <expiry>.]*/
export function stringToSign(resourceUri: string, expiry: string): string {
  return resourceUri + '\n' + expiry;
}

/*Codes_SRS_NODE_COMMON_AUTHORIZATION_05_005: [<signature> shall be an HMAC-SHA256 hash of <stringToSign>, which is then base64-encoded.]*/
/*Codes_SRS_NODE_COMMON_AUTHORIZATION_05_011: [The crypto algorithm should directly convert from base64 encoded password buffer to ensure JS compatibility]*/
export function hmacHash(password: string, stringToSign: string): string {
  const hmac = crypto.createHmac('sha256', Buffer.from(password, 'base64'));
  hmac.update(stringToSign);
  return hmac.digest('base64');
}

/**
 * Configuration structure used by transports and `AuthenticationProvider` objects to store and exchange credentials.
 *
 */
export interface TransportConfig {
  /**
   * Hostname of the Azure IoT hub instance.
   */
  host: string;
  /**
   * Device unique identifier.
   */
  deviceId: string;
  /**
   * Module unique identifier.
   */
  moduleId?: string;
  /**
   * Shared access signature security token used to authenticate a device when token-based authentication is used.
   */
  sharedAccessSignature?: string;
  /**
   * Name of the policy which shared access key is used to sign security tokens.
   */
  sharedAccessKeyName?: string;
  /**
   * Shared access key is used to sign security tokens.
   */
  sharedAccessKey?: string;
  /**
   * Object containing the certificate and key used by the device to connect and authenticate with the Azure IoT hub instance.
   */
  x509?: X509;
  /**
   * IP address or internet name of the host machine working as a device or protocol gateway.  Used when communicating with Azure Edge devices.
   */
  gatewayHostName?: string;
}

/**
 * Object used to store an X509 certificate and key for transports to use.
 *
 * This is passed directly down to the low-level objects used by Node.js to connect the TLS socket.
 * https://nodejs.org/api/tls.html#tls_tls_connect_options_callback
 */
export interface X509 {
  /**
   * X509 Certificate.
   */
  cert?: string | string[] | Buffer | Buffer[];

  /**
   * Key associated with the X509 certificate.
   */
  key?: string | Buffer;

  /**
   * Passphrase used to decode the key associated with the X509 certificate.
   */
  passphrase?: string;

  /**
   * Name of an OpenSSL engine which can provide the client certificate.
   */
  clientCertEngine?: string;

  /**
   * @private
   */

   certFile?: string;
  /**
   * @private
   */
  keyFile?: string;
}
