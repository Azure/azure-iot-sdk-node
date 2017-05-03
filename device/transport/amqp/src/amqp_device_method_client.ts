// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import machina = require('machina');
import * as dbg from 'debug';
const debug = dbg('azure-iot-device-amqp.AmqpDeviceMethodClient');

import { Message, errors, endpoint } from 'azure-iot-common';
import { ClientConfig, DeviceMethodRequest, DeviceMethodResponse } from 'azure-iot-device';
import { Amqp as BaseAmqpClient } from 'azure-iot-amqp-base';

const methodMessagePropertyKeys = {
  methodName: 'IoThub-methodname',
  status: 'IoThub-status'
};

export class AmqpDeviceMethodClient extends EventEmitter {
  private _config: ClientConfig;
  private _amqpClient: any;
  private _methodEndpoint: string;
  private _methodReceiverInitialized: boolean;
  private _fsm: any;

  constructor(config: ClientConfig, amqpClient: BaseAmqpClient) {
    super();
    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_001: [The `AmqpDeviceMethodClient` shall throw a `ReferenceError` if the `config` argument is falsy.]*/
    if (!config) {
      throw new ReferenceError('\'config\' cannot be \'' + config + '\'');
    }

    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_002: [The `AmqpDeviceMethodClient` shall throw a `ReferenceError` if the `amqpClient` argument is falsy.]*/
    if (!amqpClient) {
      throw new ReferenceError('\'amqpClient\' cannot be \'' + amqpClient + '\'');
    }

    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_003: [The `AmqpDeviceMethodClient` shall inherit from the `EventEmitter` class.]*/
    this._config = config;
    this._amqpClient = amqpClient;
    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_017: [The endpoint used to for the sender and receiver link shall be `/devices/<device-id>/methods/devicebound`.]*/
    this._methodEndpoint = endpoint.devicePath(encodeURIComponent(this._config.deviceId)) + '/methods/devicebound';
    this._methodReceiverInitialized = false;

    this._fsm = new machina.Fsm({
      namespace: 'device-method-client',
      initialState: 'disconnected',
      states: {
        'disconnected': {
          sendMethodResponse: () => {
            this._fsm.deferUntilTransition('connected');
            this._fsm.transition('connecting');
          },
          onDeviceMethod: () => {
            this._fsm.deferUntilTransition('connected');
            this._fsm.transition('connecting');
          }
        },
        'connecting': {
          _onEnter: () => {
            const linkOptions = {
              attach: {
                properties: {
                  'com.microsoft:api-version': endpoint.apiVersion,
                  'com.microsoft:channel-correlation-id': this._config.deviceId
                }
              }
            };

            this._amqpClient.attachSenderLink(this._methodEndpoint, linkOptions, (err) => {
              if (err) {
                this._fsm.transition('disconnected');
                this.emit('errorReceived', err);
              } else {
                this._amqpClient.attachReceiverLink(this._methodEndpoint, linkOptions, (err) => {
                  if (err) {
                    this._fsm.transition('disconnected');
                    this.emit('errorReceived', err);
                  } else {
                    this._fsm.transition('connected');
                  }
                });
              }
            });
          },
          sendMethodResponse: () => {
            this._fsm.deferUntilTransition('connected');
            this._fsm.transition('connecting');
          },
          onDeviceMethod: () => {
            this._fsm.deferUntilTransition('connected');
            this._fsm.transition('connecting');
          }
        },
        'connected': {
          sendMethodResponse: (response, callback) => {
            let message = new Message(JSON.stringify(response.payload));
            message.correlationId = response.requestId;
            message.properties.add(methodMessagePropertyKeys.status, response.status);
            this._amqpClient.send(message, this._methodEndpoint, undefined, callback);
          },
          onDeviceMethod: (methodName, methodCallback) => {
            this._amqpClient.getReceiver(this._methodEndpoint, (err, methodReceiver) => {
              if (!this._methodReceiverInitialized) {
                methodReceiver.on('message', (msg) => {
                  debug('got method request');
                  debug(JSON.stringify(msg, null, 2));
                  const methodName = msg.properties.getValue(methodMessagePropertyKeys.methodName);
                  const methodRequest = {
                    methods: { methodName: methodName },
                    requestId: msg.correlationId,
                    body: msg.getData()
                  };

                  debug(JSON.stringify(methodRequest, null, 2));
                  this.emit('method_' + methodName, methodRequest);
                });
                methodReceiver.on('errorReceived', (err) => this.emit('errorReceived', err));
                this._methodReceiverInitialized = true;
              }

              debug('attaching callback for method: ' + methodName);
              this.on('method_' + methodName, methodCallback);
            });
          }
        }
      }
    });
  }

  sendMethodResponse(response: DeviceMethodResponse, callback?: (err?: Error, result?: any) => void): void {
    if (!response) throw new ReferenceError('response cannot be \'' + response + '\'');
    if (response.status === null || response.status === undefined) throw new errors.ArgumentError('response.status cannot be \'' + response.status + '\'');
    if (!response.requestId) throw new errors.ArgumentError('response.requestId cannot be \'' + response.requestId + '\'');

    this._fsm.handle('sendMethodResponse', response, callback);
  }

  onDeviceMethod(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
    if (!methodName) throw new ReferenceError('methodName cannot be \'' + methodName + '\'');
    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_018: [The `onDeviceMethod` method shall throw an `ArgumentError` if the `methodName` argument is not a string.]*/
    if (typeof methodName !== 'string') throw new errors.ArgumentError('methodName must be a string');

    this._fsm.handle('onDeviceMethod', methodName, callback);
  }
}
