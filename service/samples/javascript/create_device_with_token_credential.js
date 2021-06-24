// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const { DefaultAzureCredential } = require("@azure/identity");
var iothub = require('azure-iothub');

var hostName = process.env.AZURE_AAD_HOST;

// DefaultAzureCredential expects the following three environment variables:
// - AZURE_TENANT_ID: The tenant ID in Azure Active Directory
// - AZURE_CLIENT_ID: The application (client) ID registered in the AAD tenant
// - AZURE_CLIENT_SECRET: The client secret for the registered application
const credential = new DefaultAzureCredential();
var registry = iothub.Registry.fromTokenCredential(hostName, credential);
var device = {
  deviceId: process.env.IOTHUB_DEVICE_ID,
  status: 'enabled'
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
