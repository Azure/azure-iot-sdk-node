// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const uuid = require('uuid');
const pem  = require('pem');

const UnauthorizedError = require('azure-iot-common').errors.UnauthorizedError;
const DeviceNotFoundError = require('azure-iot-common').errors.DeviceNotFoundError;
const NotConnectedError = require('azure-iot-common').errors.NotConnectedError;
const Message = require('azure-iot-common').Message;
const Registry = require('azure-iothub').Registry;
const ServiceConnectionString = require('azure-iothub').ConnectionString;
const DeviceClient = require('azure-iot-device').Client;
const DeviceConnectionString = require('azure-iot-device').ConnectionString;
const DeviceSAS = require('azure-iot-device').SharedAccessSignature;
const Amqp = require('azure-iot-device-amqp').Amqp;
const AmqpWs = require('azure-iot-device-amqp').AmqpWs;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const MqttWs = require('azure-iot-device-mqtt').MqttWs;
const Http = require('azure-iot-device-http').Http;

const transports = [Amqp, AmqpWs, Mqtt, MqttWs, Http];
const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

describe('Authentication', function () {
  // eslint-disable-next-line no-invalid-this
  this.timeout(60000);
  const hostName = ServiceConnectionString.parse(hubConnectionString).HostName;
  const testDeviceId = 'nodee2etestDeviceAuth-' + uuid.v4();
  let testDeviceKey = '';

  before('Creates a test device', function (beforeCallback) {
    const registry = Registry.fromConnectionString(hubConnectionString);
    registry.create({ deviceId: testDeviceId }, function (err, createdDevice) {
      if (err) {
        beforeCallback(err);
      } else {
        testDeviceKey = createdDevice.authentication.symmetricKey.primaryKey;
        beforeCallback();
      }
    });
  });

  after('Destroys the test device', function (afterCallback) {
    const registry = Registry.fromConnectionString(hubConnectionString);
    registry.delete(testDeviceId, afterCallback);
  });

  describe('ConnectionString', function () {
    // running timer/resource left after these tests
    transports.forEach(function (Transport) {
      it('Gets an UnauthorizedError over ' + Transport.name + ' if the primary key is invalid', function (testCallback) {
        const invalidPrimaryKey = Buffer.from('invalidPrimaryKey').toString('base64');
        const invalidConnectionString = DeviceConnectionString.createWithSharedAccessKey(hostName, testDeviceId, invalidPrimaryKey);
        const deviceClient = DeviceClient.fromConnectionString(invalidConnectionString, Transport);
        deviceClient.sendEvent(new Message('testMessage'), function (err) {
          if(err instanceof UnauthorizedError || err instanceof NotConnectedError) {
            testCallback();
          } else {
            testCallback(err);
          }
        });
      });
    });
  });

  describe('SharedAccessSignature', function () {
    transports.forEach(function (Transport) {
      it('Gets an UnauthorizedError over ' + Transport.name + ' if the SAS Token is expired', function (testCallback) {
        const yesterday = Math.ceil((Date.now() / 1000) - 86400);
        const expiredSASToken = DeviceSAS.create(hostName, testDeviceId, testDeviceKey, yesterday).toString();
        const deviceClient = DeviceClient.fromSharedAccessSignature(expiredSASToken, Transport);
        deviceClient.sendEvent(new Message('testMessage'), function (err) {
          if(err instanceof UnauthorizedError || err instanceof NotConnectedError) {
            testCallback();
          } else {
            testCallback(err);
          }
        });
      });
    });
  });

  describe('DeviceId', function () {
    // running timer/resource left after these tests
    transports.forEach(function (Transport) {
      [{
        reason: 'improperly formed',
        id: testDeviceId + '//foo'
      },{
        reason: 'does not exist',
        id: testDeviceId + 'foo'
      }].forEach(function (deviceIdConfig){
        it('Gets an UnauthorizedError over ' + Transport.name + ' if the Device ID is ' + deviceIdConfig.reason, function (testCallback) {
          const connectionString = DeviceConnectionString.createWithSharedAccessKey(hostName, deviceIdConfig.id, testDeviceKey);
          const deviceClient = DeviceClient.fromConnectionString(connectionString, Transport);
          deviceClient.sendEvent(new Message('testMessage'), function (err) {
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

  describe('X509', function () {
    let x509testDeviceId = 'nodee2etestDeviceAuthx509-' + uuid.v4();
    let x509badCert = '';
    let x509badKey = '';
    let x509testConnectionString = '';
    before(function (beforeCallback) {
      pem.createCertificate({ selfSigned: true, days: 1 }, function (err, certConstructionResult) {
        if (err) {
          beforeCallback(err);
        } else {
          pem.getFingerprint(certConstructionResult.certificate, function (err, fingerPrintResult) {
            if (err) {
              beforeCallback(err);
            } else {
              const thumbPrint = fingerPrintResult.fingerprint.replace(/:/g, '');
              const registry = Registry.fromConnectionString(hubConnectionString);
              registry.create({
                deviceId: x509testDeviceId,
                status: 'enabled',
                authentication: {
                  x509Thumbprint: {
                    primaryThumbprint: thumbPrint
                  }
                }
              },
              function (err) {
                if (err) {
                  beforeCallback(err);
                } else {
                  x509testConnectionString = DeviceConnectionString.createWithX509Certificate(hostName, x509testDeviceId);

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

    after(function (afterCallback) {
      const registry = Registry.fromConnectionString(hubConnectionString);
      registry.delete(x509testDeviceId, afterCallback);
    });

    transports.forEach(function (Transport) {
      it('Gets an UnauthorizedError over ' + Transport.name + ' if the certificate doesn\'t match the thumbprint', function (testCallback) {
        const deviceClient = DeviceClient.fromConnectionString(x509testConnectionString, Transport);
        deviceClient.setOptions({
          cert: x509badCert,
          key: x509badKey,
          passphrase: undefined
        });
        deviceClient.sendEvent(new Message('testMessage'), function (err) {
          if (err instanceof UnauthorizedError) {
            testCallback();
          }
        });
      });
    });
  });
});
