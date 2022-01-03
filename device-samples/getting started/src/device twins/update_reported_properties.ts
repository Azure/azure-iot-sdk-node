// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client, Twin } from 'azure-iot-device';

const deviceConnectionString: string = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';

// make sure we have a connection string before we can continue
if (deviceConnectionString === '' || deviceConnectionString === undefined) {
    console.error('\x1b[31m%s\x1b[0m', 'Missing device connection string');
    process.exit(0);
}

// create the IoTHub client
const client: Client = Client.fromConnectionString(deviceConnectionString, Protocol);
console.log('Client created.');

// connect to the hub
client.open(function (err: any) {
  if (err) {
    console.error('\x1b[31m%s\x1b[0m', `Error opening client: ${err.message}`);
  } else {
    console.log('Client opened.');

    // create device Twin
    client.getTwin(function (err: any, twin: any) {
      if (err) {
        console.error('\x1b[31m%s\x1b[0m', `Error getting twin: ${err.message}`);
      } else {
        console.log('Twin created.');
        console.log();

        // create a patch to send to the hub
        const patch: { firmwareVersion: string, weather: { temperature: number, humidity: number } } = {
          firmwareVersion: '1.2.1',
          weather: { temperature: 72, humidity: 17 }
        };

         // send the patch to update reported properties
        twin.properties.reported.update(patch, function(err: any) {
          if (err) {
            console.log('\x1b[31m%s\x1b[0m', `Error updating reported properties: ${err.message}`);
            process.exit(0);
          } 
          else { 
            console.log('Twin state reported successfully.');    
            process.exit(0);        
          }
        });
      }
    });
  }
});
