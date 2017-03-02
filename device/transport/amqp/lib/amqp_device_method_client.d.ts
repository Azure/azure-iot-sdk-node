// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { EventEmitter } from 'events';
import { Amqp } from 'azure-iot-amqp-base';
import { Client, DeviceMethodRequest, DeviceMethodResponse } from 'azure-iot-device';

declare class AmqpDeviceMethodClient extends EventEmitter {
    constructor(config: Client.Config, amqpClient: Amqp);

    onDeviceMethod(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void;
    sendMethodResponse(response: DeviceMethodResponse, done?: (err: Error) => void): void;
}

export = AmqpDeviceMethodClient;
