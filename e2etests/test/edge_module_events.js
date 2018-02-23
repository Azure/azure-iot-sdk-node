// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

process.env.DEBUG='azure-iot-*';

var async = require('async');
var uuid = require('uuid');
var DeviceClient = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
var Mqtt = require('azure-iot-device-mqtt').Mqtt;

var sendingModuleConnectionString = process.env.IOT_MODULES_SENDING_MODULE;
var sendingMoudleOutputChannel = 'sendChannel';
var receivingModuleConnectionstring = process.env.IOT_MODULES_RECEIVING_MODULE;
var receivingModuleInputChannel = 'receiveChannel';

var edgeModuleEventTransports = [ Mqtt] ;

edgeModuleEventTransports.forEach(function(Transport) {
  describe('Edge Module Events over ' + Transport.name, function() {
    var sendingClient;
    var receivingClient;

    this.timeout(30000);

    beforeEach(function(callback) {
      sendingClient = DeviceClient.fromConnectionString(sendingModuleConnectionString, Transport);
      receivingClient = DeviceClient.fromConnectionString(receivingModuleConnectionstring, Transport);
      sendingClient.open(function(err) {
        if (err) {
          callback(err);
        } else {
          receivingClient.open(function(err) {
            if (err) {
              callback(err);
            } else {
              callback();
            }
          });
        }
      });
    });

    afterEach(function(callback) {
      async.each([sendingClient, receivingClient], function(client, closeCallback) {
        if (client) {
          client.close(function() {
            closeCallback();
          });
        } else {
          closeCallback();
        }
      }, function(err) {
        sendingClient = null;
        receivingClient = null;
        callback(err);
      });
    });

    it ('can send and receive single events', function(callback) {
      var testString = uuid.v4().toString();
      var testMessage = new Message(testString);

      receivingClient.onInputMessage(receivingModuleInputChannel, function(message) {
        if (message.data.toString('ascii') === testString) {
          callback();
        }
        receivingClient.complete(message);
      });

      sendingClient.sendOutputEvent(sendingMoudleOutputChannel, testMessage, function(err) {
        if (err) {
          callback(err);
        }
      });
    });
  });
});
