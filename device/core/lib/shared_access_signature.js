// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
/**
 * Creates a shared access signature token to authenticate a device connection with an Azure IoT hub.
 *
 * @param {string}  host      Hostname of the Azure IoT hub.
 * @param {string}  deviceId  Unique device identifier as it exists in the device registry.
 * @param {string}  key       Symmetric key to use to create shared access signature tokens.
 * @param {string}  expiry    Expiry time for the token that will be created.
 *
 * @throws {ReferenceError}  If one of the parameters is falsy.
 *
 * @returns {SharedAccessSignature}  A shared access signature to be used to connect with an Azure IoT hub.
 */
function create(host, deviceId, key, expiry) {
    /*Codes_SRS_NODE_DEVICE_SAS_05_004: [<urlEncodedDeviceId> shall be the URL-encoded value of deviceId.]*/
    var uri = azure_iot_common_1.encodeUriComponentStrict(host + '/devices/' + deviceId);
    /*Codes_SRS_NODE_DEVICE_SAS_05_003: [The create method shall return the result of calling azure-iot-common.SharedAccessSignature.create with following arguments:
    resourceUri - host + '%2Fdevices%2F' + <urlEncodedDeviceId>
    keyName - null
    key - key
    expiry - expiry]*/
    return azure_iot_common_1.SharedAccessSignature.create(uri, null, key, expiry);
}
exports.create = create;
/**
 * Parses a string in the format of a Shared Access Signature token and returns a {@link SharedAccessSignature}.
 *
 * @param source A shared access signature string.
 * @returns {SharedAccessSignature}  An object containing the different shared access signature properties extracted from the string given as a parameter
 *
 * @throws {FormatError}  If the string cannot be parsed or is missing required parameters.
 */
function parse(source) {
    /*Codes_SRS_NODE_DEVICE_SAS_05_001: [The parse method shall return the result of calling azure-iot-common.SharedAccessSignature.parse.]*/
    /*Codes_SRS_NODE_DEVICE_SAS_05_002: [It shall throw ArgumentError if any of 'sr', 'sig', 'se' fields are not found in the source argument.]*/
    return azure_iot_common_1.SharedAccessSignature.parse(source, ['sr', 'sig', 'se']);
}
exports.parse = parse;
//# sourceMappingURL=shared_access_signature.js.map