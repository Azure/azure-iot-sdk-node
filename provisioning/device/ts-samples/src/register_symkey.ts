// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { Mqtt as iotHubTransport } from 'azure-iot-device-mqtt';
import { Client } from 'azure-iot-device';
import { Message } from 'azure-iot-device';

// import { Http as ProvisioningTransport } from 'azure-iot-provisioning-device-http';
// import { Amqp as ProvisioningTransport } from 'azure-iot-provisioning-device-amqp';
// import { AmqpWs as ProvisioningTransport } from 'azure-iot-provisioning-device-amqp';
import { Mqtt as ProvisioningTransport } from 'azure-iot-provisioning-device-mqtt';
// import { MqttWs as ProvisioningTransport } from 'azure-iot-provisioning-device-mqtt';
// Feel free to change the preceding import statement to anyone of the following if you would like to try another protocol.

import { SymmetricKeySecurityClient } from 'azure-iot-security-symmetric-key';
import { ProvisioningDeviceClient } from 'azure-iot-provisioning-device';

//
// For the public clouds the address of the provisioning host would be: global.azure-devices-provisioning.net
//
const provisioningHost = process.env.PROVISIONING_HOST;

//
// You can find your idScope in the portal overview section for your dps instance.
//
const idScope = process.env.PROVISIONING_IDSCOPE;

//
// The registration id of the device to be registered.
//
const registrationId = process.env.PROVISIONING_REGISTRATION_ID;

const symmetricKey = process.env.PROVISIONING_SYMMETRIC_KEY;

let provisioningSecurityClient = new SymmetricKeySecurityClient(registrationId, symmetricKey);

let provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvisioningTransport(), provisioningSecurityClient);
// Register the device.
provisioningClient.setProvisioningPayload({a: 'b'});
provisioningClient.register((err, result) => {
  if (err) {
    console.log('error registering device: ' + err);
  } else {
    console.log('registration succeeded');
    console.log('assigned hub=' + result.assignedHub);
    console.log('deviceId=' + result.deviceId);
    console.log('payload=' + JSON.stringify(result.payload));
    let connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
    let hubClient = Client.fromConnectionString(connectionString, iotHubTransport);

    hubClient.open((err) => {
      if (err) {
        console.error('Could not connect: ' + err.message);
      } else {
        console.log('Client connected');
        let message = new Message('Hello world');
        hubClient.sendEvent(message, (err, _res) => {
          if (err) console.log('send error: ' + err.toString());
          process.exit(1);
        });
      }
    });
  }
});
