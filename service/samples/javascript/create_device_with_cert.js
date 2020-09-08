// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var iothub = require('azure-iothub');

var connectionString = process.env.IOTHUB_CONNECTION_STRING;
var registry = iothub.Registry.fromConnectionString(connectionString);
var device = {
  deviceId: process.env.IOTHUB_DEVICE_ID,
  status: 'enabled',
  authentication: {
    x509Thumbprint: {
      primaryThumbprint: process.env.IOTHUB_PRIMARY_THUMBPRINT,
      secondaryThumbprint: process.env.IOTHUB_SECONDARY_THUMBPRINT
    }
  }
};

registry.create(device, function (err) {
  if(err) {
    console.error('Could not create device: ' + err.message);
  } else {
    registry.get(device.deviceId, function(err, deviceInfo) {
      if(err) {
        console.error('Could not get device: ' + err.message);
      } else {
        console.log(JSON.stringify(deviceInfo));
      }
    });
  }
});
