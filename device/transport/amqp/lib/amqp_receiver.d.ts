// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { EventEmitter } from 'events';
import { Receiver, Message } from 'azure-iot-common';
import { Amqp } from 'azure-iot-amqp-base';
import { Client, DeviceMethodRequest } from 'azure-iot-device';
import DeviceMethodClient = require('./amqp_device_method_client');

declare class AmqpReceiver extends EventEmitter implements Receiver {
    constructor(config: Client.Config, amqpClient: Amqp, deviceMethodClient: DeviceMethodClient);

    onDeviceMethod(methodName: string, callback: (request: DeviceMethodRequest) => void): void;

    on(type: 'message', func: (msg: Message) => void): this;
    on(type: 'errorReceived', func: (err: Error) => void): this;
    on(type: string, func: Function): this;

    complete(message: AmqpMessage, done?: (err: Error, result?: results.MessageCompleted) => void): void;
    abandon(message: AmqpMessage, done?: (err: Error, result?: results.MessageAbandoned) => void): void;
    reject(message: AmqpMessage, done?: (err: Error, result?: results.MessageRejected) => void): void;
}

export = AmqpReceiver;
