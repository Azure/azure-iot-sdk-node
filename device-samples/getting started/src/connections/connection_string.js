// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Choose a protocol by uncommenting one of these transports.
const Protocol = require('azure-iot-device-mqtt').Mqtt;
// const Protocol = require('azure-iot-device-amqp').Amqp;
// const Protocol = require('azure-iot-device-http').Http;
// const Protocol = require('azure-iot-device-mqtt').MqttWs;
// const Protocol = require('azure-iot-device-amqp').AmqpWs;

const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;

// make sure we have a connection string before we can continue
if (deviceConnectionString === '' || deviceConnectionString === undefined) {
  console.error('\x1b[31m%s\x1b[0m', 'Missing device connection string');
  process.exit(0);
}

function generateMessage() {
  const data = JSON.stringify({
    deviceId: 'my-first-device',
    temperature: 20 + Math.random() * 10,
  });
  
  return new Message(data);
}

// fromConnectionString must specify a transport constructor, coming from any transport package.
const client = Client.fromConnectionString(deviceConnectionString, Protocol);
const message = generateMessage();

// open client connection
client.open().catch((err) => {
  console.error('\x1b[31m%s\x1b[0m', 'Could not connect: ' + err.message);
  process.exit(0);
});
console.log('Client connection: Open');

// send a messge
console.log('Sending message: ' + message.getData());
client.sendEvent(message, printResultFor('Send'));

client.removeAllListeners();

// close client connection
client.close().catch((err) => {
  console.error('\x1b[31m%s\x1b[0m', 'Could not close connection: ' + err.message);
});
console.log("Client connection: Closed");

// exit process
process.exit(0);

// helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log('\x1b[31m%s\x1b[0m', op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}
