// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var ModuleTestHelper = require('./module_test_helper.js');
var assert = require('chai').assert;
var debug = require('debug')('e2etests:module-methods');
var Amqp = require('azure-iot-device-amqp').Amqp;
var AmqpWs = require('azure-iot-device-amqp').AmqpWs;
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var MqttWs = require('azure-iot-device-mqtt').MqttWs;

var transportsToTest = [ Amqp, AmqpWs, Mqtt, MqttWs ];

describe('module methods', function() {
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

      it ('can receive a method call', function(done) {
        var methodName = 'my_method';
        var requestPayload = {
          fakePayloadKey: '__FAKE_PAYLOAD_VALUE__'
        };
        var methodResult = 400;
        var responsePayload = {
          anotherFakePayloadKey: '__ANOTHER_FAKE_PAYLOAD_VALUE__'
        };
        var methodParams = {
          methodName: methodName,
          payload: requestPayload,
          connectTimeoutInSeconds: 30,
          responseTimeoutInSeconds: 45
        };

        debug('adding method handler for ' + methodName);
        testModule.deviceClient.onMethod(methodName, function(request, response) {
          debug('received method call for ' + methodName);
          debug('payload: ' + request.payload);
          assert.strictEqual(request.methodName, methodName);
          assert.deepEqual(request.payload, requestPayload);

          debug('sending method response with statusCode: ' + methodResult);
          response.send(methodResult, responsePayload, function(err) {
            debug('response.send returned ' + (err ? err : 'success'));
            assert(!err);
          });
        });

        // Waiting for an arbitrary 2 seconds because we don't know when all the links above have been established.
        debug('waiting for links before invoking method');
        setTimeout(function() {
          debug('invoking method');
          testModule.serviceClient.invokeDeviceMethod(testModule.deviceId, testModule.moduleId, methodParams, function(err, response) {
            debug('invokeDeviceMethod returned ' + (err ? err : 'success'));
            if (err) {
              done(err);
            } else {
              debug('response: ' + response);
              assert.strictEqual(response.status, methodResult);
              assert.deepEqual(response.payload, responsePayload);
              done();
            }
          });
        }, 2000);
      });
    });
  });
});
