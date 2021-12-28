// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client } from 'azure-iot-device';

let client: Client;

function main(): void {
  // open a connection to the device
  const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';

  if (deviceConnectionString === '') {
    console.log('\x1b[31m%s\x1b[0m', 'Device connection string has not been set');
    process.exit(0);
  }

  client = Client.fromConnectionString(deviceConnectionString, Protocol);
  client.open(onConnect);
}

function onConnect(err: any) {
  if(!!err) {
      console.error('\x1b[31m%s\x1b[0m', 'Could not connect: ' + err.message);
  } else {
      console.log('Connected to device. Registering message handler.');
      client.on('message', handleMessage);
      console.log('Ready to recieve messages...');
  }
}

function handleMessage(msg: any) {
  console.log('\x1b[33m%s\x1b[0m', `\nReceived C2D message:`);
  console.log(` message: ${msg.data.toString().trim()}`);
  console.log(` properties: ${JSON.stringify(msg.properties.propertyList)}`);
}

// get the app rolling
main();
