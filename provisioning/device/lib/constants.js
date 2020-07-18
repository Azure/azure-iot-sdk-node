// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line:no-var-requires
var packageJson = require('../package.json');
/**
 * @private
 */
var ProvisioningDeviceConstants = /** @class */ (function () {
    function ProvisioningDeviceConstants() {
    }
    /**
     * User-Agent string passed to the service as part of communication
     */
    ProvisioningDeviceConstants.userAgent = packageJson.name + '/' + packageJson.version;
    /**
     * Default interval for polling, to use in case service doesn't provide it to us.
     */
    ProvisioningDeviceConstants.defaultPollingInterval = 2000;
    /**
     * apiVersion to use while communicating with service.
     */
    ProvisioningDeviceConstants.apiVersion = '2019-03-31';
    /**
     * default timeout to use when communicating with the service
     */
    ProvisioningDeviceConstants.defaultTimeoutInterval = 30000;
    return ProvisioningDeviceConstants;
}());
exports.ProvisioningDeviceConstants = ProvisioningDeviceConstants;
//# sourceMappingURL=constants.js.map