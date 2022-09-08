// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
const fs = require('fs');

var iotHubTransport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

// var ProvisioningTransport = require('azure-iot-provisioning-device-http').Http;
// var ProvisioningTransport = require('azure-iot-provisioning-device-amqp').Amqp;
// var ProvisioningTransport = require('azure-iot-provisioning-device-amqp').AmqpWs;
var ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').Mqtt;
// var ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').MqttWs;
// Feel free to change the preceding using statement to anyone of the following if you would like to try another protocol.

var SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

//
// For the public clouds the address of the provisioning host would be: global.azure-devices-provisioning.net
//
var provisioningHost = process.env.PROVISIONING_HOST;
//
// You can find your idScope in the portal overview section for your dps instance.
//
var idScope = process.env.PROVISIONING_IDSCOPE;
//
// The registration id of the device to be registered.
//
var registrationId = process.env.PROVISIONING_REGISTRATION_ID;
//
// The symmetric key of the enrollment.
//
var symmetricKey = process.env.PROVISIONING_SYMMETRIC_KEY;
//
// The path to the certificate request file to be sent for Dps Cert Management.
//
var csrFile = process.env.PATH_TO_CSR_FILE;
//
// The rpath to the key file to be sent for Dps Cert Management.
//
var keyFile = process.env.PATH_TO_KEY_FILE;
// var passphrase = process.env.KEY_PASSPHRASE_OR_EMPTY; // Key Passphrase if one exists.

var csrData;
try {
  csrData = fs.readFileSync(csrFile, 'utf8');
} catch (err) {
  console.error(err);
}

var provisioningSecurityClient = new SymmetricKeySecurityClient(registrationId, symmetricKey);

var provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvisioningTransport(), provisioningSecurityClient);
// Register the device.
provisioningClient.setClientCertificateSigningRequest(csrData)
provisioningClient.register(function(err, result) {
  if (err) {
    console.log("error registering device: " + err);
  } else {
    console.log('registration succeeded');
    console.log('assigned hub=' + result.assignedHub);
    console.log('deviceId=' + result.deviceId);
    // connect to hub via the issued certificate
    var connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';x509=true';
    var hubClient = Client.fromConnectionString(connectionString, iotHubTransport);

    var options = {
      cert : result.issuedClientCertificate,
      key : fs.readFileSync(keyFile, 'utf-8').toString(),
      // passphrase: passphrase
    };
    hubClient.setOptions(options);

    hubClient.open(function(err) {
      if (err) {
        console.error('Could not connect: ' + err.message);
      } else {
        console.log('Client connected');
        var message = new Message('Hello world');
        hubClient.sendEvent(message, function(err, res) {
          if (err) console.log('send error: ' + err.toString());
          if (res) console.log('send status: ' + res.constructor.name);
          process.exit(1);
        });
      }
    });
  }
});
