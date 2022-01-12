// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import { Client, Message, Twin } from 'azure-iot-device';
import { ProvisioningDeviceClient, RegistrationResult } from 'azure-iot-provisioning-device';
import { X509Security } from 'azure-iot-security-x509';
import fs from 'fs';

// change the following using statement if you would like to try another protocol.
import { Mqtt as ProvProtocol } from 'azure-iot-provisioning-device-mqtt';
import { RegistrationClient } from 'azure-iot-provisioning-device/dist/interfaces';
// import { Amqp as ProvProtocol } from 'azure-iot-provisioning-device-amqp';
// import { Http as ProvProtocol } from 'azure-iot-provisioning-device-http';
// import { MqttWs as ProvProtocol } from 'azure-iot-provisioning-device-mqtt';
// import { AmqpWs as ProvProtocol } from 'azure-iot-provisioning-device-amqp';

const provisioningHost: string = process.env.IOTHUB_DEVICE_DPS_ENDPOINT ?? 'global.azure-devices-provisioning.net';
const idScope: string = process.env.IOTHUB_DEVICE_DPS_ID_SCOPE ?? '';
const deviceId: string = process.env.IOTHUB_DEVICE_DPS_DEVICE_ID ?? 'my-first-device-id';
const certFile: string = process.env.CERTIFICATE_FILE ?? '';
const keyFile: string = process.env.KEY_FILE ?? '';
const logRed: string = '\x1b[31m%s\x1b[0m';

const deviceCert: { cert: string; key: string; } = { cert: fs.readFileSync(certFile).toString(), key: fs.readFileSync(keyFile).toString() };
const securityClient: X509Security = new X509Security(deviceId, deviceCert);
const registrationClient: RegistrationClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvProtocol(), securityClient);

// Register the device. Do not force a re-registration.
registrationClient.register(function(err: Error | undefined, result: RegistrationResult | any) {
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

