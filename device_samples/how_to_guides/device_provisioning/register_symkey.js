// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const iotHubTransport = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

// Feel free to change the preceding using statement to anyone of the following if you would like to try another protocol.
const ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').Mqtt;
// const ProvisioningTransport = require('azure-iot-provisioning-device-http').Http;
// const ProvisioningTransport = require('azure-iot-provisioning-device-amqp').Amqp;
// const ProvisioningTransport = require('azure-iot-provisioning-device-amqp').AmqpWs;
// const ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').MqttWs;

const provisioningHost = process.env.IOTHUB_DEVICE_DPS_ENDPOINT ?? 'global.azure-devices-provisioning.net';
const idScope = process.env.IOTHUB_DEVICE_DPS_ID_SCOPE ?? '';
const registrationId = process.env.IOTHUB_DEVICE_DPS_REGISTRATION_ID ?? '';
const symmetricKey = process.env.IOTHUB_DEVICE_DPS_SYMMETRIC_KEY ?? '';
const logRed = '\x1b[31m%s\x1b[0m';

const securityClient = new SymmetricKeySecurityClient(registrationId, symmetricKey);
const provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvisioningTransport(), securityClient);

// Register the device.
provisioningClient.setProvisioningPayload({a: 'b'});
provisioningClient.register(function(err, result) {
  if (err) {
    console.log(logRed, "Error registering device: " + err.message);
  } else {
    console.log('Registration succeeded...');
    console.log(' assigned hub=' + result.assignedHub);
    console.log(' deviceId=' + result.deviceId);
    
    const connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
    const hubClient = Client.fromConnectionString(connectionString, iotHubTransport);

    hubClient.open(function(err) {
      if (err) {
        console.error(logRed, 'Could not connect: ' + err.message);
      } else {
        console.log('Client connected');
        
        hubClient.sendEvent(new Message('Hello world'), function(err, res) {
          if (err) console.log(logRed, 'Send error: ' + err.toString());
          if (res) console.log('Send status: ' + res.constructor.name);
          process.exit(0);
        });
      }
    });
  }
});
