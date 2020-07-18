// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_common_2 = require("azure-iot-common");
// tslint:disable-next-line:no-var-requires
var packageJson = require('../package.json');
function getUserAgentString(productInfoOrDone, doneOrNone) {
    var productInfo;
    var done;
    /*Codes_SRS_NODE_DEVICE_UTILS_41_001: [`getUserAgentString` shall not add any custom product Info if a `falsy` value is passed in as the first arg.]*/
    if (!productInfoOrDone) {
        productInfo = '';
        done = doneOrNone;
    }
    else {
        switch (typeof (productInfoOrDone)) {
            /*Codes_SRS_NODE_DEVICE_UTILS_41_002: [`getUserAgentString` shall accept productInfo as a `string` so that the callback is called with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)<productInfo>'.]*/
            case 'string': {
                productInfo = productInfoOrDone;
                done = doneOrNone;
                break;
            }
            case 'function': {
                productInfo = '';
                done = productInfoOrDone;
                break;
            }
            /*Codes_SRS_NODE_DEVICE_UTILS_41_003: [`getUserAgentString` shall throw if the first arg is not `falsy`, or of type `string` or `function`.]*/
            default:
                throw new TypeError('Error: productInfo must be of type \'string\'');
        }
    }
    return azure_iot_common_2.noErrorCallbackToPromise(function (_callback) {
        /*Codes_SRS_NODE_DEVICE_UTILS_18_001: [`getUserAgentString` shall call `getAgentPlatformString` to get the platform string.]*/
        azure_iot_common_1.getAgentPlatformString(function (platformString) {
            /*Codes_SRS_NODE_DEVICE_UTILS_18_002: [`getUserAgentString` shall call its `callback` with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)<productInfo>'.]*/
            _callback(packageJson.name + '/' + packageJson.version + ' (' + platformString + ')' + productInfo);
        });
    }, done);
}
exports.getUserAgentString = getUserAgentString;
//# sourceMappingURL=utils.js.map