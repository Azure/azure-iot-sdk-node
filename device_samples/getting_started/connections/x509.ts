// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client, Message } from 'azure-iot-device';
import { readFile } from 'fs/promises';

// String containing Hostname and Device ID in the following format:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;x509=true"
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';
const certFile = process.env.PATH_TO_CERTIFICATE_FILE || '';
const keyFile = process.env.PATH_TO_KEY_FILE || '';
const passphrase = process.env.KEY_PASSPHRASE_OR_EMPTY || ''; // Key Passphrase if one exists.
const logRed = '\x1b[31m%s\x1b[0m';
const logYellow = '\x1b[33m%s\x1b[0m';

if (!deviceConnectionString) {
  console.error(logRed, 'Missing device connection string');
  process.exit(1);
}

if (!certFile) {
  console.error(logRed, 'Missing certificate file');
  process.exit(1);
}

if (!keyFile) {
  console.error(logRed, 'Missing key file');
  process.exit(1);
}

if (!passphrase) {
  console.log(logYellow, 'Warning: passphrase is empty');
}

async function main() {
  // Client.fromConnectionString() requires a transport constructor coming from
  // one of the device transport packages.
  const client = Client.fromConnectionString(deviceConnectionString, Protocol);

  // Calling setOptions with the x509 certificate and key (and optionally, passphrase)
  // will configure the client transport to use x509 when connecting to IoT Hub
  const certPromise = readFile(certFile, 'utf8');
  const keyPromise = readFile(keyFile, 'utf8');
  await client.setOptions({
    cert: await certPromise,
    key: await keyPromise,
    ...(passphrase && { passphrase })
  });

  // Open client connection to IoT Hub
  console.log('Opening connection to IoT Hub');
  await client.open();
  console.log('Client connection: Open');

  // Send a telemetry message to IoT Hub
  const messageData = JSON.stringify({ temperature: 20 + Math.random() * 10 });
  console.log(`Sending message: ${messageData}`);
  await client.sendEvent(new Message(messageData));
  console.log('Message sent');

  // Close client connection
  console.log('Closing connection');
  await client.close();
  console.log('Client connection: Closed');
}

main().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error(logRed, err);
  process.exit(1);
});