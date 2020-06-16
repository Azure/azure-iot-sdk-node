// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Protocol = require('azure-iot-device-mqtt').Mqtt;
// Uncomment one of these transports and then change it in fromConnectionString to test other transports
// var Protocol = require('azure-iot-device-amqp').AmqpWs;
// var Protocol = require('azure-iot-device-http').Http;
// var Protocol = require('azure-iot-device-amqp').Amqp;
// var Protocol = require('azure-iot-device-mqtt').MqttWs;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
var deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;

async function disconnectHandler () {
  clearInterval(sendInterval);
  client.removeAllListeners();
  try {
    await client.open();
  } catch (err) {
    console.error(err.message);
  }
}

// The AMQP and HTTP transports have the notion of completing, rejecting or abandoning the message.
// For example, this is only functional in AMQP and HTTP:
// client.complete(msg, printResultFor('completed'));
// If using MQTT calls to complete, reject, or abandon are no-ops.
// When completing a message, the service that sent the C2D message is notified that the message has been processed.
// When rejecting a message, the service that sent the C2D message is notified that the message won't be processed by the device. the method to use is client.reject(msg, callback).
// When abandoning the message, IoT Hub will immediately try to resend it. The method to use is client.abandon(msg, callback).
// MQTT is simpler: it accepts the message by default, and doesn't support rejecting or abandoning a message.
function messageHandler (msg) {
  console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
  client.complete(msg, printResultFor('completed'));
}

function generateMessage () {
  var windSpeed = 10 + (Math.random() * 4); // range: [10, 14]
  var temperature = 20 + (Math.random() * 10); // range: [20, 30]
  var humidity = 60 + (Math.random() * 20); // range: [60, 80]
  var data = JSON.stringify({ deviceId: 'myFirstDevice', windSpeed: windSpeed, temperature: temperature, humidity: humidity });
  var message = new Message(data);
  message.properties.add('temperatureAlert', (temperature > 28) ? 'true' : 'false');
  return message;
}

function connectCallback () {
  console.log('Client connected');
  // Create a message and send it to the IoT Hub every two seconds
  var sendInterval = setInterval(function () {
    const message = generateMessage();
    console.log('Sending message: ' + message.getData());
    client.sendEvent(message, printResultFor('send'));
  }, 2000);
};

// fromConnectionString must specify a transport constructor, coming from any transport package.
var client = Client.fromConnectionString(deviceConnectionString, Protocol);

client.on('connect', connectCallback);
client.on('error', (err) => console.error(err.message));
client.on('disconnect', disconnectHandler);
client.on('message', messageHandler);

client.open()
.catch(err => {
  console.error('Could not connect: ' + err.message);
});

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}