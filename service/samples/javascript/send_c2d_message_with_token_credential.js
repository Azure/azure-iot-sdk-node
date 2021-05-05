// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const { DefaultAzureCredential } = require("@azure/identity");
var Client = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;

var hostName = process.env.AZURE_AAD_HOST;

// DefaultAzureCredential expects the following three environment variables:
// - AZURE_TENANT_ID: The tenant ID in Azure Active Directory
// - AZURE_CLIENT_ID: The application (client) ID registered in the AAD tenant
// - AZURE_CLIENT_SECRET: The client secret for the registered application
const credential = new DefaultAzureCredential();
var client = Client.fromTokenCredential(hostName, credential);

var targetDevice = process.env.IOTHUB_DEVICE_ID;

client.open(function (err) {
  if (err) {
    console.error('Could not connect: ' + err.message);
  } else {
    console.log('Client connected');

    // Create a message and send it to the IoT Hub every second
    setInterval(function () {
      var data = JSON.stringify({ text : 'foo' });
      var message = new Message(data);
      console.log('Sending message: ' + message.getData());
      client.send(targetDevice, message, printResultFor('send'));
    }, 2000);
  }
});

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) {
      console.log(op + ' error: ' + err.toString());
    } else {
      console.log(op + ' status: ' + res.constructor.name);
    }
  };
}
