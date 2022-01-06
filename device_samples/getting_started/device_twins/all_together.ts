// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client } from 'azure-iot-device';

const deviceConnectionString: string = process.env.IOTHUB_DEVICE_CONNECTION_STRING ?? '';
const logRed: string = '\x1b[31m%s\x1b[0m';
const logYellow: string = '\x1b[33m%s\x1b[0m';

// make sure we have a connection string before we can continue
if (deviceConnectionString === '' || deviceConnectionString === undefined) {
    console.error(logRed, 'Missing device connection string');
    process.exit(0);
}

// create the IoTHub client
const client: Client = Client.fromConnectionString(deviceConnectionString, Protocol);
console.log('Client created.');

// connect to the hub
client.open(function(err) {
  if (err) {
    console.error(logRed, `Error opening client: ${err.message}`);
  }  else {
    console.log('Client opened.');

    // Create device Twin
    client.getTwin(function (error: any, twin: any) {
      if (err) {
        console.error(logYellow, `Error getting twin: ${error.message}`);
      } else {
        console.log('Twin created.');
        console.log('Getting twin properties...');
        console.log(JSON.stringify(twin.properties));

        // Usage example: Receiving all patches with a single event handler. Output
        //                any properties that are received from the service.
        twin.on('properties.desired', function (delta: any) {
          console.log(logYellow, 'New desired properties received:');
          console.log(`  ${JSON.stringify(delta)}`);
        });

        // Usage example #2: receiving an event if anything under properties.desired.climate changes
        twin.on('properties.desired.climate', function (delta: any) {
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
            console.log(logYellow,'New desired properties received for "properties.desired.climate":');
            if (twin.properties.desired.climate) console.log('  min temp=' + twin.properties.desired.climate.minTemperature);
            if (twin.properties.desired.climate) console.log('  max temp=' + twin.properties.desired.climate.maxTemperature);
          }

          // Usage example: Receiving an event for a single (scalar) property value. This
          //                event is only fired if the fanOn boolean value is part of the patch.
          twin.on('properties.desired.climate.hvac.systemControl', function (data: any) {
              console.log(logYellow, 'New desired properties received for "properties.desired.climate.hvac.sytemControl":');
              console.log(`  fan=${data.fanOn}`);
            }
          );

          const moduleList: any = [];

          // Then we use this internal list and compare it to the delta to know
          // if anything was added, removed, or updated.
          twin.on('properties.desired.modules', function (data: any) {
            console.log(logYellow, 'New desired properties received for "properties.desired.modules":');
            Object.keys(data).forEach(function (key: string) {
              if (data[key] === null && moduleList[key]) {
                // If our patch contains a null value, but we have a record of
                // this module, then this is a delete operation.
                console.log('  Deleting module ' + key);
                delete moduleList[key];
              } else if (data[key]) {
                if (moduleList[key]) {
                  // Our patch contains a module, and we've seen this before.
                  // Must be an update operation.
                  console.log('  Updating module ' + key + ': ' + JSON.stringify(data[key]));
                  // Store the complete object instead of just the delta
                  moduleList[key] = twin.properties.desired.modules[key];
                } else {
                  // Our patch contains a module, but we've never seen this
                  // before.  Must be an add operation.
                  console.log('  Adding module ' + key + ': ' + JSON.stringify(data[key]));
                  // Store the complete object instead of just the delta
                  moduleList[key] = twin.properties.desired.modules[key];
                }
              }
            });
            console.log();
          });

          // create a patch to send to the hub
          const patch: { firmwareVersion: string, weather: { temperature: number, humidity: number } } = {
            firmwareVersion: '1.2.1',
            weather: { temperature: 72, humidity: 17 }
          };

          // send the patch to update reported properties
          twin.properties.reported.update(patch, function(errMsg: Error) {
            if (errMsg) {
              console.log(logRed, `Error updating reported properties: ${errMsg.message}`);
            }
            else {
              console.log('Twin state reported successfully.');
            }
          });
        });
      }
    });
  }
});
