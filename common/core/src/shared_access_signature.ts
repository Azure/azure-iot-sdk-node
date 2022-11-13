/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

import * as authorization from './authorization';
import { Callback } from './promise_utils';
import { ArgumentError, FormatError } from './errors';
import { createDictionary } from './dictionary';

/**
 * Shared access signature tokens are used to authenticate the connection when using symmetric keys (as opposed to x509 certificates) to secure the connection with the Azure IoT hub.
 */
export class SharedAccessSignature {
  /**
   * @private
   */
  sr: string;
  /**
   * @private
   */
  se: string | number;
  /**
   * @private
   */
  sig: string;
  /**
   * @private
   */
  skn: string;
  private _key: string;

  /**
   * @method          module:azure-iot-common.SharedAccessSignature.extend
   * @description     Extend the Sas and return the string form of it.
   *
   * @param {Integer} expiry          an integer value representing the number of seconds since the epoch 00:00:00 UTC on 1 January 1970.
   *
   * @throws {ReferenceError}         Will be thrown if the argument is falsy.
   *
   * @returns {string} The string form of the shared access signature.
   *
   */
  extend(expiry: number): string {
    if (!expiry) throw new ReferenceError('expiry' + ' is ' + expiry);
    this.se = expiry;
    this.sig = authorization.encodeUriComponentStrict(authorization.hmacHash(this._key, authorization.stringToSign(this.sr, this.se.toString())));
    return this.toString();
  }

  /**
   * @method          module:azure-iot-common.SharedAccessSignature#toString
   * @description     Formats a SharedAccessSignatureObject into a properly formatted string.
   *
   * @returns {String} A properly formatted shared access signature token.
   */
  toString(): string {
    /*Codes_SRS_NODE_COMMON_SAS_05_019: [The toString method shall return a shared-access signature token of the form:
    SharedAccessSignature sr=<url-encoded resourceUri>&sig=<urlEncodedSignature>&se=<expiry>&skn=<urlEncodedKeyName>]*/
    let sas = 'SharedAccessSignature ';
    ['sr', 'sig', 'skn', 'se'].forEach((key: string): void => {
      /*Codes_SRS_NODE_COMMON_SAS_05_020: [The skn segment is not part of the returned string if the skn property is not defined.]*/
      if (this[key]) {
        if (sas[sas.length - 1] !== ' ') sas += '&';
        sas += key + '=' + this[key];
      }
    });

    return sas;
  }

  /**
   * @method          module:azure-iot-common.SharedAccessSignature.create
   * @description     Instantiate a SharedAccessSignature token with the given parameters.
   *
   * @param {String}  resourceUri     the resource URI to encode into the token.
   * @param {String}  keyName         an identifier associated with the key.
   * @param {String}  key             a base64-encoded key value.
   * @param {Integer} expiry          an integer value representing the number of seconds since the epoch 00:00:00 UTC on 1 January 1970.
   *
   * @throws {ReferenceError}         Will be thrown if one of the arguments is falsy.
   *
   * @returns {SharedAccessSignature} A shared access signature token.
   */
  /*Codes_SRS_NODE_COMMON_SAS_05_008: [The create method shall accept four arguments:
      resourceUri - the resource URI to encode into the token
      keyName - an identifier associated with the key
      key - a base64-encoded key value
      expiry - an integer value representing the number of seconds since the epoch 00:00:00 UTC on 1 January 1970.]*/
  static create(resourceUri: string, keyName: string, key: string, expiry: number | string): SharedAccessSignature {
    function throwRef(name: string, value: any): void {
      throw new ReferenceError('Argument \'' + name + '\' is ' + value);
    }

    /*Codes_SRS_NODE_COMMON_SAS_05_009: [If resourceUri, key, or expiry are falsy (i.e., undefined, null, or empty), create shall throw ReferenceException.]*/
    if (!resourceUri) throwRef('resourceUri', resourceUri);
    if (!key) throwRef('key', key);
    if (!expiry) throwRef('expiry', expiry);

    /*Codes_SRS_NODE_COMMON_SAS_05_010: [The create method shall create a new instance of SharedAccessSignature with properties: sr, sig, se, and optionally skn.]*/
    const sas = new SharedAccessSignature();
    sas._key = key;
    /*Codes_SRS_NODE_COMMON_SAS_05_011: [The sr property shall have the value of resourceUri.]*/
    sas.sr = resourceUri;
    /*Codes_SRS_NODE_COMMON_SAS_05_018: [If the keyName argument to the create method was falsy, skn shall not be defined.]*/
    /*Codes_SRS_NODE_COMMON_SAS_05_017: [<urlEncodedKeyName> shall be the URL-encoded value of keyName.]*/
    /*Codes_SRS_NODE_COMMON_SAS_05_016: [The skn property shall be the value <urlEncodedKeyName>.]*/
    if (keyName) sas.skn = authorization.encodeUriComponentStrict(keyName);
    /*Codes_SRS_NODE_COMMON_SAS_05_015: [The se property shall have the value of expiry.]*/
    sas.se = expiry;
    /*Codes_SRS_NODE_COMMON_SAS_05_013: [<signature> shall be an HMAC-SHA256 hash of the value <stringToSign>, which is then base64-encoded.]*/
    /*Codes_SRS_NODE_COMMON_SAS_05_014: [<stringToSign> shall be a concatenation of resourceUri + '\n' + expiry.]*/
    /*Codes_SRS_NODE_COMMON_SAS_05_012: [The sig property shall be the result of URL-encoding the value <signature>.]*/
    sas.sig = authorization.encodeUriComponentStrict(authorization.hmacHash(sas._key, authorization.stringToSign(sas.sr, sas.se.toString())));
    return sas;
  }


/**
 * @private
 */
static createWithSigningFunction(credentials: authorization.TransportConfig, expiry: number, signingFunction: (stringToSign: any, callback: Callback<any>) => void, callback: (err: Error, sas?: SharedAccessSignature) => void): void {
  function throwRef(name: string, value: any): void {
    throw new ReferenceError('Argument \'' + name + '\' is ' + value);
  }

  /*Codes_SRS_NODE_COMMON_SAS_06_001: [If `credentials`, `expiry`, `signingFunction`, or `callback` are falsy, `createWithSigningFunction` shall throw `ReferenceError`.] */
  if (!credentials) throwRef('credentials', credentials);
  if (!expiry) throwRef('expiry', expiry);
  if (!signingFunction) throwRef('signingFunction', signingFunction);
  if (!callback) throwRef('callback', callback);
  const sas = new SharedAccessSignature();
  /*Codes_SRS_NODE_COMMON_SAS_06_002: [The `createWithSigningFunction` shall create a `SharedAccessSignature` object with an `sr` property formed by url encoding `credentials.host` + `/devices/` + `credentials.deviceId` + `/modules/` + `credentials.moduleId`.] */
  let resource = credentials.host + '/devices/' + credentials.deviceId;
  if (credentials.moduleId) {
    resource += `/modules/${credentials.moduleId}`;
  }
  sas.sr = authorization.encodeUriComponentStrict(resource);
  /*Codes_SRS_NODE_COMMON_SAS_06_003: [** The `createWithSigningFunction` shall create a `SharedAccessSignature` object with an `se` property containing the value of the parameter `expiry`.] */
  sas.se = expiry;
  /*Codes_SRS_NODE_COMMON_SAS_06_004: [The `createWithSigningFunction` shall create a `SharedAccessSignature` object with an optional property `skn`, if the `credentials.sharedAccessKeyName` is not falsy,  The value of the `skn` property will be the url encoded value of `credentials.sharedAccessKeyName`.] */
  if (credentials.sharedAccessKeyName) {
    sas.skn = authorization.encodeUriComponentStrict(credentials.sharedAccessKeyName);
  }
  signingFunction(Buffer.from(authorization.stringToSign(sas.sr, sas.se.toString())), (err, signed) => {
    if (err) {
      /*Codes_SRS_NODE_COMMON_SAS_06_006: [** The `createWithSigningFunction` will invoke the `callback` function with an error value if an error occurred during the signing. **] */
      callback(err);
    } else {
      /*Codes_SRS_NODE_COMMON_SAS_06_005: [The `createWithSigningFunction` shall create a `SharedAccessSignature` object with a `sig` property with the SHA256 hash of the string sr + `\n` + se.  The `sig` value will first be base64 encoded THEN url encoded.] */
      sas.sig = authorization.encodeUriComponentStrict(signed.toString('base64'));
      callback(null, sas);
    }
  });
}

/**
 * @method          module:azure-iot-common.SharedAccessSignature.parse
 * @description     Instantiate a SharedAccessSignature token from a string.
 *
 * @param {String}  source          the string to parse in order to create the SharedAccessSignature token.
 * @param {Array}   requiredFields  an array of fields that we expect to find in the source string.
 *
 * @throws {FormatError}            Will be thrown if the source string is malformed.
 *
 * @returns {SharedAccessSignature} A shared access signature token.
 */
  static parse(source: string, requiredFields?: string[]): SharedAccessSignature {
    /*Codes_SRS_NODE_COMMON_SAS_05_001: [The input argument source shall be converted to string if necessary.]*/
    const parts = String(source).split(/\s/);
    /*Codes_SRS_NODE_COMMON_SAS_05_005: [The parse method shall throw FormatError if the shared access signature string does not start with 'SharedAccessSignature<space>'.]*/
    if (parts.length !== 2 || !parts[0].match(/SharedAccessSignature/)) {
      throw new FormatError('Malformed signature');
    }

    const dict = createDictionary(parts[1], '&');
    const err = 'The shared access signature is missing the property: ';

    requiredFields = requiredFields || [];

    /*Codes_SRS_NODE_COMMON_SAS_05_006: [The parse method shall throw ArgumentError if any of fields in the requiredFields argument are not found in the source argument.]*/
    requiredFields.forEach((key: string): void => {
      if (!(key in dict)) throw new ArgumentError(err + key);
    });

    /*Codes_SRS_NODE_COMMON_SAS_05_002: [The parse method shall create a new instance of SharedAccessSignature.]*/
    const sas = new SharedAccessSignature();

    /*Codes_SRS_NODE_COMMON_SAS_05_003: [It shall accept a string argument of the form 'name=value[&name=value…]' and for each name extracted it shall create a new property on the SharedAccessSignature object instance.]*/
    /*Codes_SRS_NODE_COMMON_SAS_05_004: [The value of the property shall be the value extracted from the source argument for the corresponding name.]*/
    Object.keys(dict).forEach((key: string): void => {
      sas[key] = dict[key];
    });

    /*Codes_SRS_NODE_COMMON_SAS_05_007: [The generated SharedAccessSignature object shall be returned to the caller.]*/
    return sas;
  }
}
