/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var dictionary_1 = require("./dictionary");
var errors_1 = require("./errors");
/**
 * Describes the parameters that enable a device or cloud application to connect to an Azure IoT hub.
 */
var ConnectionString = /** @class */ (function () {
    function ConnectionString() {
    }
    /**
     * Parses a string and returns the corresponding {@link azure-iot-common.ConnectionString} object.
     * @param {string}   source          string from which the connection string will be extracted
     * @param {string[]} requiredFields  array of strings listing the fields that are expected to be found.
     */
    ConnectionString.parse = function (source, requiredFields) {
        /*Codes_SRS_NODE_CONNSTR_05_001: [The input argument source shall be converted to string if necessary.]*/
        /*Codes_SRS_NODE_CONNSTR_05_002: [The parse method shall create a new instance of ConnectionString.]*/
        var connectionString = dictionary_1.createDictionary(source, ';');
        var err = 'The connection string is missing the property: ';
        /*Codes_SRS_NODE_CONNSTR_05_007: [If requiredFields is falsy, parse shall not validate fields.]*/
        requiredFields = requiredFields || [];
        /*Codes_SRS_NODE_CONNSTR_05_005: [The parse method shall throw ArgumentError if any of fields in the requiredFields argument are not found in the source argument.]*/
        requiredFields.forEach(function (key) {
            if (!(key in connectionString))
                throw new errors_1.ArgumentError(err + key);
        });
        /*Codes_SRS_NODE_CONNSTR_05_003: [It shall accept a string argument of the form 'name=value[;name=value…]' and for each name extracted it shall create a new property on the ConnectionString object instance.]*/
        /*Codes_SRS_NODE_CONNSTR_05_004: [The value of the property shall be the value extracted from the source argument for the corresponding name.]*/
        /*Codes_SRS_NODE_CONNSTR_05_006: [The generated ConnectionString object shall be returned to the caller.]*/
        return connectionString;
    };
    return ConnectionString;
}());
exports.ConnectionString = ConnectionString;
//# sourceMappingURL=connection_string.js.map