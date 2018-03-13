// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
var SharedAccessKeyAuthenticationProvider = require('azure-iot-device').SharedAccessKeyAuthenticationProvider;
var fs = require('fs');

var connectionString = process.env.EdgeHubConnectionString;

var authProvider = SharedAccessKeyAuthenticationProvider.fromConnectionString(connectionString);
authProvider.getDeviceCredentials(function(err, credentials) {
  if (err) {
    throw new Error('unexpected: getDeviceCredentials failure');
  } else {
    credentials.ca = fs.readFileSync(process.env.EdgeModuleCACertificateFile).toString('ascii');
  }
});
var client = Client.fromAuthenticationProvider(authProvider, Protocol);

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
  }
});

// Create a message and send it every two seconds
setInterval(function () {
  var temperature = 20 + (Math.random() * 10); // range: [20, 30]
  var temperatureAlert = (temperature > 28) ? 'true' : 'false';
  var data = JSON.stringify({ deviceId: 'myFirstDevice', temperature: temperature, temperatureAlert: temperatureAlert });
  var message = new Message(data);
  console.log('XXX Sending message: ' + message.getData());
  client.sendOutputEvent('temperature', message, printResultFor('sendOutputEvent'));
}, 2000);

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}
