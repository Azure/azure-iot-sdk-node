// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { IncomingMessage } from 'http';

/**
 * @private
 */
export type Callback<T> = (err?: Error, result?: T, response?: IncomingMessage) => void;

/**
 * Describes the parameters that are available for use with direct methods (also called device methods)
 *
 * @instance {string} methodName                The name of the method to call on the device.
 * @instance {object} payload                   The method payload that will be sent to the device.
 * @instance {number} responseTimeoutInSeconds  The maximum time a device should take to respond to the method.
 * @instance {number} connectTimeoutInSeconds   The maximum time the service should try to connect to the device before declaring the device is unreachable.
 */
export interface DeviceMethodParams {
    methodName: string;
    payload?: any;
    responseTimeoutInSeconds?: number;
    connectTimeoutInSeconds?: number; // default is 0
}
