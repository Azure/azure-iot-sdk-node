// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// var ProvisioningTransport = require('azure-iot-provisioning-device-http').Http;
var iotHubTransport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

// Feel free to change the preceding using statement to anyone of the following if you would like to try another protocol.
var ProvisioningTransport = require('azure-iot-provisioning-device-amqp').Amqp;
// var ProvisioningTransport = require('azure-iot-provisioning-device-amqp').AmqpWs;
// var ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').Mqtt;
// var ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').MqttWs;

var tpmSecurity = require('azure-iot-security-tpm');
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

//
// For the public clouds the address of the provisioning host would be: global.azure-devices-provisioning.net
//
var provisioningHost = '<replace with provisioning host entry point>';

//
// You can find your idScope in the portal overview section for your dps instance.
//
var idScope = '<the id scope for your dps instance>';

var securityClient = new tpmSecurity.TpmSecurityClient();

var provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvisioningTransport(), securityClient);
// Register the device.  Do not force a re-registration.
provisioningClient.register(function(err, result) {
  if (err) {
    console.log("error registering device: " + err);
  } else {
    console.log('registration succeeded');
    console.log('assigned hub=' + result.registrationState.assignedHub);
    console.log('deviceId=' + result.registrationState.deviceId);
    var tpmAuthenticationProvider = tpmSecurity.TpmAuthenticationProvider.fromTpmSecurityClient(result.registrationState.deviceId, result.registrationState.assignedHub, securityClient);
    var hubClient = Client.fromAuthenticationProvider(tpmAuthenticationProvider, iotHubTransport);

    var connectCallback = function (err) {
      if (err) {
        console.error('Could not connect: ' + err.message);
      } else {
        console.log('Client connected');
        var message = new Message('Hello world');
        hubClient.sendEvent(message, printResultFor('send'));
      }
    };

    hubClient.open(connectCallback);

    function printResultFor(op) {
      return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
        process.exit(1);
      };
    }
  }
});
