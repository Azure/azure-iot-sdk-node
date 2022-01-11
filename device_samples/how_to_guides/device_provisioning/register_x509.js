// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const iotHubTransport = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const fs = require('fs');
const X509Security = require('azure-iot-security-x509').X509Security;
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

// You can change the following using statement if you would like to try another protocol.
const Transport = require('azure-iot-provisioning-device-mqtt').Mqtt;
// const Transport = require('azure-iot-provisioning-device-amqp').Amqp;
// const Transport = require('azure-iot-provisioning-device-amqp').AmqpWs;
// const Transport = require('azure-iot-provisioning-device-http').Http;
// const Transport = require('azure-iot-provisioning-device-mqtt').MqttWs;

const provisioningHost = process.env.PROVISIONING_HOST ?? 'global.azure-devices-provisioning.net';
const idScope = process.env.PROVISIONING_IDSCOPE ?? '';
const registrationId = process.env.PROVISIONING_REGISTRATION_ID ?? '';
const certFile = process.env.CERTIFICATE_FILE ?? '';
const keyFile = process.env.KEY_FILE ?? '';
const logRed = '\x1b[31m%s\x1b[0m';

const deviceCert = { cert: fs.readFileSync(certFile).toString(), key: fs.readFileSync(keyFile).toString() };
const transport = new Transport();
const securityClient = new X509Security(registrationId, deviceCert);
const deviceClient = ProvisioningDeviceClient.create(provisioningHost, idScope, transport, securityClient);

// Register the device. Do not force a re-registration.
deviceClient.register(function(err, result) {
  if (err) {
    console.log(logRed, "Error registering device: " + err);
  } else {
    console.log('Registration succeeded...');
    console.log(' assigned hub=' + result.assignedHub);
    console.log(' deviceId=' + result.deviceId);

    const connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';x509=true';
    const hubClient = Client.fromConnectionString(connectionString, iotHubTransport);
    
    hubClient.setOptions(deviceCert);
    hubClient.open(function(err) {
      if (err) {
        console.error(logRed, 'Failure opening iothub connection: ' + err.message);
      } else {
        console.log('Client connected');

        hubClient.sendEvent(new Message('Hello world'), function(err, res) {
          if (err) console.log(logRed, 'Send error: ' + err.message);
          if (res) console.log('Send status: ' + res.constructor.name);
          process.exit(1);
        });
      }
    });
  }
});

