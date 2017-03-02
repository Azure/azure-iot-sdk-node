// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var debug = require('debug')('azure-iot-device-amqp.AmqpDeviceMethodClient');
var machina = require('machina');
var endpoint = require('azure-iot-common').endpoint;
var Message = require('azure-iot-common').Message;
var ArgumentError = require('azure-iot-common').errors.ArgumentError;

var methodMessagePropertyKeys = {
  methodName: 'IoThub-methodname',
  status: 'IoThub-status'
};

function AmqpDeviceMethodClient(config, amqpClient) {
  /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_001: [The `AmqpDeviceMethodClient` shall throw a `ReferenceError` if the `config` argument is falsy.]*/
  if (!config) {
    throw new ReferenceError('\'config\' cannot be \'' + config + '\'');
  }

  /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_002: [The `AmqpDeviceMethodClient` shall throw a `ReferenceError` if the `amqpClient` argument is falsy.]*/
  if (!amqpClient) {
    throw new ReferenceError('\'amqpClient\' cannot be \'' + amqpClient + '\'');
  }

  /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_003: [The `AmqpDeviceMethodClient` shall inherit from the `EventEmitter` class.]*/
  EventEmitter.call(this);
  this._config = config;
  this._amqpClient = amqpClient;
  /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_017: [The endpoint used to for the sender and receiver link shall be `/devices/<device-id>/methods/devicebound`.]*/
  this._methodEndpoint = endpoint.devicePath(encodeURIComponent(this._config.deviceId)) + '/methods/devicebound';
  this._methodReceiverInitialized = false;

  var thisClient = this;
  
  this._onMethodRequest = function _onMethodRequest(msg) {
    debug('got method request');
    debug(JSON.stringify(msg, null, 2));
    var methodName = msg.properties.getValue(methodMessagePropertyKeys.methodName);
    var methodRequest = {
      methods: { methodName: methodName },
      requestId: msg.correlationId,
      body: msg.getData()
    };

    debug(JSON.stringify(methodRequest, null, 2));
    thisClient.emit('method_' + methodName, methodRequest);
  };

  this._forwardError = function _forwardError(err) {
    thisClient.emit('errorReceived', err);
  };

  this._fsm = new machina.Fsm({
    namespace: 'device-method-client',
    initialState: 'disconnected',
    states: {
      'disconnected': {
        sendMethodResponse: function () {
          this.deferUntilTransition('connected');
          this.transition('connecting');
        },
        onDeviceMethod: function () {
          this.deferUntilTransition('connected');
          this.transition('connecting');
        }
      },
      'connecting': {
        _onEnter: function() {
          var linkOptions = {
            attach: {
              properties: {
                'com.microsoft:api-version': endpoint.apiVersion,
                'com.microsoft:channel-correlation-id': thisClient._config.deviceId
              }
            }
          };

          thisClient._amqpClient.attachSenderLink(thisClient._methodEndpoint, linkOptions, function(err) {
            if (err) {
              thisClient._fsm.transition('disconnected');
              thisClient.emit('errorReceived', err);
            } else {
              thisClient._amqpClient.attachReceiverLink(thisClient._methodEndpoint, linkOptions, function(err) {
                if (err) {
                  thisClient._fsm.transition('disconnected');
                  thisClient.emit('errorReceived', err);
                } else {
                  thisClient._fsm.transition('connected');
                }
              });
            }
          });
        },
        sendMethodResponse: function () {
          this.deferUntilTransition('connected');
          this.transition('connecting');
        },
        onDeviceMethod: function () {
          this.deferUntilTransition('connected');
          this.transition('connecting');
        }
      },
      'connected': {
        sendMethodResponse: function (response, callback) {
          var message = new Message(JSON.stringify(response.payload));
          message.correlationId = response.requestId;
          message.properties.add(methodMessagePropertyKeys.status, response.status);
          thisClient._amqpClient.send(message, thisClient._methodEndpoint, undefined, callback);
        },
        onDeviceMethod: function (methodName, methodCallback) {
          thisClient._amqpClient.getReceiver(thisClient._methodEndpoint, function (err, methodReceiver) {
            if (!thisClient._methodReceiverInitlialized) {
              methodReceiver.on('message', thisClient._onMethodRequest);
              methodReceiver.on('errorReceived', thisClient._forwardError);
              thisClient._methodReceiverInitlialized = true;
            }

            debug('attaching callback for method: ' + methodName);
            thisClient.on('method_' + methodName, methodCallback);
          });
        }
      }
    }
  });
}

util.inherits(AmqpDeviceMethodClient, EventEmitter);

AmqpDeviceMethodClient.prototype.sendMethodResponse = function sendMethodResponse(response, callback) {
  if (!response) throw new ReferenceError('response cannot be \'' + response + '\'');
  if (response.status === null || response.status === undefined) throw new ArgumentError('response.status cannot be \'' + response.status + '\'');
  if (!response.requestId) throw new ArgumentError('response.requestId cannot be \'' + response.requestId + '\'');

  this._fsm.handle('sendMethodResponse', response, callback);
};

AmqpDeviceMethodClient.prototype.onDeviceMethod = function onDeviceMethod(methodName, callback) {
  if (!methodName) throw new ReferenceError('methodName cannot be \'' + methodName + '\'');
  /*Codes_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_018: [The `onDeviceMethod` method shall throw an `ArgumentError` if the `methodName` argument is not a string.]*/
  if (typeof methodName !== 'string') throw new ArgumentError('methodName must be a string');

  this._fsm.handle('onDeviceMethod', methodName, callback);
};

module.exports = AmqpDeviceMethodClient;