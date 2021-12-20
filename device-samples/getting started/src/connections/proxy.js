// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Choose a protocol by uncommenting one of these transports.
// const Protocol = require('azure-iot-device-http').Http;
const Protocol = require('azure-iot-device-mqtt').MqttWs;
// const Protocol = require('azure-iot-device-amqp').AmqpWs;

const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const HttpsProxyAgent = require('https-proxy-agent');
const url = require('url');

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;

// make sure we have a connection string before we can continue
if (deviceConnectionString === null || deviceConnectionString === undefined) {
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

// Create a Proxy Agent
// TODO: You need to change this to match the endpoint of your proxy server.
const proxy = "http://localhost:8888/";
const options = url.parse(proxy);
const agent = new HttpsProxyAgent(options);

// fromConnectionString must specify a transport constructor, coming from any transport package.
const client = Client.fromConnectionString(deviceConnectionString, Protocol);

// MQTTWS (MQTT over Websocket)
client.setOptions({mqtt: {webSocketAgent: agent}});

// AMQPWS (AMQP over Websocket)
// client.setOptions({amqp: {agent: agent}});

// HTTP
// client.setOptions({http: {webSocketAgent: agent}});

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
