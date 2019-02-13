// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventHubClient = require('@azure/event-hubs').EventHubClient;
var EventPosition = require('@azure/event-hubs').EventPosition;
var util = require('util');
var EventEmitter = require('events');
var closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

var EventHubReceiverHelper = function() {
  EventEmitter.call(this);
};
util.inherits(EventHubReceiverHelper, EventEmitter);

EventHubReceiverHelper.prototype.openClient = function(done) {
  var self = this;
  // account for potential delays and clock skews
  var startTime = Date.now() - 5000;
  var onEventHubMessage = function (eventData) {
    self.emit('message', eventData);
  };
  var onEventHubError = function (err) {
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

EventHubReceiverHelper.prototype.closeClient = function(done) {
  closeDeviceEventHubClients(null, this.ehClient, done);
};

module.exports = EventHubReceiverHelper;
