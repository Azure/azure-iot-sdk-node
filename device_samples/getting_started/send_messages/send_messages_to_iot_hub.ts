// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client, Message } from 'azure-iot-device';

const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';
const logRed = '\x1b[31m%s\x1b[0m';

if (!deviceConnectionString) {
  console.error(logRed, 'Missing device connection string');
  process.exit(1);
}

function generateMessage(): Message {
  const windSpeed = 10 + Math.random() * 4; // range: [10, 14]
  const temperature = 20 + Math.random() * 10; // range: [20, 30]
  const humidity = 60 + Math.random() * 20; // range: [60, 80]
  const message = new Message(JSON.stringify({ windSpeed, temperature, humidity }));
  message.properties.add('temperatureAlert', temperature > 28 ? 'true' : 'false' );
  return message;
}

async function main() {
  const client = Client.fromConnectionString(deviceConnectionString, Protocol);
  await client.open();
  console.log('Client connection: Open');
  let disconnected = false;
  let error!: Error;

  client.once('error', err => error = err);
  client.once('disconnected', () => disconnected = true);

  while (!disconnected && !error) {
    const message = generateMessage();
    console.log(`Sending message: ${message.getData()}`);
    await client.sendEvent(message);
    console.log('Message sent');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (error) {
    throw error;
  }
  if (disconnected) {
    throw new Error('Client disconnected');
  }
}

main().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error(logRed, err);
  process.exit(1);
});