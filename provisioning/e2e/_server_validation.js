// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;
var httpModule = require('azure-iot-provisioning-device-http');
var amqpModule = require('azure-iot-provisioning-device-amqp');
var mqttModule = require('azure-iot-provisioning-device-mqtt');

var dpsDeviceClientEndpoint = process.env.DPS_GLOBAL_DEVICE_ENDPOINT_INVALID_CERT;

var correctDisconnectMessage = function(err, done) {
  if (err) {
    if (err.amqpError && (err.amqpError.name === 'NotConnectedError')) {
      done();
    } else if (err.name && (err.name  === 'NotConnectedError')) {
      done();
    } else if (err.code && (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
      done();
    } else {
      done(new Error('client did NOT detect bad cert.'));
    }
  } else {
    done(new Error('client did NOT detect bad cert.'));
  }
};

describe('Invalid Certificate Validation', function() {
  var enrollment1 = {
    registrationId: 'first',
    attestation: {
      type: 'tpm',
      tpm: {
        endorsementKey: 'a'
      }
    }
  };
  it('Should fail to create enrollment', function(done) {
    var dpsServiceClient = provisioningServiceClient.fromConnectionString(process.env.DPS_CONN_STRING_INVALID_CERT);
    dpsServiceClient.createOrUpdateIndividualEnrollment(enrollment1, function(err) {
      correctDisconnectMessage(err, done);
    });
  });
});

describe('DPS registration client', function() {
  var deviceCert = {
    cert: new Buffer(process.env.IOTHUB_CA_ROOT_CERT, 'base64').toString('ascii'),
    key: new Buffer(process.env.IOTHUB_CA_ROOT_CERT_KEY, 'base64').toString('ascii')
  };
  [
    httpModule.Http,
    amqpModule.Amqp,
    amqpModule.AmqpWs,
    mqttModule.Mqtt,
    mqttModule.MqttWs
  ].forEach(function (DeviceTransport) {
    describe('Over ' + DeviceTransport.name, function () {
      var X509Security = require('azure-iot-security-x509').X509Security;
      var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;
      it('Should fail to register a device', function(done) {
        this.timeout(30000);
        var transport = new DeviceTransport();
        var securityClient = new X509Security('abcd', deviceCert);
        var deviceClient = ProvisioningDeviceClient.create(dpsDeviceClientEndpoint, 'scope', transport, securityClient);
        deviceClient.register(function(err) {
          correctDisconnectMessage(err, done);
        });
      });
    });
  });
});