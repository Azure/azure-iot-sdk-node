// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import { Client, Message, Twin } from 'azure-iot-device';
import { SymmetricKeySecurityClient } from 'azure-iot-security-symmetric-key';
import { ProvisioningDeviceClient, RegistrationResult } from 'azure-iot-provisioning-device';
import crypto from 'crypto';

// change the following using statement if you would like to try another protocol.
import { Mqtt as ProvProtocol } from 'azure-iot-provisioning-device-mqtt';
// import { Amqp as ProvProtocol } from 'azure-iot-provisioning-device-amqp';
// import { Http as ProvProtocol } from 'azure-iot-provisioning-device-http';
// import { MqttWs as ProvProtocol } from 'azure-iot-provisioning-device-mqtt';
// import { AmqpWs as ProvProtocol } from 'azure-iot-provisioning-device-amqp';

const provisioningHost = process.env.PROVISIONING_HOST ?? 'global.azure-devices-provisioning.net';
const idScope = process.env.PROVISIONING_IDSCOPE ?? '';
const registrationId = process.env.PROVISIONING_REGISTRATION_ID ?? '';
const symmetricKey = process.env.PROVISIONING_SYMMETRIC_KEY ?? '';
const logRed = '\x1b[31m%s\x1b[0m';

function computeDerivedSymmetricKey(masterKey: string, regId: string) {
  return crypto.createHmac('SHA256', Buffer.from(masterKey, 'base64'))
    .update(regId, 'utf8')
    .digest('base64');
}

const derivedSymmetricKey = computeDerivedSymmetricKey(symmetricKey, registrationId);
const provisioningSecurityClient = new SymmetricKeySecurityClient(registrationId, derivedSymmetricKey);
const provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvProtocol(), provisioningSecurityClient);

// Register the device.
provisioningClient.register(function(err: Error | any, result: RegistrationResult | any) {
  if (err) {
    console.log(logRed, "Error registering device: " + err.message);
  } else {
    console.log('Registration succeeded...');
    console.log(' assigned hub=' + result.assignedHub);
    console.log(' deviceId=' + result.deviceId);

    const connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
    const hubClient = Client.fromConnectionString(connectionString, Protocol);

    hubClient.open(function(error: Error | undefined) {
      if (error) {
        console.error(logRed, 'Could not connect: ' + error.message);
      } else {
        console.log('Client connected');

        hubClient.sendEvent(new Message('Hello world'), function(er: Error | undefined, res: any) {
          if (er) console.log(logRed, 'Send error: ' + er.message);
          if (res) console.log('Send status: ' + res.constructor.name);
          process.exit(1);
        });
      }
    });
  }
});
