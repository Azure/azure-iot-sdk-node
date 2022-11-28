// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let ModuleTestHelper = require('./module_test_helper.js');
let EventHubReceiverHelper = require('./eventhub_receiver_helper');
let Rendezvous = require('./rendezvous_helper.js').Rendezvous;
let Message = require('azure-iot-common').Message;
let assert = require('chai').assert;
let debug = require('debug')('e2etests:module-messaging');
let Amqp = require('azure-iot-device-amqp').Amqp;
let AmqpWs = require('azure-iot-device-amqp').AmqpWs;
let Mqtt = require('azure-iot-device-mqtt').Mqtt;
let MqttWs = require('azure-iot-device-mqtt').MqttWs;

let transportsToTest = [ Amqp, AmqpWs, Mqtt, MqttWs ];

describe('module messaging', function () {
  // eslint-disable-next-line no-invalid-this
  this.timeout(60000);

  transportsToTest.forEach(function (Transport) {
    describe('using ' + Transport.name, function () {
      let testModule = {};

      before(function (done) {
        debug('using ModuleTestHelper to create modules');
        ModuleTestHelper.createModule(testModule, Transport, function (err) {
          debug('ModuleTestHelper.createModule returned ' + (err ? err : 'success'));
          done(err);
        });
      });

      after(function (done) {
        debug('using ModuleTestHelper to clean up after tests');
        ModuleTestHelper.cleanUpAfterTest(testModule, function (err) {
          debug('ModuleTestHelper.cleanUpAfterTest returned ' + (err ? err : 'success'));
          done(err);
        });
      });

      it ('Can send from module to service', function (testCallback) {
        let testOutputText = '__test_output_text__';
        let deviceClientParticipant = 'deviceClient';
        let ehClientParticipant = 'ehClientParticipant';
        let finishUp = function () {
          ehReceiver.closeClient(testCallback);
        };
        let testRendezvous = new Rendezvous(finishUp);
        testRendezvous.imIn(deviceClientParticipant); // Set up by the before hook.

        let ehReceiver = new EventHubReceiverHelper();
        debug('opening eventHub receiver');
        ehReceiver.openClient(function (err) {
          debug('ehReceiver.openClient returned ' + (err ? err : 'success'));
          if (err) {
            testCallback (err);
          } else {
            testRendezvous.imIn(ehClientParticipant);
            debug('adding handler for \'message\' event on ehReceiver');
            ehReceiver.on('message', function (msg) {
              if (msg.annotations['iothub-connection-device-id'] === testModule.deviceId && msg.annotations['iothub-connection-module-id'] === testModule.moduleId) {
                assert.strictEqual(msg.body.toString('ascii'), testOutputText);
                testRendezvous.imDone(ehClientParticipant);
              }
            });
            // Make sure the above on is fully set up.
            setTimeout(function () {
              debug('sending message');
              testModule.deviceClient.sendEvent(new Message(testOutputText), function (err) {
                if (err) {
                  debug('module send event returned ' + err);
                  testCallback(err);
                } else {
                  debug('module send event completed without error');
                  testRendezvous.imDone(deviceClientParticipant);
                }
              });
            },5000);
          }
        });
      });
    });
  });
});
