// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var serviceSdk = require('azure-iothub');
var serviceSas = require('azure-iothub').SharedAccessSignature;
var Message = require('azure-iot-common').Message;
var anHourFromNow = require('azure-iot-common').anHourFromNow;
var Registry = require('azure-iothub').Registry;
var NoRetry = require('azure-iot-common').NoRetry;
var deviceSdk = require('azure-iot-device');
var httpModule = require('azure-iot-device-http');
var amqpModule = require('azure-iot-device-amqp');
var mqttModule = require('azure-iot-device-mqtt');


var uuid = require('uuid');

var hubConnectionString = process.env.IOTHUB_CONN_STRING_INVALID_CERT;
var deviceConnectionString = process.env.IOTHUB_DEVICE_CONN_STRING_INVALID_CERT;

var correctDisconnectMessage = function(err, done) {
  if (err) {
    if (err.amqpError && (err.amqpError.name === 'NotConnectedError')) {
      done();
    } else if (err.name && (err.name  === 'NotConnectedError')) {
      done();
    } else if (err.code && (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
      done();
    } else {
      done(new Error('client did NOT detect bad cert.'));
    }
  } else {
    done(new Error('client did NOT detect bad cert.'));
  }
};


describe('Service Client', function () {
  this.timeout(60000);
  [
    require('azure-iothub').Amqp,
    require('azure-iothub').AmqpWs
  ].forEach(function (Transport) {
    it('Service client will fail with SAS token over ' + Transport.name + ' using a shared access signature', function(done) {
      var connStr = serviceSdk.ConnectionString.parse(hubConnectionString);
      var sas = serviceSas.create(connStr.HostName, connStr.SharedAccessKeyName, connStr.SharedAccessKey, anHourFromNow()).toString();
      var serviceClient = serviceSdk.Client.fromSharedAccessSignature(sas, Transport);
      serviceClient.open(function(err) {
        if (err) {
          correctDisconnectMessage(err, done);
        } else {
          serviceClient.close(function() {
            done(new Error('service client did NOT detect bad cert.'));
          });
        }
      });
    });

    it('Service client will fail with connection string over ' + Transport.name + ' using a connection string', function(done) {
      var serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString, Transport);
      serviceClient.open(function(err) {
        if (err) {
          correctDisconnectMessage(err, done);
        } else {
          serviceClient.close(function() {
            done(new Error('service client did NOT detect bad cert.'));
          });
        }
      });
    });
  });
});

describe('Registry', function () {
  this.timeout(60000);
  var deviceIdOnly = {
    deviceId: uuid.v4()
  };
  it('Fails to create a device', function (done){
    var registry = Registry.fromConnectionString(hubConnectionString);
    registry.create(deviceIdOnly, function(err) {
      correctDisconnectMessage(err, done);
    });
  });
});


describe('Device Client', function() {
  var uuidData = uuid.v4();
  var originalMessage = new Message(uuidData);
  [
    httpModule.Http,
    amqpModule.Amqp,
    amqpModule.AmqpWs,
    mqttModule.Mqtt,
    mqttModule.MqttWs
  ].forEach(function (deviceTransport) {
    describe('Over ' + deviceTransport.name, function () {
      it('Fails to open a device', function(done) {
        var deviceClient = deviceSdk.Client.fromConnectionString(deviceConnectionString, deviceTransport);
        deviceClient.setRetryPolicy(new NoRetry());
        deviceClient.sendEvent(originalMessage, function(err) {
          correctDisconnectMessage(err, done);
        });
      });
    });
  });
});

