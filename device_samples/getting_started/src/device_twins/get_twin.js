// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Choose a protocol by uncommenting one of these transports.
var Protocol = require('azure-iot-device-mqtt').Mqtt;
// var Protocol = require('azure-iot-device-amqp').Amqp;
// var Protocol = require('azure-iot-device-http').Http;
// var Protocol = require('azure-iot-device-mqtt').MqttWs;
// var Protocol = require('azure-iot-device-amqp').AmqpWs;

const Client = require('azure-iot-device').Client;
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';

// make sure we have a connection string before we can continue
if (deviceConnectionString === '' || deviceConnectionString === undefined) {
    console.error('\x1b[31m%s\x1b[0m', 'Missing device connection string');
    process.exit(0);
  }

// create the IoTHub client
const client = Client.fromConnectionString(deviceConnectionString, Protocol);
console.log('Client created.');

// connect to the hub
client.open(function(err) {
  if (err) {
    console.error('\x1b[31m%s\x1b[0m', `Error opening client: ${err.message}`);
  }  else {
    console.log('Client opened.');

    // Create device Twin
    client.getTwin(function(err, twin) {
      if (err) {
        console.error(`Error getting twin: ${err.message}`);
      } else {
        console.log('Twin created.');   
        console.log('Getting twin properties...');
        console.log(JSON.stringify(twin.properties)); 
           
        process.exit(0);
      }
    });
  }
});
