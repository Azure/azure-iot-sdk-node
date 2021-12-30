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
client.open(function (err) {
  if (err) {
    console.error('\x1b[31m%s\x1b[0m', `Error opening client: ${err.message}`);
  } else {
    console.log('Client opened.');

    // Create device Twin
    client.getTwin(function (err, twin) {
      if (err) {
        console.error(`Error getting twin: ${err.message}`);
      } else {
        console.log('Twin created.');
        console.log();

        // Usage example: Receiving all patches with a single event handler. Output
        //                any properties that are received from the service.
        twin.on('properties.desired', function (delta) {
          console.log('\x1b[33m%s\x1b[0m', 'New desired properties received:');
          console.log(`  ${JSON.stringify(delta)}`);      
        });

        // Usage example #2: receiving an event if anything under properties.desired.climate changes
        twin.on('properties.desired.climate', function (delta) {
          //
          // Notice that twin.properties.desired has already been updated before
          // this function was called.
          //
          // If the delta contains a minTemp or a maxTemp, then update the
          // hardware with the values stored in the twin.  The twin has all the
          // same values as the delta, but the delta only has values that
          // have changed.  When we need the "current values", we don't use the
          // values stored in the delta because it's possible that the delta has
          // one or the other, but not both.
          //
          if (delta.minTemperature || delta.maxTemperature) {
            console.log('\x1b[33m%s\x1b[0m','New desired properties received for "properties.desired.climate":');
            if (twin.properties.desired.climate) console.log('  min temp=' + twin.properties.desired.climate.minTemperature);
            if (twin.properties.desired.climate) console.log('  max temp=' + twin.properties.desired.climate.maxTemperature);           
          }

          // Usage example: Receiving an event for a single (scalar) property value. This
          //                event is only fired if the fanOn boolean value is part of the patch.
          twin.on('properties.desired.climate.hvac.systemControl', function (delta) {
              console.log('\x1b[33m%s\x1b[0m', 'New desired properties received for "properties.desired.climate.hvac.sytemControl":');
              console.log(`  fan=${delta.fanOn}`);
            }
          );

          var moduleList = {};

          // Then we use this internal list and compare it to the delta to know
          // if anything was added, removed, or updated.
          twin.on('properties.desired.modules', function (delta) {
            console.log('\x1b[33m%s\x1b[0m', 'New desired properties received for "properties.desired.modules":');
            Object.keys(delta).forEach(function (key) {
              if (delta[key] === null && moduleList[key]) {
                // If our patch contains a null value, but we have a record of
                // this module, then this is a delete operation.
                console.log('  Deleting module ' + key);             
                delete moduleList[key];
              } else if (delta[key]) {
                if (moduleList[key]) {
                  // Our patch contains a module, and we've seen this before.
                  // Must be an update operation.
                  console.log('  Updating module ' + key + ': ' + JSON.stringify(delta[key]));                
                  // Store the complete object instead of just the delta
                  moduleList[key] = twin.properties.desired.modules[key];
                } else {
                  // Our patch contains a module, but we've never seen this
                  // before.  Must be an add operation.
                  console.log('  Adding module ' + key + ': ' + JSON.stringify(delta[key]));               
                  // Store the complete object instead of just the delta
                  moduleList[key] = twin.properties.desired.modules[key];
                }
              }
            });
            console.log();
          });
        });
      }
    });
  }
});
