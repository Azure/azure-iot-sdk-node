/* eslint-disable security/detect-non-literal-fs-filename */
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Choose a protocol by uncommenting one of these transports.
const Protocol = require('azure-iot-device-mqtt').Mqtt;
// const Protocol = require('azure-iot-device-amqp').Amqp;
// const Protocol = require('azure-iot-device-http').Http;
// const Protocol = require('azure-iot-device-mqtt').MqttWs;
// const Protocol = require('azure-iot-device-amqp').AmqpWs;

const ModuleClient = require('azure-iot-device').ModuleClient;

ModuleClient.fromEnvironment(Protocol, function (err, client) {
  if (err) {
    console.error("Could not create client: " + err.toString());
    process.exit(-1);
  } else {
    console.log('got client');

    client.on('error', function (err) {
      console.error(err.message);
    });

    // connect to the edge instance
    client.open(function (err) {
      if (err) {
        console.error('could not open IotHub client');
      }  else {
        console.log('client opened');

        // Create device Twin
        client.getTwin(function (err, twin) {
          if (err) {
            console.error('could not get twin');
          } else {
            console.log('twin created');

            console.log('twin contents:');
            console.log(twin.properties);

            twin.on('properties.desired', function (delta) {
                console.log('new desired properties received:');
                console.log(JSON.stringify(delta));
            });

            // create a patch to send to the hub
            const patch = {
              updateTime: new Date().toString(),
              firmwareVersion:'1.2.1',
              weather:{
                temperature: 72,
                humidity: 17
              }
            };

            // send the patch
            twin.properties.reported.update(patch, function (err) {
              if (err) throw err;
              console.log('twin state reported');
            });
          }
        });
      }
    });
  }
});
