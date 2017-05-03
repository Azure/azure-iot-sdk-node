// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { SharedAccessSignature } from 'azure-iot-common';
import { X509, results, Message, Receiver } from 'azure-iot-common';
import { DeviceMethodResponse } from './device_method';
import { Client } from './client';

export interface BatchingTransport extends Client.Transport {
  sendEventBatch(messages: Message[], done: (err: Error, result?: results.MessageEnqueued) => void): void;
}

export interface StableConnectionTransport extends Client.Transport {
  connect(done: (err?: Error, result?: results.Connected) => void): void;
  disconnect(done: (err?: Error, result?: results.Disconnected) => void): void;
}

export interface TwinTransport extends Client.Transport {
  getTwinReceiver(done: (err?: Error, receiver?: Receiver) => void): void;
  sendTwinRequest(method: string, resource: string, properties: { [key: string]: any }, body: any, done?: (err?: Error, result?: any) => void): void;
}

export interface MethodMessage {
  methods: { methodName: string; };
  requestId: string;
  properties: { [key: string]: string; };
  body: Buffer;
  verb: string;
}

export interface DeviceMethodTransport extends Client.Transport {
  sendMethodResponse(response: DeviceMethodResponse, done?: (err?: Error, result?: any) => void): void;
}

export interface DeviceMethodReceiver extends Receiver {
  onDeviceMethod(methodName: string, callback: (message: MethodMessage) => void): void;
}

export interface ClientConfig {
  deviceId: string;
  host: string;
  hubName: string;
  symmetricKey?: string;
  sharedAccessSignature?: string | SharedAccessSignature;
  x509?: X509;
}
