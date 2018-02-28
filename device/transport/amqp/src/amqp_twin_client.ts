// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import machina = require('machina');

import { endpoint, Message, AuthenticationProvider } from 'azure-iot-common';
import { Amqp as BaseAmqpClient, AmqpMessage, SenderLink, ReceiverLink } from 'azure-iot-amqp-base';
import { TwinProperties } from 'azure-iot-device';

import * as uuid from 'uuid';
import * as dbg from 'debug';
const debug = dbg('azure-iot-device-amqp:AmqpTwinClient');

enum TwinMethod {
  GET = 'GET',
  PATCH = 'PATCH',
  PUT = 'PUT',
  DELETE = 'DELETE'
}


/**
 * @private
 * @class        module:azure-iot-device-amqp.AmqpTwinClient
 * @classdesc    Acts as a client for device-twin traffic
 *
 * @param {Object} config                        configuration object
 * @fires AmqpTwinClient#error                   an error has occurred
 * @fires AmqpTwinClient#desiredPropertyUpdate   a desired property has been updated
 * @throws {ReferenceError}                      If client parameter is falsy.
 *
 */

/* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_005: [The `AmqpTwinClient` shall inherit from the `EventEmitter` class.] */
export class AmqpTwinClient extends EventEmitter {
  private _client: BaseAmqpClient;
  private _authenticationProvider: AuthenticationProvider;
  private _endpoint: string;
  private _senderLink: SenderLink;
  private _receiverLink: ReceiverLink;
  private _fsm: any;
  // need type for twin properties
  private _pendingTwinRequests: { [key: string]: (err: Error, twinProperties?: any) => void };

  private _messageHandler: (message: Message) => void;
  private _errorHandler: (err: Error) => void;

  constructor(authenticationProvider: AuthenticationProvider, client: any) {
    super();
    this._client = client;
    this._authenticationProvider = authenticationProvider;
    this._senderLink = null;
    this._receiverLink = null;
    this._pendingTwinRequests = {};

    this._messageHandler = (message: Message): void => {
      //
      // The ONLY time we should see a message on the receiver link without a correlationId is if the message is a desired property delta update.
      //
      const correlationId: string = message.correlationId;
      if (correlationId) {
        this._onResponseMessage(message);
      } else if (message.hasOwnProperty('data')) {
        this._onDesiredPropertyDelta(message);
      } else {
        //
        // Can't be any message we know what to do with.  Just drop it on the floor.
        //
        debug('malformed response message received from service: ' + JSON.stringify(message));
      }
    };

    this._errorHandler = (err: Error): void => this._fsm.handle('handleLinkError', err);

    this._fsm = new machina.Fsm({
      namespace: 'amqp-twin-client',
      initialState: 'detached',
      states: {
        detached: {
          _onEnter: (err, detachCallback) => {
            if (detachCallback) {
                detachCallback(err);
            } else {
              if (err) {
                this.emit('error', err);
              }
            }
          },
          getTwin: (callback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_007: [The `getTwin` method shall attach the sender link if it's not already attached.]*/
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_009: [THe `getTwin` method shall attach the receiver link if it's not already attached.]*/
            this._fsm.transition('attaching', (err) => {
              if (err) {
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_008: [If attaching the sender link fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_010: [If attaching the receiver link fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
                callback(err);
              } else {
                this._fsm.handle('getTwin', callback);
              }
            });
          },
          updateTwinReportedProperties: (patch, callback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_015: [The `updateTwinReportedProperties` method shall attach the sender link if it's not already attached.]*/
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_017: [THe `updateTwinReportedProperties` method shall attach the receiver link if it's not already attached.]*/
            this._fsm.transition('attaching', (err) => {
              if (err) {
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_016: [If attaching the sender link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_018: [If attaching the receiver link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
                callback(err);
              } else {
                this._fsm.handle('updateTwinReportedProperties', patch, callback);
              }
            });
          },
          enableTwinDesiredPropertiesUpdates: (callback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_023: [The `enableTwinDesiredPropertiesUpdates` method shall attach the sender link if it's not already attached.]*/
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_025: [The `enableTwinDesiredPropertiesUpdates` method shall attach the receiver link if it's not already attached.]*/
            this._fsm.transition('attaching', (err) => {
              if (err) {
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_024: [If attaching the sender link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_026: [If attaching the receiver link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
                callback(err);
              } else {
                this._fsm.handle('enableTwinDesiredPropertiesUpdates', callback);
              }
            });
          },
          /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_031: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback immediately and with no arguments if the links are detached.]*/
          disableTwinDesiredPropertiesUpdates: (callback) => callback(),
          /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_004: [The `detach` method shall call its `callback` immediately if the links are already detached.]*/
          detach: (callback) => callback()
        },
        attaching: {
          _onEnter: (attachCallback) => {
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_007: [The `attach` method shall call the `getDeviceCredentials` method on the `authenticationProvider` object passed as an argument to the constructor to retrieve the device id.]*/
            this._authenticationProvider.getDeviceCredentials((err, credentials) => {
              if (err) {
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_008: [The `attach` method shall call its callback with an error if the call to `getDeviceCredentials` fails with an error.]*/
                this._fsm.transition('detached', err, attachCallback);
              } else {
                  /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_007: [The endpoint argument for attacheReceiverLink shall be `/device/<deviceId>/twin`.] */
                  /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_009: [The endpoint argument for attacheSenderLink shall be `/device/<deviceId>/twin`.] */
                  this._endpoint = endpoint.devicePath(credentials.deviceId) + '/twin';
                  /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_006: [When a listener is added for the `response` event, and the `post` event is NOT already subscribed, upstream and downstream links are established via calls to `attachReceiverLink` and `attachSenderLink`.] */
                  /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_012: [When a listener is added for the `post` event, and the `response` event is NOT already subscribed, upstream and downstream links are established via calls to `attachReceiverLink` and `attachSenderLine`.] */
                  const linkCorrelationId: string  = uuid.v4().toString();
                  this._client.attachReceiverLink( this._endpoint, this._generateTwinLinkProperties(linkCorrelationId), (receiverLinkError?: Error, receiverTransportObject?: any): void => {
                    if (receiverLinkError) {
                      /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_022: [If an error occurs on establishing the upstream or downstream link then the `error` event shall be emitted.] */
                      this._fsm.transition('detached', receiverLinkError, attachCallback);
                    } else {
                      this._receiverLink = receiverTransportObject;
                      this._receiverLink.on('message', this._messageHandler);
                      this._receiverLink.on('error', this._errorHandler);
                      this._client.attachSenderLink( this._endpoint, this._generateTwinLinkProperties(linkCorrelationId), (senderLinkError?: Error, senderTransportObject?: any): void => {
                        if (senderLinkError) {
                          this._fsm.transition('detached', senderLinkError, attachCallback);
                        } else {
                          this._senderLink = senderTransportObject;
                          this._senderLink.on('error', this._errorHandler);
                          this._fsm.transition('attached', attachCallback);
                        }
                      });
                    }
                });
              }
            });
          },
          handleLinkError: (err, callback) => this._fsm.transition('detaching', err, callback),
          detach: (callback) => this._fsm.transition('detaching', null, callback),
          '*': () => this._fsm.deferUntilTransition()
        },
        attached: {
          _onEnter: (callback) => {
            callback();
          },
          handleLinkError: (err) => {
            this._fsm.transition('detaching', err);
          },
          /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_011: [** The `getTwin` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
          - `operation` annotation set to `GET`.
          - `resource` annotation set to `undefined`
          - `correlationId` property set to a random integer
          - `body` set to ` `.]*/
          getTwin: (callback) => this._sendTwinRequest(TwinMethod.GET, undefined, ' ', callback),
          /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_019: [The `updateTwinReportedProperties` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
          - `operation` annotation set to `PATCH`.
          - `resource` annotation set to `/properties/reported`
          - `correlationId` property set to a random integer
          - `body` set to the stringified patch object.]*/
          updateTwinReportedProperties: (patch, callback) => this._sendTwinRequest(TwinMethod.PATCH, '/properties/reported', JSON.stringify(patch), callback),
          /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_027: [The `enableTwinDesiredPropertiesUpdates` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
          - `operation` annotation set to `PUT`.
          - `resource` annotation set to `/notifications/twin/properties/desired`
          - `correlationId` property set to a random integer
          - `body` set to `undefined`.]*/
          enableTwinDesiredPropertiesUpdates: (callback) => this._sendTwinRequest(TwinMethod.PUT, '/notifications/twin/properties/desired', ' ', callback),
          /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_032: [The `disableTwinDesiredPropertiesUpdates` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
          - `operation` annotation set to `DELETE`.
          - `resource` annotation set to `/notifications/twin/properties/desired`
          - `correlationId` property set to a random integer
          - `body` set to `undefined`.]*/
          disableTwinDesiredPropertiesUpdates: (callback) => this._sendTwinRequest(TwinMethod.DELETE, '/notifications/twin/properties/desired', ' ', callback),
          detach: (callback) => this._fsm.transition('detaching', null, callback)
        },
        detaching: {
          _onEnter: (err, detachCallback) => {
            const senderLink = this._senderLink;
            const receiverLink = this._receiverLink;
            /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_005: [The `detach` method shall detach the links and call its `callback` with no arguments if the links are successfully detached.]*/
            this._client.detachSenderLink(this._endpoint, (detachSenderError: Error, result?: any) => {
              senderLink.removeListener('error', this._errorHandler);
              if (detachSenderError) {
                debug('we received an error for the detach of the upstream link during the disconnect.  Moving on to the downstream link.');
              }
              this._client.detachReceiverLink(this._endpoint,  (detachReceiverError: Error, result?: any) => {
                receiverLink.removeListener('message', this._messageHandler);
                receiverLink.removeListener('error', this._errorHandler);
                if (detachReceiverError) {
                  debug('we received an error for the detach of the downstream link during the disconnect.');
                }
                /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_006: [The `detach` method shall call its `callback` with an `Error` if detaching either of the links fail.]*/
                let possibleError = err || detachSenderError || detachReceiverError;
                this._fsm.transition('detached', possibleError, detachCallback);
              });
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        }
      }
    });
  }

  getTwin(callback: (err: Error, twin?: TwinProperties) => void): void {
    this._fsm.handle('getTwin', callback);
  }

  updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void {
    this._fsm.handle('updateTwinReportedProperties', patch, callback);
  }

  enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void {
    this._fsm.handle('enableTwinDesiredPropertiesUpdates', callback);
  }

  disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void {
    this._fsm.handle('disableTwinDesiredPropertiesUpdates', callback);
  }

  /**
   * Necessary for the client to be able to properly detach twin links
   * attach() isn't necessary because it's done by the FSM automatically when one of the APIs is called.
   */
  detach(callback: (err?: Error) => void): void {
    this._fsm.handle('detach', callback);
  }


  private _generateTwinLinkProperties( correlationId: string): any {
    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_010: [** The link options argument for attachSenderLink shall be:
         attach: {
                properties: {
                  'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
                  'com.microsoft:api-version' : endpoint.apiVersion
                },
                sndSettleMode: 1,
                rcvSettleMode: 0
              } ] */
    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_008: [The link options argument for attachReceiverLink shall be:
         attach: {
                properties: {
                  'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
                  'com.microsoft:api-version' : endpoint.apiVersion
                },
                sndSettleMode: 1,
                rcvSettleMode: 0
              } ] */
    // Note that the settle mode hard coded values correspond to the defined constant values in the amqp10 specification.
    return {
      attach: {
        properties: {
          'com.microsoft:channel-correlation-id' : 'twin:' + correlationId,
          'com.microsoft:api-version' : endpoint.apiVersion
        },
        sndSettleMode: 1,
        rcvSettleMode: 0
      }
    };
  }

  private _onResponseMessage(message: Message): void {
    debug('onResponseMessage: The downstream message is: ' + JSON.stringify(message));
    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_013: [The `getTwin` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler and until a message with the same `correlationId` as the one that was sent is received.]*/
    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_021: [The `updateTwinReportedProperties` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler and until a message with the same `correlationId` as the one that was sent is received.]*/
    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_029: [The `enableTwinDesiredPropertiesUpdates` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler and until a message with the same `correlationId` as the one that was sent is received.]*/
    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_034: [The `disableTwinDesiredPropertiesUpdates` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler and until a message with the same `correlationId` as the one that was sent is received.]*/
    if (this._pendingTwinRequests[message.correlationId]) {
      const pendingRequestCallback = this._pendingTwinRequests[message.correlationId];
      delete this._pendingTwinRequests[message.correlationId];
      // TODO: Test resource property and status code?
      let result = message.data ? JSON.parse(message.data) : undefined;
      /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_014: [The `getTwin` method shall parse the body of the received message and call its callback with a `null` error object and the parsed object as a result.]*/
      /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_022: [The `updateTwinReportedProperties` method shall call its callback with no argument when a response is received]*/
      /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_030: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with no argument when a response is received]*/
      /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_035: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback with no argument when a response is received]*/
      pendingRequestCallback(null, result);
    } else {
      debug('received a response for an unknown request: ' + JSON.stringify(message));
    }
  }

  private _onDesiredPropertyDelta(message: Message): void {
    debug('onDesiredPropertyDelta: The message is: ' + JSON.stringify(message));
    this.emit('twinDesiredPropertiesUpdate', JSON.parse(message.data));
  }

  private _sendTwinRequest(method: TwinMethod, resource: string, body: string, callback: (err?: Error) => void): void {
    let amqpMessage = new AmqpMessage();

    amqpMessage.messageAnnotations = {
      operation: method
    };

    if (resource) {
      amqpMessage.messageAnnotations.resource = resource;
    }

    const correlationId = Math.floor(Math.random() * 10000).toString();
    amqpMessage.properties = {
      correlationId: correlationId
    };

    amqpMessage.body = body;

    this._pendingTwinRequests[correlationId] = callback;
    this._senderLink.send(amqpMessage, (err) => {
      /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_012: [If the `SenderLink.send` call fails the `getTwin` method shall call its callback with the error that caused the failure.]*/
      /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_020: [If the `SenderLink.send` call fails the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
      /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_028: [If the `SenderLink.send` call fails the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
      /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_16_033: [If the `SenderLink.send` call fails the `disableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
      if (err) {
        debug('could not get twin: ' + err.toString());
        delete this._pendingTwinRequests[correlationId];
        callback(err);
      } else {
        debug('getTwin request sent with correlationId: ' + correlationId);
      }
    });
  }
}
