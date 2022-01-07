// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client, DeviceMethodRequest, DeviceMethodResponse, Twin } from 'azure-iot-device';

const deviceConnectionString: string = process.env.IOTHUB_DEVICE_CONNECTION_STRING ?? '';
const logRed = '\x1b[31m%s\x1b[0m';

// make sure we have a connection string before we can continue
if (deviceConnectionString === '' || deviceConnectionString === undefined) {
  console.log(logRed, 'Device connection string has not been set');
  process.exit(0);
}

const client: Client = Client.fromConnectionString(deviceConnectionString, Protocol);

client.open(function(err: any): void {
  if (!err) {
    client.onDeviceMethod('reboot', function onReboot(request: DeviceMethodRequest, response: DeviceMethodResponse): void {
      response.send(200, 'Reboot started', function(errors: any): void {
        if (errors) {
          console.error(logRed, 'An error occured when sending a method response:\n' + errors.toString());
        } else {
          console.log('Response to method \'' + request.methodName + '\' sent successfully.');
        }
      });

      // Get device Twin
      client.getTwin(function(error: any, twin: any): void {
        if (error) {
          console.error(logRed, 'Could not get twin');
        } else {
          console.log('Twin acquired');

          // Update the reported properties for this device through the
          // twin. This enables the back end app to query for all device that
          // have completed a reboot based on the lastReboot property.
          twin.properties.reported.update({
            iothubDM : {
              reboot : {
                startedRebootTime : new Date().toISOString(),
              }
            }
          }, function(er: Error): void {
            if (er) {
              console.error('Error updating twin');
            } else {
              console.log('Device reboot twin state reported');
            }
          });
        }
      });

      // Add your device's reboot API for physical restart.
      console.log('Rebooting!');
    });
    console.log('Client connected to IoT Hub.  Waiting for reboot device method.');
  } else {
    console.error(err);
  }
});
