// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Choose a protocol by uncommenting one of these transports.
var Protocol = require('azure-iot-device-mqtt').Mqtt;
// const Protocol = require('azure-iot-device-amqp').AmqpWs;
// const Protocol = require('azure-iot-device-http').Http;
// const Protocol = require('azure-iot-device-amqp').Amqp;
// const Protocol = require('azure-iot-device-mqtt').MqttWs;

var ModuleClient = require('azure-iot-device').ModuleClient;
var Message = require('azure-iot-device').Message;

ModuleClient.fromEnvironment(Protocol, function (err, client) {
  if (err) {
    console.error("Could not create client: " + err.toString());
    process.exit(-1);
  } else {
    console.log('got client');

    client.on('error', function (err) {
      console.error(err.message);
    });

    client.open(function (err) {
      if (err) {
        console.error('Could not connect: ' + err.message);
      } else {
        console.log('Client connected');

        // Act on input messages to the module.
        client.on('inputMessage', function (inputName, msg) {
          client.complete(msg, printResultFor('completed'));

          if (inputName === 'deviceControl') {
            var messageBody = JSON.parse(msg.getBytes.toString('ascii'));
            console.log('deviceControl message received: enable = ' + messageBody.enabled);
          } else {
            console.log('unknown inputMessage received on input ' + inputName);
            console.log(msg.getBytes.toString('ascii'));
          }
        });

        // Create a message and send it every two seconds
        setInterval(function () {
          var temperature = 20 + (Math.random() * 10); // range: [20, 30]
          var temperatureAlert = (temperature > 28) ? 'true' : 'false';
          var data = JSON.stringify({ deviceId: 'myFirstDevice', temperature: temperature, temperatureAlert: temperatureAlert });
          var message = new Message(data);
          console.log('Sending message: ' + message.getData());
          client.sendOutputEvent('temperature', message, printResultFor('sendOutputEvent'));
        }, 2000);
      }
    });
  }
});


// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}