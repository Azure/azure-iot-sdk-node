// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { AmqpMessage } from './amqp_message.js';
import { results, Receiver, Message } from 'azure-iot-common';
import { ReceiverLink as Amqp10ReceiverLink } from 'amqp10';

/**
 * @class            module:azure-iot-amqp-base.AmqpReceiver
 * @classdesc        The `AmqpReceiver` class is used to receive and settle messages.
 *
 * @param {Object}   amqpReceiver   The Receiver object that is created by the client using the `node-amqp10` library.
 *
 * @fires module:azure-iot-amqp-base.AmqpReceiver#message
 * @fires module:azure-iot-amqp-base.AmqpReceiver#errorReceived
 */
/* Codes_SRS_NODE_IOTHUB_AMQPRECEIVER_16_001: [The AmqpReceiver method shall create a new instance of AmqpReceiver.]*/
/* Codes_SRS_NODE_IOTHUB_AMQPRECEIVER_16_002: [The created AmqpReceiver object shall emit a ‘message’ event when a message is received.]*/
/* Codes_SRS_NODE_IOTHUB_AMQPRECEIVER_16_003: [The created AmqpReceiver object shall emit a ‘errorReceived’ event when an error is received.]*/
/* Codes_SRS_NODE_IOTHUB_AMQPRECEIVER_16_004: [If the receiver object passed as an argument is falsy, the AmqpReceiver should throw an ReferenceError]*/

export class AmqpReceiver extends EventEmitter implements Receiver {
  private _listeners: any[];
  private _listenersInitialized: boolean;
  private _amqpReceiver: Amqp10ReceiverLink;

  constructor (amqpReceiver: Amqp10ReceiverLink) {
    if (!amqpReceiver) { throw new ReferenceError('amqpReceiver'); }
    super();
    this._amqpReceiver = amqpReceiver;
    this._listenersInitialized = false;

    const self = this;

    this.on('removeListener', () => {
      // stop listening for AMQP events if our consumers stop listening for our events
      if (self._listenersInitialized && self.listeners('message').length === 0) {
        self._removeAmqpReceiverListeners();
      }
    });

    this.on('newListener', () => {
      // lazy-init AMQP event listeners
      if (!self._listenersInitialized) {
        self._setupAmqpReceiverListeners();
      }
    });
  }

  /**
   * @method          module:azure-iot-amqp-base.AmqpReceiver#complete
   * @description     Sends a completion feedback message to the service.
   * @param {AmqpMessage}   message  The message that is being settled.
   */
  /* Codes_SRS_NODE_IOTHUB_AMQPRECEIVER_16_006: [If the message object passed as an argument is falsy, a ReferenceError should be thrown]*/
  complete(message: Message, done?: (err: Error, result?: results.MessageCompleted) => void): void {
    if (!message) { throw new ReferenceError('Invalid message object.'); }
    this._amqpReceiver.accept(message.transportObj);
    if (done) done(null, new results.MessageCompleted());
  }

  /**
   * @method          module:azure-iot-amqp-base.AmqpReceiver#abandon
   * @description     Sends an abandon/release feedback message
   * @param {AmqpMessage}   message  The message that is being settled.
   */
  /* Codes_SRS_NODE_IOTHUB_AMQPRECEIVER_16_008: [If the message object passed as an argument is falsy, a ReferenceError should be thrown]*/
  abandon(message: Message, done?: (err: Error, result?: results.MessageAbandoned) => void): void {
    if (!message) { throw new ReferenceError('Invalid message object.'); }
    this._amqpReceiver.release(message.transportObj);
    if (done) done(null, new results.MessageAbandoned());
  }

  /**
   * @method          module:azure-iot-amqp-base.AmqpReceiver#reject
   * @description     Sends an reject feedback message
   * @param {AmqpMessage}   message  The message that is being settled.
   */
  /* Codes_SRS_NODE_IOTHUB_AMQPRECEIVER_16_010: [If the message object passed as an argument is falsy, a ReferenceError should be thrown]*/
  reject(message: Message, done?: (err: Error, result?: results.MessageRejected) => void): void {
    if (!message) { throw new ReferenceError('Invalid message object.'); }
    this._amqpReceiver.reject(message.transportObj);
    if (done) done(null, new results.MessageRejected());
  }

  private _onAmqpErrorReceived(err: Error): void {
    /**
     * @event module:azure-iot-amqp-base.AmqpReceiver#errorReceived
     * @type {Error}
     */
    this.emit('errorReceived', err);
  }

  private _onAmqpMessage(amqpMessage: AmqpMessage): void {
    /**
     * @event module:azure-iot-amqp-base.AmqpReceiver#message
     * @type {Message}
     */
    const msg = AmqpMessage.toMessage(amqpMessage);
    this.emit('message', msg);
  }

  private _setupAmqpReceiverListeners(): void {
    this._listeners = [
      { eventName: 'errorReceived', listener: this._onAmqpErrorReceived.bind(this) },
      { eventName: 'message', listener: this._onAmqpMessage.bind(this) }
    ];
    for (let i = 0; i < this._listeners.length; ++i) {
      const listener = this._listeners[i];
      this._amqpReceiver.on(listener.eventName, listener.listener);
    }

    this._listenersInitialized = true;
  }

  private _removeAmqpReceiverListeners(): void {
    if (this._listenersInitialized === true) {
      for (let i = 0; i < this._listeners.length; ++i) {
        const listener = this._listeners[i];
        this._amqpReceiver.removeListener(listener.eventName, listener.listener);
      }

      this._listenersInitialized = false;
    }
  }
}
