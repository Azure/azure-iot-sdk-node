// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const { EventHubConsumerClient, latestEventPosition } = require('@azure/event-hubs');
const debug = require('debug')('stresstests:EventHubHelper');

/**
 * A thenable that can be can be resolved or rejected from outside and records
 * the time it takes to settle.
 */
class Deferred {
  constructor() {
    this.startTime = Date.now();
    this.timeToSettle = null;
    const promise = new Promise((resolve, reject) => {
      this.resolve = (val) => {
        this.timeToSettle = Date.now() - this.startTime;
        resolve(val);
      };
      this.reject = (val) => {
        this.timeToSettle = Date.now() - this.startTime;
        reject(val);
      };
    });
    this.then = promise.then.bind(promise);
    this.catch = promise.catch.bind(promise);
  }
}

/**
 * Helps manage an EventHubConsumerClient for listening to D2C messages.
 */
class EventHubHelper {
  /**
   * Construct an EventHubHelper instance.
   *
   * @param {string} [eventHubConnectionString] - The Event Hub-compatible connection string.
   *   If not provided, the environment variable EVENTHUB_CONNECTION_STRING will be used.
   * @public
   */
  constructor(eventHubConnectionString) {
    this._client = null;
    this._subscription = null;
    this._warnUnexpectedMessage = null;
    this._warnNoMessageId = null;
    this._expectedMessages = new Map();
    this._eventHubConnectionString = eventHubConnectionString ?
      eventHubConnectionString :
      process.env.EVENTHUB_CONNECTION_STRING;
    if (!this._eventHubConnectionString) {
      throw new Error(
        'eventHubConnectionString must be specified or EVENTHUB_CONNECTION_STRING environment variable must be set'
      )
    }
  }

  /**
   * Registers a message to be waited for.
   *
   * @param {string} messageId - The messageId of the message to wait for.
   * @public
   */
  awaitMessage(messageId) {
    if (!this._client) {
      throw new Error('Event Hubs client not open.');
    }
    const deferred = new Deferred();
    this._expectedMessages.set(messageId, deferred);
    return deferred;
  }

  /**
   * Creates an EventHubConsumerClient to listen to D2C messages and manage messages
   * being waited for.
   *
   * @public
   */
  async open() {
    if (this._client) {
      debug('Attempted to open an already open client.');
      return;
    }
    this._warnUnexpectedMessage = true;
    this._warnNoMessageId = true;
    try {
      debug('Opening Event Hubs client.');
      this._client = new EventHubConsumerClient("$Default", this._eventHubConnectionString);
      this._subscription = this._client.subscribe({
        processEvents: async (events) => {
          for (const event of events) {
            const messageId = event.properties && event.properties.message_id;
            const body = JSON.stringify(event.body);
            if (!messageId && this._warnNoMessageId) {
              debug(
                'Received a message without a messageId and body '
                + `${body.length < 80 ? body : 'too long to display'}. `
                + '(Warnings of future messages without a messageId on this '
                + 'client will be suppressed)'
              );
              this._warnNoMessageId = false;
            }
            const deferred = this._expectedMessages.get(messageId);
            if (this._expectedMessages.delete(messageId)) {
              deferred.resolve(event);
            } else if (messageId && this._warnUnexpectedMessage) {
              debug(
                `Received unexpected message with messageId ${messageId} and `
                + `body ${body.length < 80 ? body : 'too long to display'}. `
                + '(Warnings of future unexpected messages on this client will '
                + 'be suppressed)'
              );
              this._warnUnexpectedMessage = false;
            }
          }
        },
        processError: async (err) => {
          debug(`Event Hubs client threw an error: ${err}.`);
          this.close(err);
        },
      }, {
        startPosition: latestEventPosition,
      });
    } catch (err) {
      await this.close(err);
      throw err;
    }
  }

  /**
   * Stops listening for D2C messages and closes the EventHubClient.
   *
   * @public
   */
  async close(reason) {
    debug(`Closing Event Hubs client${reason ? ` due to error: ${reason}.` : '.'}`);
    const remainingIds = Array.from(this._expectedMessages.keys());
    if (remainingIds.length > 10) {
      debug(`Failing ${remainingIds.length} remaining messages`);
    } else if (remainingIds.length) {
      debug(`Failing remaining messages: ${remainingIds.join(', ')}`);
    }
    for (const deferred of this._expectedMessages.values()) {
      deferred.reject(new Error(`Event Hubs client closed${reason ? `: ${reason}.`:'.'}`));
    }
    this._expectedMessages.clear();
    if (this._client) {
      const client = this._client;
      this._client = null;
      await client.close();
    }
  }
}

module.exports = EventHubHelper;
