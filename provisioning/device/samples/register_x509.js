// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
var X509Security = require('azure-iot-security-x509').X509Security;
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

var fs = require('fs');
var argv = require('yargs')
  .usage('Usage: $0  --idscope <ID SCOPE> --registrationid <REGISTRATION ID> --certificate <COMMONNAME> --protocol <PROTOCOL>')
  .option('idscope', {
    alias: 'i',
    describe: 'The ID scope is assigned to a Device Provisioning Service',
    type: 'string',
    demandOption: true
  })
  .option('registrationid', {
    alias: 'r',
    describe: 'Used to uniquely identify a device in the Device Provisioning Servic',
    type: 'string',
    demandOption: true
  })
  .option('certificate', {
    alias: 'c',
    describe: 'Commonname of the certificate without extension. Expected filenames: commonName_cert.pem and commonName_key.pem ',
    type: 'string',
    demandOption: true
  })
  .option('protocol', {
    alias: 'p',
    describe: 'Transport protocol to be used.',
    type: 'string',
    choices: ['mqtt', 'mqttws', 'amqp', 'amqpws', 'http'],
    demandOption: false
  })
  .argv;

var idScope = argv.idscope;
var registrationId = argv.registrationid;
var protocol = argv.protocol;
var provisioningHost = 'global.azure-devices-provisioning.net';
var cert = argv.certificate + '_cert.pem'
var key = argv.certificate + '_key.pem'

switch (protocol) {
  case 'amqp':
    var Transport = require('azure-iot-provisioning-device-amqp').Amqp;
    break;
  case 'amqpws':
    var Transport = require('azure-iot-provisioning-device-amqp').AmqpWs;
    break;
  case 'mqtt':
    var Transport = require('azure-iot-provisioning-device-mqtt').Mqtt;
    break;
  case 'mqttws':
    var Transport = require('azure-iot-provisioning-device-mqtt').MqttWs;
    break;
  case 'http':
    var Transport = require('azure-iot-provisioning-device-http').Http;
    break;
  default:
    var Transport = require('azure-iot-provisioning-device-http').Http;
    protocol = 'http';
}

var deviceCert = {
  cert: fs.readFileSync(cert).toString(),
  key: fs.readFileSync(key).toString()
};

var transport = new Transport();
var securityClient = new X509Security(registrationId, deviceCert);
var deviceClient = ProvisioningDeviceClient.create(provisioningHost, idScope, transport, securityClient);

// Register the device.  Do not force a re-registration.
deviceClient.register(function (err, result) {
  if (err) {
    console.log("error registering device: " + err);
  } else {
    console.log('registration succeeded');
    console.log('assigned hub=' + result.assignedHub);
    console.log('deviceId=' + result.deviceId);
  }
});
