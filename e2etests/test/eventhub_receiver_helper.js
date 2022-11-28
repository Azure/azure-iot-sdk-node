// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let EventHubClient = require('@azure/event-hubs').EventHubClient;
let EventPosition = require('@azure/event-hubs').EventPosition;
let util = require('util');
let EventEmitter = require('events');
let closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

let EventHubReceiverHelper = function () {
  EventEmitter.call(this);
};
util.inherits(EventHubReceiverHelper, EventEmitter);

EventHubReceiverHelper.prototype.openClient = function (done) {
  let self = this;
  // account for potential delays and clock skews
  let startTime = Date.now() - 5000;
  let onEventHubMessage = function (eventData) {
    self.emit('message', eventData);
  };
  let onEventHubError = function (err) {
    self.emit('error', err);
  };

  EventHubClient.createFromIotHubConnectionString(hubConnectionString)
  .then(function (client) {
    self.ehClient = client;
  }).then(function () {
    return self.ehClient.getPartitionIds();
  }).then(function (partitionIds) {
    partitionIds.forEach(function (partitionId) {
      self.ehClient.receive(partitionId, onEventHubMessage, onEventHubError, { eventPosition: EventPosition.fromEnqueuedTime(startTime) });
    });
  }).then(function () {
    done();
  }).catch(function (err) {
    done(err);
  });
};

EventHubReceiverHelper.prototype.closeClient = function (done) {
  closeDeviceEventHubClients(null, this.ehClient, done);
};

module.exports = EventHubReceiverHelper;
