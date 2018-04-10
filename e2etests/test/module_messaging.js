// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var ModuleIdentityHelper = require('./module_identity_helper.js');
var EventHubReceiverHelper = require('./eventhub_receiver_helper');
var Message = require('azure-iot-common').Message;
var assert = require('chai').assert;
var debug = require('debug')('e2etests:module-messaging');
var Amqp = require('azure-iot-device-amqp').Amqp;
var AmqpWs = require('azure-iot-device-amqp').AmqpWs;
//var Mqtt = require('azure-iot-device-mqtt').Mqtt;
//var MqttWs = require('azure-iot-device-mqtt').MqttWs;

var transportsToTest = [ Amqp, AmqpWs ];

describe('module messaging', function() {
  this.timeout(46000);

  transportsToTest.forEach(function(Transport) {
    describe('using ' + Transport.name, function() {
      var testModule = {};

      before(function(done) {
        ModuleIdentityHelper.createModule(testModule, Transport, done);
      });

      after(function(done) {
        ModuleIdentityHelper.cleanUpAfterTest(testModule, done);
      });

      it ('Can send from service to module input', function(done) {
        var testInputName = '__input__';
        var testMessageText = '__message__';

        testModule.deviceClient.on('inputMessage', function (inputName, msg) {
          assert.strictEqual(inputName, testInputName);
          assert.strictEqual(msg.getBytes().toString('ascii'), testMessageText);
          done();
        });

        var messageToSend = new Message(testMessageText);
        debug('sending message to input named ' + testInputName);
        testModule.serviceClient.sendToModule(testModule.deviceId, testModule.moduleId, testInputName, messageToSend, function(err) {
          debug('sendToModule returned ' + (err ? err : 'success'));
        });
      });

      it ('Can send from module output to service', function(done) {
        var testOutputName = '__output__';
        var testOutputText = '__test_output_text__';

        var ehReceiver = new EventHubReceiverHelper();
        after(function(done) {
          ehReceiver.closeClient(done);
        });
        ehReceiver.openClient(function(err) {
          if (err) {
            done (err);
          } else {
            ehReceiver.on('message', function(msg) {
              if (msg.properties.to === '/devices/' + testModule.deviceId + '/modules/' + testModule.moduleId + '/messages/events') {
                assert.strictEqual(msg.annotations['x-opt-output-name'], testOutputName);
                assert.strictEqual(msg.body.toString('ascii'), testOutputText);
                done();
              }
            });
            debug('sending message to output named ' + testOutputName);
            testModule.deviceClient.sendOutputEvent(testOutputName, new Message(testOutputText), function(err) {
              debug('sendOutputEvent returned ' + (err ? err : 'success'));
            });
          }
        });
      });
    });
  });
});
