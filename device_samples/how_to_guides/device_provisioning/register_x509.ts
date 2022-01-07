// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import { Client, Message, Twin } from 'azure-iot-device';
import { ProvisioningDeviceClient, RegistrationResult } from 'azure-iot-provisioning-device';
import { X509Security } from 'azure-iot-security-x509';
import fs from 'fs';

// change the following using statement if you would like to try another protocol.
import { Mqtt as ProvProtocol } from 'azure-iot-provisioning-device-mqtt';
// import { Amqp as ProvProtocol } from 'azure-iot-provisioning-device-amqp';
// import { Http as ProvProtocol } from 'azure-iot-provisioning-device-http';
// import { MqttWs as ProvProtocol } from 'azure-iot-provisioning-device-mqtt';
// import { AmqpWs as ProvProtocol } from 'azure-iot-provisioning-device-amqp';

const provisioningHost = process.env.PROVISIONING_HOST ?? 'global.azure-devices-provisioning.net';
const idScope = process.env.PROVISIONING_IDSCOPE ?? '';
const registrationId = process.env.PROVISIONING_REGISTRATION_ID ?? '';
const certFile = process.env.CERTIFICATE_FILE ?? '';
const keyFile = process.env.KEY_FILE ?? '';
const logRed = '\x1b[31m%s\x1b[0m';

const deviceCert: { cert: string; key: string; } = { cert: fs.readFileSync(certFile).toString(), key: fs.readFileSync(keyFile).toString() };
const securityClient = new X509Security(registrationId, deviceCert);
const deviceClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvProtocol(), securityClient);

// Register the device. Do not force a re-registration.
deviceClient.register(function(err: Error | undefined, result: RegistrationResult | any) {
  if (err) {
    console.log(logRed, "Error registering device: " + err);
  } else {
    console.log('Registration succeeded...');
    console.log(' assigned hub=' + result.assignedHub);
    console.log(' deviceId=' + result.deviceId);

    const connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';x509=true';
    const hubClient = Client.fromConnectionString(connectionString, Protocol);

    hubClient.setOptions(deviceCert);
    hubClient.open(function(error: Error | undefined) {
      if (error) {
        console.error(logRed, 'Failure opening iothub connection: ' + error.message);
      } else {
        console.log('Client connected');

        hubClient.sendEvent(new Message('Hello world'), function(er: Error | undefined, res: any) {
          if (er) console.log(logRed, 'Send error: ' + er.message);
          if (res) console.log(logRed, 'Send status: ' + res.constructor.name);
          process.exit(1);
        });
      }
    });
  }
});

