// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var uuid = require('uuid');
var pem  = require('pem');

var UnauthorizedError = require('azure-iot-common').errors.UnauthorizedError;
var DeviceNotFoundError = require('azure-iot-common').errors.DeviceNotFoundError;
var NotConnectedError = require('azure-iot-common').errors.NotConnectedError;
var Message = require('azure-iot-common').Message;
var Registry = require('azure-iothub').Registry;
var ServiceConnectionString = require('azure-iothub').ConnectionString;
var DeviceClient = require('azure-iot-device').Client;
var DeviceConnectionString = require('azure-iot-device').ConnectionString;
var DeviceSAS = require('azure-iot-device').SharedAccessSignature;
var Amqp = require('azure-iot-device-amqp').Amqp;
var AmqpWs = require('azure-iot-device-amqp').AmqpWs;
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var MqttWs = require('azure-iot-device-mqtt').MqttWs;
var Http = require('azure-iot-device-http').Http;

var transports = [Amqp, AmqpWs, Mqtt, MqttWs, Http];
var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

describe('Authentication', function() {
  this.timeout(60000);
  var hostName = ServiceConnectionString.parse(hubConnectionString).HostName;
  var testDeviceId = 'nodee2etestOptions-' + uuid.v4();
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
    it('does some stuff', function(testCallback) {
      var connectionString = DeviceConnectionString.createWithSharedAccessKey(hostName, testDeviceId, testDeviceKey);
      var deviceClient = DeviceClient.fromConnectionString(connectionString, Mqtt);
      deviceClient.setOptions({'keepalive': 50})
      deviceClient.sendEvent(new Message('testMessage'), function(err) {
        if(err instanceof UnauthorizedError || err instanceof NotConnectedError) {
          testCallback();
        } else {
          testCallback(err);
        }
      });
    });
  });
});