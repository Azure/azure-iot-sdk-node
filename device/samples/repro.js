// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-amqp').Amqp;
var url = require('url');
var async = require('async');

// receive the IoT Hub device connection string as a command line parameter

var connectionString = "HostName=yosephhub.azure-devices.net;DeviceId=theta;SharedAccessKey=HS9Git0thidi4rl/5uIpCL++XnrvAQO7jUhK9AyoSdU=";
var client = Client.fromConnectionString(connectionString, Protocol);

client.open(function(err) {
  if (err) {
    console.error("Could not create client: " + err.toString());
    process.exit(-1);
  } else {
    console.log('got client');

    client.on('error', function (err) {
      console.error(err.message);
    });

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
	            invalidArray: [ 'a', 'b' ],
              weather:{
                temperature: 73,
                humidity: 17
              }
            };

            // send the patch
            console.log(patch);
            twin.properties.reported.update(patch, function(err, messageJSON) {
              if (err) throw err;
              console.log(messageJSON);
              console.log('twin state reported');
            });
          }
        });
      }
    });
  }
});


