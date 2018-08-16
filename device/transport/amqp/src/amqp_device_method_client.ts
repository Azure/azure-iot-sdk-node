// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import * as uuid from 'uuid';
import * as machina  from 'machina';
import * as async from 'async';
import * as dbg from 'debug';
const debug = dbg('azure-iot-device-amqp:AmqpDeviceMethodClient');

import { Message, errors, endpoint, AuthenticationProvider } from 'azure-iot-common';
import { MethodMessage, DeviceMethodResponse } from 'azure-iot-device';
import { Amqp as BaseAmqpClient, SenderLink, ReceiverLink } from 'azure-iot-amqp-base';
import rhea = require('rhea');

const methodMessagePropertyKeys = {
  methodName: 'IoThub-methodname',
  status: 'IoThub-status'
};

/**
 * @private
 */
export class AmqpDeviceMethodClient extends EventEmitter {
  private _authenticationProvider: AuthenticationProvider;
  private _amqpClient: any;
  private _methodEndpoint: string;
  private _fsm: any;
  private _senderLink: SenderLink;
  private _receiverLink: ReceiverLink;

  constructor(authenticationProvider: AuthenticationProvider, amqpClient: BaseAmqpClient) {
    super();

    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_003: [The `AmqpDeviceMethodClient` shall inherit from the `EventEmitter` class.]*/
    this._authenticationProvider = authenticationProvider;
    this._amqpClient = amqpClient;

    this._fsm = new machina.Fsm({
      namespace: 'amqp-device-method-client',
      initialState: 'detached',
      states: {
        detached: {
          _onEnter: (callback, err) => {
            this._senderLink = undefined;
            this._receiverLink = undefined;
            if (callback) {
              callback(err);
            } else {
              if (err) {
                debug('detached with error: ' + err.toString());
                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_015: [The `AmqpDeviceMethodClient` object shall forward any error received on a link to any listening client in an `error` event.]*/
                this.emit('error', err);
              }
            }
          },
          attach: (callback) => {
            this._fsm.transition('attaching', callback);
          },
          /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_023: [The `detach` method shall call the callback with no arguments if the links are properly detached.]*/
          detach: (callback) => callback(),
          /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_025: [The `forceDetach` method shall immediately return if all links are already detached.]*/
          forceDetach: () => { return; },
          /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_026: [The `sendMethodResponse` shall fail with a `NotConnectedError` if it is called while the links are detached.]*/
          sendMethodResponse: (response, callback) => callback(new errors.NotConnectedError('Method Links were detached - the service already considers this method failed')),
          /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_006: [The `onDeviceMethod` method shall save the `callback` argument so that it is called when the corresponding method call is received.]*/
          onDeviceMethod: (methodName, methodCallback) => {
            debug('attaching callback for method: ' + methodName + 'while detached.');
            this.on('method_' + methodName, methodCallback);
          }
        },
        attaching: {
          _onEnter: (attachCallback) => {
            /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_027: [The `attach` method shall call the `getDeviceCredentials` method on the `authenticationProvider` object passed as an argument to the constructor to retrieve the device id.]*/
            this._authenticationProvider.getDeviceCredentials((err, credentials) => {
              if (err) {
                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_028: [The `attach` method shall call its callback with an error if the call to `getDeviceCredentials` fails with an error.]*/
                this._fsm.transition('detached', attachCallback, err);
              } else {
                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_017: [The endpoint used to for the sender and receiver link shall be `/devices/<device-id>/methods/devicebound`.]*/
                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_18_001: [If a `moduleId` value was set in the device's connection string, The endpoint used to for the sender and receiver link shall be `/devices/<deviceId>/modules/<moduleId>/methods/devicebound`.]*/
                if (credentials.moduleId) {
                  this._methodEndpoint = endpoint.moduleMethodPath(credentials.deviceId, credentials.moduleId);
                } else {
                  this._methodEndpoint = endpoint.deviceMethodPath(credentials.deviceId);
                }

                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_014: [** The `AmqpDeviceMethodClient` object shall set 2 properties of any AMQP link that it create:
                - `com.microsoft:api-version` shall be set to the current API version in use.
                - `com.microsoft:channel-correlation-id` shall be set to the string "methods:" followed by a guid.]*/
                const linkOptions = {
                  properties: {
                    'com.microsoft:api-version': endpoint.apiVersion,
                    'com.microsoft:channel-correlation-id': 'methods:' + uuid.v4()
                  },
                  rcv_settle_mode: 0
                };

                /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_019: [The `attach` method shall create a SenderLink and a ReceiverLink and attach them.]*/
                this._amqpClient.attachSenderLink(this._methodEndpoint, linkOptions, (err, senderLink) => {
                  if (err) {
                    this._fsm.transition('detaching', attachCallback, err);
                  } else {
                    this._senderLink = senderLink;
                    this._amqpClient.attachReceiverLink(this._methodEndpoint, linkOptions, (err, receiverLink) => {
                      if (err) {
                        this._fsm.transition('detaching', attachCallback, err);
                      } else {
                        this._receiverLink = receiverLink;
                        /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_021: [The `attach` method shall subscribe to the `message` and `error` events on the `ReceiverLink` object associated with the method endpoint.]*/
                        this._receiverLink.on('message', (msg) => {
                          debug('got method request');
                          debug(JSON.stringify(msg, null, 2));
                          const methodName = msg.application_properties[methodMessagePropertyKeys.methodName];
                          //
                          // The rhea library will de-serialize an encoded uuid (0x98) as a 16 byte buffer.
                          //
                          let methodRequest: any = {};
                          methodRequest.methods = {methodName: methodName};
                          if (msg.body && msg.body.content) {
                            methodRequest.body = msg.body.content.toString();
                          }
                          if (((msg.correlation_id as any) instanceof Buffer) && (msg.correlation_id.length === 16)) {
                            methodRequest.requestId = rhea.uuid_to_string(msg.correlation_id);
                          } else {
                            methodRequest.requestId = msg.correlation_id;
                          }
                          debug(JSON.stringify(methodRequest, null, 2));
                          this.emit('method_' + methodName, methodRequest);
                        });

                        this._receiverLink.on('error', (err) => {
                          this._fsm.transition('detaching', undefined, err);
                        });

                        this._fsm.transition('attached', attachCallback);
                      }
                    });
                  }
                });
              }
            });
          },
          forceDetach: () => {
            /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_024: [The `forceDetach` method shall forcefully detach all links.]*/
            if (this._senderLink) {
              this._senderLink.forceDetach();
            }
            if (this._receiverLink) {
              this._receiverLink.forceDetach();
            }
            this._fsm.transition('detached');
          },
          detach: () => this._fsm.deferUntilTransition(),
          /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_026: [The `sendMethodResponse` shall fail with a `NotConnectedError` if it is called while the links are detached.]*/
          sendMethodResponse: (response, callback) => callback(new errors.NotConnectedError('Method Links were detached - the service already considers this method failed')),
          /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_006: [The `onDeviceMethod` method shall save the `callback` argument so that it is called when the corresponding method call is received.]*/
          onDeviceMethod: (methodName, methodCallback) => {
            debug('attaching callback for method: ' + methodName + 'while attaching.');
            this.on('method_' + methodName, methodCallback);
          }
        },
        attached: {
          _onEnter: (attachCallback) => {
            attachCallback();
          },
          sendMethodResponse: (response, callback) => {
            let message = new Message(JSON.stringify(response.payload));
            message.correlationId = response.requestId;
            message.properties.add(methodMessagePropertyKeys.status, response.status);
            this._amqpClient.send(message, this._methodEndpoint, undefined, callback);
          },
          /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_006: [The `onDeviceMethod` method shall save the `callback` argument so that it is called when the corresponding method call is received.]*/
          onDeviceMethod: (methodName, methodCallback) => {
            debug('attaching callback for method: ' + methodName);
            this.on('method_' + methodName, methodCallback);
          },
          /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_020: [The `attach` method shall immediately call the callback if the links are already attached.]*/
          attach: (callback) => callback(),
          detach: (callback) => this._fsm.transition('detaching', callback),
          forceDetach: () => {
            /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_024: [The `forceDetach` method shall forcefully detach all links.]*/
            this._senderLink.forceDetach();
            this._receiverLink.forceDetach();
            this._fsm.transition('detached');
          }
        },
        detaching: {
          _onEnter: (forwardedCallback, err) => {
            /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_022: [The `detach` method shall detach both Sender and Receiver links.]*/
            const links = [this._senderLink, this._receiverLink];
            async.each(links, (link, callback) => {
              if (link) {
                link.detach(callback);
              } else {
                callback();
              }
            }, () => {
              this._fsm.transition('detached', forwardedCallback, err);
            });
          },
          '*': (callback) => this._fsm.deferUntilTransition('detached')
        }
      }
    });

    this._fsm.on('transition', (transition) => {
      debug(transition.fromState + ' -> ' + transition.toState + ' (action:' + transition.action + ')');
    });
  }

  attach(callback: (err: Error) => void): void {
    this._fsm.handle('attach', callback);
  }

  detach(callback: (err: Error) => void): void {
    this._fsm.handle('detach', callback);
  }

  forceDetach(): void {
    this._fsm.handle('forceDetach');
  }

  sendMethodResponse(response: DeviceMethodResponse, callback?: (err?: Error, result?: any) => void): void {
    if (!response) throw new ReferenceError('response cannot be \'' + response + '\'');
    if (response.status === null || response.status === undefined) throw new errors.ArgumentError('response.status cannot be \'' + response.status + '\'');
    if (!response.requestId) throw new errors.ArgumentError('response.requestId cannot be \'' + response.requestId + '\'');

    this._fsm.handle('sendMethodResponse', response, callback);
  }

  onDeviceMethod(methodName: string, callback: (request: MethodMessage, response: DeviceMethodResponse) => void): void {
    if (!methodName) throw new ReferenceError('methodName cannot be \'' + methodName + '\'');
    /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_018: [The `onDeviceMethod` method shall throw an `ArgumentError` if the `methodName` argument is not a string.]*/
    if (typeof methodName !== 'string') throw new errors.ArgumentError('methodName must be a string');

    this._fsm.handle('onDeviceMethod', methodName, callback);
  }
}
