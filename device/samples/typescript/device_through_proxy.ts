// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// !IMPORTANT! This sample only pertains to HTTPS Proxy, via the HTTP Transport, MQTTWS Transport, and AMQPWS Transport.

// Uncomment one of these transports and then change it in fromConnectionString to test other transports
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
import { Client, Message } from 'azure-iot-device';

// Using HTTPS Proxy Agent
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as url from 'url';

// String containing Hostname, Device Id & Device Key in the following formats:
// "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString: string =
  process.env.DEVICE_CONNECTION_STRING || '';
let sendInterval: NodeJS.Timeout;

// Create Proxy Agent
// TODO: You need to change this to match the endpoint of your proxy server.
const proxy = 'http://localhost:8888/';
const options = url.parse(proxy);
const agent = new HttpsProxyAgent(options);

// fromConnectionString must specify a transport constructor, coming from any transport package.
const client = Client.fromConnectionString(deviceConnectionString, Protocol);
// MQTTWS (MQTT over Websocket)
client.setOptions({ mqtt: { webSocketAgent: agent } });

// AMQPWS (AMQP over Websocket)
// client.setOptions({amqp: {agent: agent}});
// HTTP
// client.setOptions({http: {webSocketAgent: agent}});

client.on('connect', connectCallback);
client.on('error', errorCallback);
client.on('disconnect', disconnectHandler);
client.on('message', messageHandler);

client.open().catch((err: Error) => {
  console.error('Could not connect: ' + err.message);
});

function disconnectHandler(): void {
  clearInterval(sendInterval);

  client.removeAllListeners();
  client.open().catch((err) => {
    console.error(err.message);
  });
}

// The AMQP and HTTP transports have the notion of completing, rejecting or abandoning the message.
// For example, this is only functional in AMQP and HTTP:
// client.complete(msg, printResultFor('completed'));
// If using MQTT calls to complete, reject, or abandon are no-ops.
// When completing a message, the service that sent the C2D message is notified that the message has been processed.
// When rejecting a message, the service that sent the C2D message is notified that the message won't be processed by the device. the method to use is client.reject(msg, callback).
// When abandoning the message, IoT Hub will immediately try to resend it. The method to use is client.abandon(msg, callback).
// MQTT is simpler: it accepts the message by default, and doesn't support rejecting or abandoning a message.
function messageHandler(msg: Message): void {
  console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
  client.complete(msg, printResultFor('completed'));
}

function generateMessage(): Message {
  const windSpeed = 10 + Math.random() * 4; // range: [10, 14]
  const temperature = 20 + Math.random() * 10; // range: [20, 30]
  const humidity = 60 + Math.random() * 20; // range: [60, 80]
  const data = JSON.stringify({
    deviceId: 'myFirstDevice',
    windSpeed: windSpeed,
    temperature: temperature,
    humidity: humidity,
  });
  const message = new Message(data);
  message.properties.add(
    'temperatureAlert',
    temperature > 28 ? 'true' : 'false'
  );
  return message;
}

function errorCallback(err: Error): void {
  console.error(err.message);
}

function connectCallback(): void {
  console.log('Client connected');
  // Create a message and send it to the IoT Hub every two seconds
  sendInterval = setInterval(() => {
    const message = generateMessage();
    console.log('Sending message: ' + message.getData());
    client.sendEvent(message, printResultFor('send'));
  }, 2000);
}

// Helper function to print results in the console
function printResultFor(op: any): (err: Error, res: any) => void {
  return function printResult(err: Error, res: any): void {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}
