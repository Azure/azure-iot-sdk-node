// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const iotHubTransport = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const tpmSecurity = require('azure-iot-security-tpm');
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

// You can change the following using statement if you would like to try another protocol.
const ProvisioningTransport = require('azure-iot-provisioning-device-amqp').Amqp;
// const ProvisioningTransport = require('azure-iot-provisioning-device-amqp').AmqpWs;
// const ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').Mqtt;
// const ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').MqttWs;

const provisioningHost = process.env.IOTHUB_DEVICE_DPS_ENDPOINT ?? 'global.azure-devices-provisioning.net';
const idScope = process.env.IOTHUB_DEVICE_DPS_ID_SCOPE ?? '';

const securityClient = new tpmSecurity.TpmSecurityClient();
const provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvisioningTransport(), securityClient);
const logRed = '\x1b[31m%s\x1b[0m';

// Register the device.  Do not force a re-registration.
provisioningClient.register(function(err, result) {
  if (err) {
    console.log(logRed, "Error registering device: " + err);
  } else {
    console.log('Registration succeeded...');
    console.log(' assigned hub=' + result.registrationState.assignedHub);
    console.log(' deviceId=' + result.registrationState.deviceId);
    
    const tpmAuthenticationProvider = tpmSecurity.TpmAuthenticationProvider.fromTpmSecurityClient(result.registrationState.deviceId, result.registrationState.assignedHub, securityClient);
    const hubClient = Client.fromAuthenticationProvider(tpmAuthenticationProvider, iotHubTransport);

    const connectCallback = function (err) {
      if (err) {
        console.error(logRed, 'Could not connect: ' + err.message);
      } else {
        console.log('Client connected');        
        hubClient.sendEvent(new Message('Hello world'), printResultFor('send'));
      }
    };

    hubClient.open(connectCallback);

    function printResultFor(op) {
      return function printResult(err, res) {
        if (err) console.log(logRed, 'Send error: ' + err.toString());
        if (res) console.log('Send status: ' + res.constructor.name);
        process.exit(1);
      };
    }
  }
});
