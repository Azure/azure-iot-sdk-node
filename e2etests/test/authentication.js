// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var uuid = require('uuid');

var UnauthorizedError = require('azure-iot-common').errors.UnauthorizedError;
var Message = require('azure-iot-common').Message;
var Registry = require('azure-iothub').Registry;
var ServiceConnectionString = require('azure-iothub').ConnectionString;
var DeviceClient = require('azure-iot-device').Client;
var DeviceConnectionString = require('azure-iot-device').ConnectionString;
var Amqp = require('azure-iot-device-amqp').Amqp;
var AmqpWs = require('azure-iot-device-amqp').AmqpWs;
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var MqttWs = require('azure-iot-device-mqtt').MqttWs;
var Http = require('azure-iot-device-http').Http;

var transports = [Amqp, AmqpWs, Mqtt, MqttWs, Http];

module.exports = function authentication_tests(hubConnectionString) {
  describe('Authentication', function() {
    this.timeout(15000);
    var hostName = ServiceConnectionString.parse(hubConnectionString).HostName;
    var testDeviceId = 'nodee2etestDeviceAuth-' + uuid.v4();
    var testDeviceKey = '';

    before('Creates a test device', function(beforeCallback) {
      var registry = Registry.fromConnectionString(hubConnectionString);
      registry.create({ deviceId: testDeviceId }, function(err, createdDevice) {
        if (err) {
          beforeCallback(err);
        } else {
          testDeviceKey = createdDevice.authentication.symmetricKey.primaryKey;
          beforeCallback();
        }
      });
    });

    after('Destroys the test device', function(afterCallback) {
      var registry = Registry.fromConnectionString(hubConnectionString);
      registry.delete(testDeviceId, afterCallback);
    });

    describe('ConnectionString', function() {
      transports.forEach(function (Transport) {
        it('Gets an UnauthorizedError over ' + Transport.name + ' if the primary key is invalid', function(testCallback) {
          var invalidPrimaryKey = new Buffer('invalidPrimaryKey').toString('base64');
          var invalidConnectionString = DeviceConnectionString.createWithSharedAccessKey(hostName, testDeviceId, invalidPrimaryKey);
          var deviceClient = DeviceClient.fromConnectionString(invalidConnectionString, Transport);
          deviceClient.sendEvent(new Message('testMessage'), function(err) {
            assert.instanceOf(err, UnauthorizedError);
            testCallback();
          });
        });
      });
    });
  });
};
