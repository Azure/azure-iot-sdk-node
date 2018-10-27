// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var uuid = require('uuid');
var pem  = require('pem');

var UnauthorizedError = require('azure-iot-common').errors.UnauthorizedError;
var DeviceNotFoundError = require('azure-iot-common').errors.DeviceNotFoundError;
var NotConnectedError = require('azure-iot-common').errors.NotConnectedError;
var Message = require('azure-iot-common').Message;
var Registry = require('azure-iothub').Registry;
var ServiceConnectionString = require('azure-iothub').ConnectionString;
var DeviceClient = require('azure-iot-device').Client;
var DeviceConnectionString = require('azure-iot-device').ConnectionString;
var DeviceSAS = require('azure-iot-device').SharedAccessSignature;
var Amqp = require('azure-iot-device-amqp').Amqp;
var AmqpWs = require('azure-iot-device-amqp').AmqpWs;
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var MqttWs = require('azure-iot-device-mqtt').MqttWs;
var Http = require('azure-iot-device-http').Http;

var transports = [Amqp, AmqpWs, Mqtt, MqttWs, Http];
var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

describe('Authentication', function() {
  this.timeout(60000);
  var hostName = ServiceConnectionString.parse(hubConnectionString).HostName;
  var testDeviceId = 'nodee2etestDeviceAuth-' + uuid.v4();
  var testDeviceKey = '';

  before('Creates a test device', function(beforeCallback) {
    var registry = Registry.fromConnectionString(hubConnectionString);
    registry.create({ deviceId: testDeviceId }, function(err, createdDevice) {
      if (err) {
        beforeCallback(err);
      } else {
        testDeviceKey = createdDevice.authentication.symmetricKey.primaryKey;
        beforeCallback();
      }
    });
  });

  after('Destroys the test device', function(afterCallback) {
    var registry = Registry.fromConnectionString(hubConnectionString);
    registry.delete(testDeviceId, afterCallback);
  });

  describe('ConnectionString', function() {
    // running timer/resource left after these tests
    transports.forEach(function (Transport) {
      it('Gets an UnauthorizedError over ' + Transport.name + ' if the primary key is invalid', function(testCallback) {
        var invalidPrimaryKey = new Buffer('invalidPrimaryKey').toString('base64');
        var invalidConnectionString = DeviceConnectionString.createWithSharedAccessKey(hostName, testDeviceId, invalidPrimaryKey);
        var deviceClient = DeviceClient.fromConnectionString(invalidConnectionString, Transport);
        deviceClient.sendEvent(new Message('testMessage'), function(err) {
          if(err instanceof UnauthorizedError || err instanceof NotConnectedError) {
            testCallback();
          } else {
            testCallback(err);
          }
        });
      });
    });
  });

  describe('SharedAccessSignature', function() {
    transports.forEach(function(Transport) {
      it('Gets an UnauthorizedError over ' + Transport.name + ' if the SAS Token is expired', function(testCallback) {
        var yesterday = Math.ceil((Date.now() / 1000) - 86400);
        var expiredSASToken = DeviceSAS.create(hostName, testDeviceId, testDeviceKey, yesterday).toString();
        var deviceClient = DeviceClient.fromSharedAccessSignature(expiredSASToken, Transport);
        deviceClient.sendEvent(new Message('testMessage'), function(err) {
          if(err instanceof UnauthorizedError || err instanceof NotConnectedError) {
            testCallback();
          } else {
            testCallback(err);
          }
        });
      });
    });
  });

  describe('DeviceId', function() {
    // running timer/resource left after these tests
    transports.forEach(function(Transport) {
      [{
        reason: 'improperly formed',
        id: testDeviceId + '//foo'
      },{
        reason: 'does not exist',
        id: testDeviceId + 'foo'
      }].forEach(function(deviceIdConfig){
        it('Gets an UnauthorizedError over ' + Transport.name + ' if the Device ID is ' + deviceIdConfig.reason, function(testCallback) {
          var connectionString = DeviceConnectionString.createWithSharedAccessKey(hostName, deviceIdConfig.id, testDeviceKey);
          var deviceClient = DeviceClient.fromConnectionString(connectionString, Transport);
          deviceClient.sendEvent(new Message('testMessage'), function(err) {
            if (err instanceof UnauthorizedError || err instanceof DeviceNotFoundError || err instanceof NotConnectedError) {
              // AMQP and MQTT translate to Unauthorized but HTTP to DeviceNotFound
              testCallback();
            } else {
              testCallback(err);
            }
          });
        });
      });
    });
  });

  describe.only('X509', function() {
    var x509testDeviceId = 'nodee2etestDeviceAuthx509-' + uuid.v4();
    var x509goodCert = '';
    var x509goodKey = '';
    var x509badCert = '';
    var x509badKey = '';
    var x509testConnectionString = '';
    before(function(beforeCallback) {
      pem.createCertificate({ selfSigned: true, days: 1 }, function (err, certConstructionResult) {
        if (err) {
          beforeCallback(err);
        } else {
          pem.getFingerprint(certConstructionResult.certificate, function (err, fingerPrintResult) {
            if (err) {
              beforeCallback(err);
            } else {
              var thumbPrint = fingerPrintResult.fingerprint.replace(/:/g, '');
              var registry = Registry.fromConnectionString(hubConnectionString);
              registry.create({
                deviceId: x509testDeviceId,
                status: 'enabled',
                authentication: {
                  x509Thumbprint: {
                    primaryThumbprint: thumbPrint
                  }
                }
              },
              function(err) {
                if (err) {
                  beforeCallback(err);
                } else {
                  x509testConnectionString = DeviceConnectionString.createWithX509Certificate(hostName, x509testDeviceId);
                  x509goodCert = certConstructionResult.certificate;
                  x509goodKey = certConstructionResult.clientKey;

                  // Now create a valid certificate not associated with a device.
                  pem.createCertificate({ selfSigned: true, days: 1 }, function (err, badCertConstructionResult) {
                    if (err) {
                      beforeCallback(err);
                    } else {
                      x509badCert = badCertConstructionResult.certificate;
                      x509badKey = badCertConstructionResult.clientKey;
                      beforeCallback();
                    }
                  });
                }
              });
            }
          });
        }
      });
    });

    after(function(afterCallback) {
      var registry = Registry.fromConnectionString(hubConnectionString);
      registry.delete(x509testDeviceId, afterCallback);
    });

    transports.forEach(function(Transport) {
      it('Gets an UnauthorizedError over ' + Transport.name + ' if the certificate doesn\'t match the thumbprint', function(testCallback) {
        var deviceClient = DeviceClient.fromConnectionString(x509testConnectionString, Transport);
        deviceClient.setOptions({
          cert: x509badCert,
          key: x509badKey,
          passphrase: undefined
        });
        deviceClient.sendEvent(new Message('testMessage'), function(err) {
          if (err instanceof UnauthorizedError) {
            testCallback();
          }
        });
      });
    });
  });
});