// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;
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

// connect to the edge instance
client.open(function(err) {
  if (err) {
    console.error('could not open IotHub client');
  }  else {
    console.log('client opened');

    // Create device Twin
    client.getTwin(function(err, twin) {
      if (err) {
        console.error('could not get twin');
      } else {
        console.log('twin created');

        console.log('twin contents:');
        console.log(twin.properties);

        twin.on('properties.desired', function(delta) {
            console.log('new desired properties received:');
            console.log(JSON.stringify(delta));
        });

        // create a patch to send to the hub
        var patch = {
          updateTime: new Date().toString(),
          firmwareVersion:'1.2.1',
          weather:{
            temperature: 72,
            humidity: 17
          }
        };

         // send the patch
        twin.properties.reported.update(patch, function(err) {
          if (err) throw err;
          console.log('twin state reported');
        });
      }
    });
  }
});
