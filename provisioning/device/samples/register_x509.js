// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var fs = require('fs');
var Http = require('azure-iot-provisioning-device-http').Http;
var X509Security = require('azure-iot-security-x509').X509Security;
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

var idScope = '[id scope]';
var registrationId = '[registration id]';
var deviceCert = {
  cert: fs.readFileSync('[cert filename]').toString(),
  key: fs.readFileSync('[key filename]').toString()
};

var transport = new Http(idScope);
var securityClient = new X509Security(deviceCert);
var deviceClient = ProvisioningDeviceClient.create(transport, securityClient);

// Register the device.  Do not force a re-registration.
deviceClient.register(registrationId, false, function(err, result) {
  if (err) {
    console.log("error registering device: " + JSON.stringify(err));
  } else {
    console.log('registration succeeded');
    console.log('assigned hub=' + result.assignedHub);
    console.log('deviceId=' + result.deviceId);
  }
});

