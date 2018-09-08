// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var ModuleTestHelper = require('./module_test_helper.js');
var EventHubReceiverHelper = require('./eventhub_receiver_helper');
var Message = require('azure-iot-common').Message;
var assert = require('chai').assert;
var debug = require('debug')('e2etests:module-messaging');
var Amqp = require('azure-iot-device-amqp').Amqp;
var AmqpWs = require('azure-iot-device-amqp').AmqpWs;
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var MqttWs = require('azure-iot-device-mqtt').MqttWs;

var transportsToTest = [ Amqp, AmqpWs, Mqtt, MqttWs ];

describe('module messaging', function() {
  this.timeout(46000);

  transportsToTest.forEach(function(Transport) {
    describe('using ' + Transport.name, function() {
      var testModule = {};

      before(function(done) {
        debug('using ModuleTestHelper to create modules');
        ModuleTestHelper.createModule(testModule, Transport, function(err) {
          debug('ModuleTestHelper.createModule returned ' + (err ? err : 'success'));
          done(err);
        });
      });

      after(function(done) {
        debug('using ModuleTestHelper to clean up after tests');
        ModuleTestHelper.cleanUpAfterTest(testModule, function(err) {
          debug('ModuleTestHelper.cleanUpAfterTest returned ' + (err ? err : 'success'));
          done(err);
        });
      });

      it ('Can send from module to service', function(done) {
        var testOutputText = '__test_output_text__';

        var ehReceiver = new EventHubReceiverHelper();
        after(function(done) {
          ehReceiver.closeClient(done);
        });
        debug('opening eventHub receiver');
        ehReceiver.openClient(function(err) {
          debug('ehReceiver.openClient returned ' + (err ? err : 'success'));
          if (err) {
            done (err);
          } else {
            debug('adding handler for \'message\' event on ehReceiver');
            ehReceiver.on('message', function(msg) {
              if (msg.annotations['iothub-connection-device-id'] === testModule.deviceId && msg.annotations['iothub-connection-module-id'] === testModule.moduleId) {
                assert.strictEqual(msg.body.toString('ascii'), testOutputText);
                done();
              }
            });
            debug('sending message');
            testModule.deviceClient.sendEvent(new Message(testOutputText), function(err) {
              debug('sendEvent returned ' + (err ? err : 'success'));
            });
          }
        });
      });
    });
  });
});
