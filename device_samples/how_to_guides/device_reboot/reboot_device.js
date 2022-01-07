// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

// Choose a protocol by uncommenting one of these transports.
const Protocol = require('azure-iot-device-mqtt').Mqtt;
// var Protocol = require('azure-iot-device-amqp').Amqp;
// var Protocol = require('azure-iot-device-http').Http;
// var Protocol = require('azure-iot-device-mqtt').MqttWs;
// var Protocol = require('azure-iot-device-amqp').AmqpWs;

const Client = require('azure-iot-device').Client;

const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING ?? '';
const logRed = '\x1b[31m%s\x1b[0m';

// make sure we have a connection string before we can continue
if (deviceConnectionString === '' || deviceConnectionString === undefined) {
    console.error(logRed, 'Missing device connection string');
    process.exit(0);
  }

const client = Client.fromConnectionString(deviceConnectionString, Protocol);

client.open(function(err) {
  if (!err) {
    client.onDeviceMethod('reboot', function onReboot(request, response) {
      response.send(200, 'Reboot started', function(err) {
        if (err) {
          console.error(logReg, 'An error occured when sending a method response:\n' + err.toString());
        } else {
          console.log('Response to method \'' + request.methodName + '\' sent successfully.');
        }
      });

      // Get device Twin
      client.getTwin(function(err, twin) {
        if (err) {
          console.error(logred, 'Could not get twin');
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
          }, function(err) {
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
