// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var endpoint = require('azure-iot-common').endpoint;

/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_001: [The `AmqpReceiver` constructor shall initialize a new instance of an `AmqpReceiver` object.]*/
function AmqpReceiver(config, amqpClient, deviceMethodClient) {
  EventEmitter.call(this);
  this._config = config;
  this._amqpClient = amqpClient;
  this._deviceMethodClient = deviceMethodClient;
  this._deviceMethodClient.on('errorReceived', function(err) {
    this.emit('errorReceived', err);
  }.bind(this));

  this._messagingEndpoint = endpoint.messagePath(encodeURIComponent(this._config.deviceId));

  var self = this;

  /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_008: [The `AmqpReceiver` shall remove any new listener of the `message` or `errorReceived` event of the underlying message receiver if removed from its own `message` and `errorReceived` events.]*/
  this.on('removeListener', function _onRemoveMessageListener(eventName, eventCallback) {
    if (eventName === 'message' || eventName === 'errorReceived') {
      self._amqpClient.getReceiver(self._messagingEndpoint, function(err, msgReceiver) {
        msgReceiver.removeListener(eventName, eventCallback);
      });
    }
  });

  /*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_003: [The `AmqpReceiver` shall forward any new listener of the `message` or `errorReceived` events to the underlying message receiver.]*/
  this.on('newListener', function _onAddMessageListener(eventName, eventCallback) {
    if (eventName === 'message' || eventName === 'errorReceived') {
      self._amqpClient.getReceiver(self._messagingEndpoint, function(err, msgReceiver) {
        msgReceiver.on(eventName, eventCallback);
      });
    }
  });
}

/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_002: [The `AmqpReceiver` object shall inherit from the `EventEmitter` node object.]*/
util.inherits(AmqpReceiver, EventEmitter);

/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_004: [The `complete` method shall forward the `message` and `callback` arguments to the underlying message receiver.]*/
AmqpReceiver.prototype.complete = function complete(msg, callback) {
  this._amqpClient.getReceiver(this._messagingEndpoint, function (err, msgReceiver) {
    msgReceiver.complete(msg, callback);
  });
};

/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_005: [The `reject` method shall forward the `message` and `callback` arguments to the underlying message receiver.]*/
AmqpReceiver.prototype.reject = function reject(msg, callback) {
  this._amqpClient.getReceiver(this._messagingEndpoint, function (err, msgReceiver) {
    msgReceiver.reject(msg, callback);
  });
};

/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_006: [The `abandon` method shall forward the `message` and `callback` arguments to the underlying message receiver.]*/
AmqpReceiver.prototype.abandon = function abandon(msg, callback) {
  this._amqpClient.getReceiver(this._messagingEndpoint, function (err, msgReceiver) {
    msgReceiver.abandon(msg, callback);
  });
};

/*Codes_SRS_NODE_DEVICE_AMQP_RECEIVER_16_007: [The `onDeviceMethod` method shall forward the `methodName` and `methodCallback` arguments to the underlying `Amqp[DeviceMethodClient` object.]*/
AmqpReceiver.prototype.onDeviceMethod = function onDeviceMethod(methodName, methodCallback) {
  this._deviceMethodClient.onDeviceMethod(methodName, methodCallback);
};

module.exports = AmqpReceiver;