// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const iothub = require('azure-iothub');

const connectionString = process.env.IOTHUB_CONNECTION_STRING ?? '';
const deviceId = '{device id}';
const logRed = '\x1b[31m%s\x1b[0m';
const logYellow = '\x1b[33m%s\x1b[0m';

// check for iot hub connection string
if (connectionString === '' || connectionString === undefined) {
  console.log(logYellow, 'IoT Hub connection string not set');
  process.exit(0);
}

// check for iot hub connection string
if (deviceId == '{device id}') {
  console.log(logRed, 'DeviceId string not set');
  process.exit(0);
}

const registry = iothub.Registry.fromConnectionString(connectionString);

registry.getTwin(deviceId, function (err, twin) {
  if (err) {
    console.error(logRed, `Error during get twin (${err.constructor.name}): ${err.message}`);
    process.exit(0);
  } else {

    // reported properties
    console.log(logYellow, 'Reported properties...')
    console.log(" version: " + twin.properties.reported.$version);
    console.log(" last updated: " + twin.properties.reported.$metadata.$lastUpdated);
    console.log(" firmware version: " + twin.properties.reported.firmwareVersion);
    console.log(" temperature: " + twin.properties.reported.weather.temperature);
    console.log(" humidity: " + twin.properties.reported.weather.humidity);   
  }
});
