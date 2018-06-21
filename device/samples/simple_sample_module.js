// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Protocol = require('azure-iot-device-mqtt').Mqtt;
var ModuleClient = require('azure-iot-device').ModuleClient;
var Message = require('azure-iot-device').Message;
var fs = require('fs');
var connectionString = process.env.EdgeHubConnectionString;

var client = ModuleClient.fromConnectionString(connectionString, Protocol);
console.log('got client');

client.on('error', function (err) {
  console.error(err.message);
});

client.setOptions({
  ca: fs.readFileSync(process.env.EdgeModuleCACertificateFile).toString('ascii')
}, function(err) {
  if (err) {
    console.log('error:' + err);
  } else {
    // connect to the edge instance
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

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}