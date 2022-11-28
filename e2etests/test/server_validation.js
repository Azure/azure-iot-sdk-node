// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let serviceSdk = require('azure-iothub');
let serviceSas = require('azure-iothub').SharedAccessSignature;
let Message = require('azure-iot-common').Message;
let anHourFromNow = require('azure-iot-common').anHourFromNow;
let Registry = require('azure-iothub').Registry;
let NoRetry = require('azure-iot-common').NoRetry;
let deviceSdk = require('azure-iot-device');
let httpModule = require('azure-iot-device-http');
let amqpModule = require('azure-iot-device-amqp');
let mqttModule = require('azure-iot-device-mqtt');


let uuid = require('uuid');

let hubConnectionString = process.env.IOTHUB_CONN_STRING_INVALID_CERT;
let deviceConnectionString = process.env.IOTHUB_DEVICE_CONN_STRING_INVALID_CERT;

let correctDisconnectMessage = function (err, done) {
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


describe('Service Client', function () {
  // eslint-disable-next-line no-invalid-this
  this.timeout(60000);
  [
    require('azure-iothub').Amqp,
    require('azure-iothub').AmqpWs
  ].forEach(function (Transport) {
    it('Service client will fail with SAS token over ' + Transport.name + ' using a shared access signature', function (done) {
      let connStr = serviceSdk.ConnectionString.parse(hubConnectionString);
      let sas = serviceSas.create(connStr.HostName, connStr.SharedAccessKeyName, connStr.SharedAccessKey, anHourFromNow()).toString();
      let serviceClient = serviceSdk.Client.fromSharedAccessSignature(sas, Transport);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      serviceClient.open(function (err) {
        if (err) {
          correctDisconnectMessage(err, done);
        } else {
          serviceClient.close(function () {
            done(new Error('service client did NOT detect bad cert.'));
          });
        }
      });
    });

    it('Service client will fail with connection string over ' + Transport.name + ' using a connection string', function (done) {
      let serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString, Transport);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      serviceClient.open(function (err) {
        if (err) {
          correctDisconnectMessage(err, done);
        } else {
          serviceClient.close(function () {
            done(new Error('service client did NOT detect bad cert.'));
          });
        }
      });
    });
  });
});

describe('Registry', function () {
  // eslint-disable-next-line no-invalid-this
  this.timeout(60000);
  let deviceIdOnly = {
    deviceId: uuid.v4()
  };
  it('Fails to create a device', function (done){
    let registry = Registry.fromConnectionString(hubConnectionString);
    registry.create(deviceIdOnly, function (err) {
      correctDisconnectMessage(err, done);
    });
  });
});


describe('Device Client', function () {
  let uuidData = uuid.v4();
  let originalMessage = new Message(uuidData);
  [
    httpModule.Http,
    amqpModule.Amqp,
    amqpModule.AmqpWs,
    mqttModule.Mqtt,
    mqttModule.MqttWs
  ].forEach(function (deviceTransport) {
    describe('Over ' + deviceTransport.name, function () {
      it('Fails to open a device', function (done) {
        let deviceClient = deviceSdk.Client.fromConnectionString(deviceConnectionString, deviceTransport);
        deviceClient.setRetryPolicy(new NoRetry());
        deviceClient.sendEvent(originalMessage, function (err) {
          correctDisconnectMessage(err, done);
        });
      });
    });
  });
});

