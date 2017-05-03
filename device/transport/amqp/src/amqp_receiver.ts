// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { endpoint, Message, results, Receiver } from 'azure-iot-common';
import { ClientConfig, DeviceMethodRequest, DeviceMethodResponse} from 'azure-iot-device';
import { AmqpDeviceMethodClient } from './amqp_device_method_client';
import { Amqp as BaseAmqpClient } from 'azure-iot-amqp-base';

/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_002: [The `AmqpReceiver` object shall inherit from the `EventEmitter` node object.]*/
export class AmqpReceiver extends EventEmitter implements Receiver {
  private _config: ClientConfig;
  private _amqpClient: BaseAmqpClient;
  private _deviceMethodClient: AmqpDeviceMethodClient;
  private _messagingEndpoint: string;

  constructor(config: ClientConfig, amqpClient: BaseAmqpClient, deviceMethodClient: AmqpDeviceMethodClient) {
    super();
    /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_001: [The `AmqpReceiver` constructor shall initialize a new instance of an `AmqpReceiver` object.]*/
    this._config = config;
    this._amqpClient = amqpClient;
    this._deviceMethodClient = deviceMethodClient;
    this._deviceMethodClient.on('errorReceived', (err) => {
      this.emit('errorReceived', err);
    });

    this._messagingEndpoint = endpoint.messagePath(encodeURIComponent(this._config.deviceId));

    const errorListener = (err) => {
      this.emit('errorReceived', err);
    };
    let errorListenerInitialized = false;

    /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_008: [The `AmqpReceiver` shall remove any new listener of the `message` or `errorReceived` event of the underlying message receiver if removed from its own `message` and `errorReceived` events.]*/
    this.on('removeListener', (eventName, eventCallback) => {
      if (eventName === 'message') {
        this._amqpClient.getReceiver(this._messagingEndpoint, (err, msgReceiver) => {
          msgReceiver.removeListener('message', eventCallback);
          if (msgReceiver.listeners('message').length === 0) {
            msgReceiver.removeListener('errorReceived', errorListener);
            errorListenerInitialized = false;
          }
        });
      }
    });

    /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_003: [The `AmqpReceiver` shall forward any new listener of the `message` or `errorReceived` events to the underlying message receiver.]*/
    this.on('newListener', (eventName, eventCallback) => {
      if (eventName === 'message') {
        this._amqpClient.getReceiver(this._messagingEndpoint, (err, msgReceiver) => {
          msgReceiver.on(eventName, eventCallback);
          if (!errorListenerInitialized) {
            msgReceiver.on('errorReceived', errorListener);
            errorListenerInitialized = true;
          }
        });
      }
    });
  }

  /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_004: [The `complete` method shall forward the `message` and `callback` arguments to the underlying message receiver.]*/
  complete(msg: Message, callback?: (err?: Error, result?: results.MessageCompleted) => void): void {
    this._amqpClient.getReceiver(this._messagingEndpoint, (err, msgReceiver) => {
      msgReceiver.complete(msg, callback);
    });
  }

  /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_005: [The `reject` method shall forward the `message` and `callback` arguments to the underlying message receiver.]*/
  reject(msg: Message, callback?: (err?: Error, result?: results.MessageRejected) => void): void {
    this._amqpClient.getReceiver(this._messagingEndpoint, (err, msgReceiver) => {
      msgReceiver.reject(msg, callback);
    });
  }

  /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_006: [The `abandon` method shall forward the `message` and `callback` arguments to the underlying message receiver.]*/
  abandon(msg: Message, callback?: (err?: Error, result?: results.MessageAbandoned) => void): void {
    this._amqpClient.getReceiver(this._messagingEndpoint, (err, msgReceiver) => {
      msgReceiver.abandon(msg, callback);
    });
  }

  /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_007: [The `onDeviceMethod` method shall forward the `methodName` and `methodCallback` arguments to the underlying `Amqp[DeviceMethodClient` object.]*/
  onDeviceMethod(methodName: string, methodCallback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
    this._deviceMethodClient.onDeviceMethod(methodName, methodCallback);
  }
}
