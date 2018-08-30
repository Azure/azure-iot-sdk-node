// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

var eventHubClient = require('azure-event-hubs').Client;
var util = require('util');
var EventEmitter = require('events');
var Promise = require('bluebird');


var EventHubReceiverHelper = function(hubConnectionString) {
  this.hubConnectionString = hubConnectionString;
  this.ehClient = eventHubClient.fromConnectionString(this.hubConnectionString);
  this.ehReceivers = [];
  EventEmitter.call(this);
};
util.inherits(EventHubReceiverHelper, EventEmitter);

EventHubReceiverHelper.prototype.openClient = function(done) {
  var self = this;

  this.ehClient.open()
      .then(self.ehClient.getPartitionIds.bind(self.ehClient))
      .then(function (partitionIds) {
        return partitionIds.map(function (partitionId) {
          return self.ehClient.createReceiver('$Default', partitionId,{ 'startAfterTime' : Date.now()}).then(function(receiver) {
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
  var self = this;
  Promise.map(self.ehReceivers, function (recvToClose) {
    recvToClose.removeAllListeners();
    return recvToClose.close();
  }).then(function () {
    self.ehReceivers = [];
    return self.ehClient.close();
  }).then(function () {
    done();
  }).catch(function (err) {
    done(err);
  });
};

module.exports = EventHubReceiverHelper;
