// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var fs = require('fs');
var Transport = require('azure-iot-provisioning-device-http').Http;
var tss_js_1 = require("tss.js");
// Feel free to change the preceding using statement to anyone of the following if you would like to try another protocol.
// var Transport = require('azure-iot-provisioning-device-amqp').Amqp;
// var Transport = require('azure-iot-provisioning-device-amqp').AmqpWs;
// var Transport = require('azure-iot-provisioning-device-mqtt').Mqtt;
// var Transport = require('azure-iot-provisioning-device-mqtt').MqttWs;

var tpmSecurity = require('azure-iot-security-tpm');
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

var provisioningHost = 'global.azure-devices-provisioning.net';
var idScope = '0ne00002A29';

var transport = new Transport();
var securityClient = new tpmSecurity.TpmSecurityClient('', new tss_js_1.Tpm(true));
var deviceClient = ProvisioningDeviceClient.create(provisioningHost, idScope, transport, securityClient);

// Register the device.  Do not force a re-registration.
deviceClient.register(function(err, result) {
  if (err) {
    console.log("error registering device: " + err);
  } else {
    console.log('registration succeeded');
    console.log('assigned hub=' + result.registrationState.assignedHub);
    console.log('deviceId=' + result.registrationState.deviceId);
    process.exit(1);
  }
});

