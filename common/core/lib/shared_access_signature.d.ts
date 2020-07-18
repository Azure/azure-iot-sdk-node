/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
import * as authorization from './authorization';
/**
 * Shared access signature tokens are used to authenticate the connection when using symmetric keys (as opposed to x509 certificates) to secure the connection with the Azure IoT hub.
 */
export declare class SharedAccessSignature {
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
    private _key;
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
    extend(expiry: number): string;
    /**
     * @method          module:azure-iot-common.SharedAccessSignature#toString
     * @description     Formats a SharedAccessSignatureObject into a properly formatted string.
     *
     * @returns {String} A properly formatted shared access signature token.
     */
    toString(): string;
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
    static create(resourceUri: string, keyName: string, key: string, expiry: number | string): SharedAccessSignature;
    /**
     * @private
     */
    static createWithSigningFunction(credentials: authorization.TransportConfig, expiry: number, signingFunction: Function, callback: (err: Error, sas?: SharedAccessSignature) => void): void;
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
    static parse(source: string, requiredFields?: string[]): SharedAccessSignature;
}
