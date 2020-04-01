// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var iotHubTransport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

var fs = require('fs');
var Transport = require('azure-iot-provisioning-device-http').Http;

// Feel free to change the preceding using statement to anyone of the following if you would like to try another protocol.
// var Transport = require('azure-iot-provisioning-device-amqp').Amqp;
// var Transport = require('azure-iot-provisioning-device-amqp').AmqpWs;
// var Transport = require('azure-iot-provisioning-device-mqtt').Mqtt;
// var Transport = require('azure-iot-provisioning-device-mqtt').MqttWs;

var X509Security = require('azure-iot-security-x509').X509Security;
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

var provisioningHost = '[provisioning host]';
var idScope = '[id scope]';
var registrationId = '[registration id]';
var deviceCert = {
  cert: fs.readFileSync('[cert filename]').toString(),
  key: fs.readFileSync('[key filename]').toString()
};

var transport = new Transport();
var securityClient = new X509Security(registrationId, deviceCert);
var deviceClient = ProvisioningDeviceClient.create(provisioningHost, idScope, transport, securityClient);

// Register the device.  Do not force a re-registration.
deviceClient.register(function(err, result) {
  if (err) {
    console.log("error registering device: " + err);
  } else {
    console.log('registration succeeded');
    console.log('assigned hub=' + result.assignedHub);
    console.log('deviceId=' + result.deviceId);
    var connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';x509=true';
    var hubClient = Client.fromConnectionString(connectionString, iotHubTransport);
    hubClient.setOptions(deviceCert);
    hubClient.open(function(err) {
      if (err) {
        console.error('Failure opening iothub connection: ' + err.message);
      } else {
        console.log('Client connected');
        var message = new Message('Hello world');
        hubClient.sendEvent(message, function(err, res) {
          if (err) console.log('send error: ' + err.toString());
          if (res) console.log('send status: ' + res.constructor.name);
          process.exit(1);
        });
      }
    });
  }
});

