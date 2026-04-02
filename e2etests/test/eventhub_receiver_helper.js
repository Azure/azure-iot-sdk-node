// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let EventHubConsumerClient = require('@azure/event-hubs').EventHubConsumerClient;
let util = require('util');
let EventEmitter = require('events');
let closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;

let eventHubConnectionString = process.env.EVENTHUB_CONNECTION_STRING;

let EventHubReceiverHelper = function () {
  EventEmitter.call(this);
};
util.inherits(EventHubReceiverHelper, EventEmitter);

EventHubReceiverHelper.prototype.openClient = function (done) {
  let self = this;
  // account for potential delays and clock skews
  let startTime = new Date(Date.now() - 5000);
  self.ehClient = new EventHubConsumerClient("$Default", eventHubConnectionString);
  self._subscription = self.ehClient.subscribe({
    processEvents: async function (events) {
      for (let eventData of events) {
        self.emit('message', eventData);
      }
    },
    processError: async function (err) {
      self.emit('error', err);
    },
  }, {
    startPosition: { enqueuedOn: startTime },
  });
  // Give receivers time to set up
  setTimeout(function () { done(); }, 3000);
};

EventHubReceiverHelper.prototype.closeClient = function (done) {
  closeDeviceEventHubClients(null, this.ehClient, done);
};

module.exports = EventHubReceiverHelper;
