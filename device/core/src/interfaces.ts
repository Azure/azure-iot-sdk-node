// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { SharedAccessSignature } from 'azure-iot-common';
import { X509, results, Message, Receiver } from 'azure-iot-common';
import { DeviceMethodResponse } from './device_method';
import { Client } from './client';

/**
 * @private
 * Describes the specific methods that a transport should implement to support device-to-cloud message batching.
 */
export interface BatchingTransport extends Client.Transport {
  sendEventBatch(messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;
}

/**
 * @private
 * Describes the specific methods that a transport should implement to support connecting and disconnecting long-running connections (such as AMQP or MQTT and unlike HTTP).
 */
export interface StableConnectionTransport extends Client.Transport {
  connect(done: (err?: Error, result?: results.Connected) => void): void;
  disconnect(done: (err?: Error, result?: results.Disconnected) => void): void;
}

/**
 * @private
 * Describes the specific methods that a transport should implement to the Device Twin feature (see {@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins|Understanding Azure IoT Hub Device Twins}.
 */
export interface TwinTransport extends Client.Transport {
  getTwinReceiver(done: (err?: Error, receiver?: Receiver) => void): void;
  sendTwinRequest(method: string, resource: string, properties: { [key: string]: any }, body: any, done?: (err?: Error, result?: any) => void): void;
}

/**
 * @private
 * @deprecated
 */
export interface MethodMessage {
  methods: { methodName: string; };
  requestId: string;
  properties: { [key: string]: string; };
  body: Buffer;
  verb: string;
}

/**
 * @private
 * Describes the specific methods that a transport should implement to thed Direct Methods feature (see {@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-direct-methods|Understanding Azure IoT Hub Direct Methods}.
 */
export interface DeviceMethodTransport extends Client.Transport {
  sendMethodResponse(response: DeviceMethodResponse, done?: (err?: Error, result?: any) => void): void;
  onDeviceMethod(methodName: string, callback: (message: MethodMessage) => void): void;
  enableMethods(callback: (err?: Error) => void): void;
  disableMethods(callback: (err?: Error) => void): void;
}

/**
 * @private
 * Configuration parameters used to authenticate and connect a Device Client with an Azure IoT hub.
 */
export interface ClientConfig {
  /**
   * Device unique identifier (as it exists in the device registry).
   */
  deviceId: string;
  /**
   * Hostname of the Azure IoT hub. (<IoT hub name>.azure-devices.net).
   */
  host: string;
  /**
   * Name of the Azure IoT hub. (The first section of the Azure IoT hub hostname)
   */
  hubName: string;
  /**
   * If using symmetric key authentication, this is used to generate the shared access signature tokens used to authenticate the connection.
   */
  symmetricKey?: string;
  /**
   * The shared access signature token used to authenticate the connection with the Azure IoT hub.
   */
  sharedAccessSignature?: string | SharedAccessSignature;
  /**
   * Structure containing the certificate and associated key used to authenticate the connection if using x509 certificates as the authentication method.
   */
  x509?: X509;
}
