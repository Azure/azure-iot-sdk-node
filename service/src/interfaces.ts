// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { IncomingMessage } from 'http';
import { TripleValueCallback } from 'azure-iot-common';

export type IncomingMessageCallback<TResult> = TripleValueCallback<TResult, IncomingMessage>;

export type ResultWithIncomingMessage<TResult> = {
    result: TResult,
    message: IncomingMessage
};

export function createResultWithIncomingMessage<TResult>(result: TResult, message: IncomingMessage): ResultWithIncomingMessage<TResult> {
    return { result: result, message: message };
}

/**
 * Describes the parameters that are available for use with direct methods (also called device methods)
 */
export interface DeviceMethodParams {
    /**
     * The name of the method to call on the device.
     */
    methodName: string;
    /**
     * The method payload that will be sent to the device.
     */
    payload?: any;
    /**
     * The maximum time a device should take to respond to the method.
     */
    responseTimeoutInSeconds?: number;
    /**
     * The maximum time the service should try to connect to the device before declaring the device is unreachable.
     */
    connectTimeoutInSeconds?: number; // default is 0
}
