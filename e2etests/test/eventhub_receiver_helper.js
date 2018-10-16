// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var eventHubClient = require('azure-event-hubs').Client;
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
  this.ehClient = eventHubClient.fromConnectionString(hubConnectionString);
  this.ehReceivers = [];
  // account for potential delays and clock skews
  var startTime = Date.now() - 5000;

  this.ehClient.open()
      .then(self.ehClient.getPartitionIds.bind(self.ehClient))
      .then(function (partitionIds) {
        return partitionIds.map(function (partitionId) {
          return self.ehClient.createReceiver('$Default', partitionId,{ 'startAfterTime' : startTime }).then(function(receiver) {
            self.ehReceivers.push(receiver);
            receiver.on('errorReceived', function(err) {
              self.emit(err);
            });
            receiver.on('message', function (eventData) {
              self.emit('message', eventData);
            });
          });
        });
      })
      .catch(function(err) {
        done(err);
      })
      .then(function() {
        done();
      });
};

EventHubReceiverHelper.prototype.closeClient = function(done) {
  closeDeviceEventHubClients(null, this.ehClient, this.ehReceivers, done);
};

module.exports = EventHubReceiverHelper;
