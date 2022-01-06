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
const fs = require('fs');

// String containing Hostname and Device Id in the following format:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;x509=true"
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING ?? ''; 
const certFile = process.env.PATH_TO_CERTIFICATE_FILE ?? '';
const keyFile = process.env.PATH_TO_KEY_FILE ?? '';
const passphrase = process.env.KEY_PASSPHRASE_OR_EMPTY ?? ''; // Key Passphrase if one exists.
const logRed = '\x1b[31m%s\x1b[0m';
const logYellow = '\x1b[33m%s\x1b[0m';

if (deviceConnectionString === '' || deviceConnectionString === undefined) {
  console.error(logRed, 'Missing device connection string');
  process.exit(0);
}

if (certFile === '' || certFile === undefined) {
  console.error(logRed, 'Missing certificate file');
  process.exit(0);
}

if (keyFile === '' || keyFile === undefined) {
  console.error(logRed, 'Missing key file');
  process.exit(0);
}

if (passphrase === '' || passphrase === undefined) {
  console.log(logYellow, 'Warning: pass phrase is empty');
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
const message = new Message(JSON.stringify({ deviceId: 'my-first-device', temperature: 20 + Math.random() * 10, }));

const options = {
  cert: fs.readFileSync(certFile, 'utf-8').toString(),
  key: fs.readFileSync(keyFile, 'utf-8').toString(),
  passphrase: passphrase,
};

// Calling setOptions with the x509 certificate and key (and optionally, passphrase) 
// will configure the client transport to use x509 when connecting to IoT Hub
client.setOptions(options);

// open client connection
client.open().catch((err) => {
  console.error(logRed, 'Could not connect: ' + err.message);
  process.exit(0);
});
console.log('Client connection: Open');

// send a messge
console.log('Sending message: ' + message.getData());
client.sendEvent(message, printResultFor('Send'));

// close client connection
client.close().catch((err) => {
  console.error(logRed, 'Could not close connection: ' + err.message);
});
console.log("Client connection: Closed");

// exit process
process.exit(0);

// helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(logRed, op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}
