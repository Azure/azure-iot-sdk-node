/* eslint-disable security/detect-non-literal-fs-filename */
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client, DeviceMethodRequest, DeviceMethodResponse, Twin } from 'azure-iot-device';

const deviceConnectionString: string = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';

if (deviceConnectionString === '') {
  console.log('device connection string has not been set');
  process.exit(-1);
}

const client: Client = Client.fromConnectionString(deviceConnectionString, Protocol);

client.open(function (err?: Error): void {
  if (!err) {
    client.onDeviceMethod('reboot', function onReboot(request: DeviceMethodRequest, response: DeviceMethodResponse): void {
      response.send(200, 'Reboot started', function (err?: Error): void {
        if (err) {
          console.error('An error occurred when sending a method response:\n' + err.toString());
        } else {
          console.log('Response to method \'' + request.methodName + '\' sent successfully.');
        }
      });

      // Get device Twin
      client.getTwin(function (err?: Error, twin?: Twin): void {
        if (err || !twin) {
          console.error('could not get twin');
        } else {
          console.log('twin acquired');

          // Update the reported properties for this device through the
          // twin.  This enables the back end app to query for all device that
          // have completed a reboot based on the lastReboot property.
          twin.properties.reported.update({
            iothubDM : {
              reboot : {
                startedRebootTime : new Date().toISOString(),
              }
            }
          }, function (err?: Error): void {
            if (err) {
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
