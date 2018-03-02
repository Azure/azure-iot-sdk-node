// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;

// String containing Hostname, Device Id, ModuleId, & Shared Access Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;ModuleId=<module_id?;SharedAccessKey=<device_key>;GatewayHostName=<edge_ip>"
var connectionString = '[IoT module connection string]';

// create the IoTHub client
var client = Client.fromConnectionString(connectionString, Protocol);
console.log('got client');

// connect to the edge instance
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

        twin.on('properties.desired', function(delta) {
            console.log('new desired properties received:');
            console.log(JSON.stringify(delta));
        });

        // create a patch to send to the hub
        var patch = {
          firmwareVersion:'1.2.1',
          weather:{
            temperature: 72,
            humidity: 17
          }
        };

         // send the patch
        twin.properties.reported.update(patch, function(err) {
          if (err) throw err;
          console.log('twin state reported');
        });
      }
    });
  }
});
