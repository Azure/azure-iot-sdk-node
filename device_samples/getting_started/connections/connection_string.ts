// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client, Message } from 'azure-iot-device';

// String containing Hostname, Device ID, and Device Key in the following format:
// "HostName=<IoT Hub hostname>;DeviceId=<device id>;SharedAccessKey=<device key>"
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';
const logRed = '\x1b[31m%s\x1b[0m';

// Make sure we have a connection string before we can continue
if (!deviceConnectionString) {
  console.error(logRed, 'Missing device connection string');
  process.exit(1);
}

async function main() {
  // Client.fromConnectionString() requires a transport constructor coming from
  // one of the device transport packages.
  const client = Client.fromConnectionString(deviceConnectionString, Protocol);

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