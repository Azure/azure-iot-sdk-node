// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var iotHubTransport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
var crypto = require('crypto');


var ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').Mqtt;
// Feel free to change to using any of the following if you would like to try another protocol.
// var ProvisioningTransport = require('azure-iot-provisioning-device-http').Http;
// var ProvisioningTransport = require('azure-iot-provisioning-device-amqp').Amqp;
// var ProvisioningTransport = require('azure-iot-provisioning-device-amqp').AmqpWs;
// var ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').MqttWs;

var SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

//
// For the public clouds the address of the provisioning host would be: global.azure-devices-provisioning.net
//
var provisioningHost = process.env.PROVISIONING_HOST;

//
// You can find your idScope in the portal overview section for your dps instance.
//
var idScope = process.env.PROVISIONING_IDSCOPE;

//
// The registration id of the device to be registered.
//
var registrationId = process.env.PROVISIONING_REGISTRATION_ID;

var symmetricKey = process.env.PROVISIONING_SYMMETRIC_KEY;

function computeDerivedSymmetricKey(masterKey, regId) {
  return crypto.createHmac('SHA256', Buffer.from(masterKey, 'base64'))
    .update(regId, 'utf8')
    .digest('base64');
}
var symmetricKey = computeDerivedSymmetricKey(symmetricKey, registrationId);

var provisioningSecurityClient = new SymmetricKeySecurityClient(registrationId, symmetricKey);

var provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvisioningTransport(), provisioningSecurityClient);
// Register the device.
provisioningClient.register(function(err, result) {
  if (err) {
    console.log("error registering device: " + err);
  } else {
    console.log('registration succeeded');
    console.log('assigned hub=' + result.assignedHub);
    console.log('deviceId=' + result.deviceId);
    var connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
    var hubClient = Client.fromConnectionString(connectionString, iotHubTransport);

    hubClient.open(function(err) {
      if (err) {
        console.error('Could not connect: ' + err.message);
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
