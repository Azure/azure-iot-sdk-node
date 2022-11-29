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
        console.error('Could not connect: ' + err.message);
      } else {
        console.log('Client connected');

        client.onMethod('doSomethingInteresting', function (request, response) {
          console.log('doSomethingInteresting called');

          if(request.payload) {
            console.log('Payload:');
            console.dir(request.payload);
          }

          const responseBody = {
            message: 'doSomethingInteresting succeeded'
          };
          response.send(200, responseBody, function (err) {
            if (err) {
              console.log('failed sending method response: ' + err);
            } else {
              console.log('successfully sent method response');
            }
          });

        });
      }
    });
  }
});
