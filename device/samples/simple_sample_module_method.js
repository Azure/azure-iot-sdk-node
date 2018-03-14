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
console.log('got client');

client.on('error', function (err) {
  console.error(err.message);
});

// connect to the edge instance
client.open(function (err) {
  if (err) {
    console.error('Could not connect: ' + err.message);
  } else {
    console.log('Client connected');

    client.onDeviceMethod('doSomethingInteresting', function(request, response) {
      console.log('doSomethingInteresting called');

      if(request.payload) {
        console.log('Payload:');
        console.dir(request.payload);
      }

      var responseBody = {
        message: 'doSomethingInteresting succeeded'
      };
      response.send(200, responseBody, function(err) {
        if (err) {
          console.log('failed sending method response: ' + err);
        } else {
          console.log('successfully sent method response');
        }
      });

    });
  }
});