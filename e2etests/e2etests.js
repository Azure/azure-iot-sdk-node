// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;

var deviceAmqp = require('azure-iot-device-amqp');
var deviceHttp = require('azure-iot-device-http');
var deviceMqtt = require('azure-iot-device-mqtt');

var device_provision = require('./test/device_provision.js');
var device_service_tests = require('./test/device_service.js');
var file_upload_tests = require('./test/file_upload.js');
var device_acknowledge_tests = require('./test/device_acknowledge_tests.js');
var sas_token_tests = require('./test/sas_token_tests.js');
var d2c_disconnect = require('./test/d2c_disconnect.js');
var c2d_disconnect = require('./test/c2d_disconnect.js');
var throttle_disconnect = require('./test/throttle_disconnect.js');
var twin_disconnect = require('./test/twin_disconnect.js');
var method_disconnect = require('./test/method_disconnect.js');
var upload_disconnect = require('./test/upload_disconnect.js');
var device_teardown = require('./test/device_teardown.js');
//var job_client = require('./test/job_client.js');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
var generalProtocols = [deviceHttp.Http, deviceAmqp.Amqp, deviceAmqp.AmqpWs, deviceMqtt.Mqtt];
var acknowledgementProtocols = [deviceHttp.Http, deviceAmqp.Amqp, deviceAmqp.AmqpWs];
var uploadDisconnectProtocols = [deviceMqtt.Mqtt, deviceMqtt.MqttWs, deviceAmqp.Amqp, deviceAmqp.AmqpWs];


device_provision(hubConnectionString, function (err, provisionedDevices) {
  if (err) {
    console.log('Unable to create the devices needed.');
  } else {
    provisionedDevices.forEach(function(deviceToTest) {
      if (deviceToTest.authenticationDescription !== 'CA signed certificate') {
        acknowledgementProtocols.forEach(function (protocolToTest) {
          device_acknowledge_tests(hubConnectionString, protocolToTest, deviceToTest);
        });
      }
      if (deviceToTest.authenticationDescription !== 'CA signed certificate') {
        generalProtocols.forEach(function(protocolToTest) {
          device_service_tests(hubConnectionString, protocolToTest, deviceToTest);
        });
      }
    });

    // CA certs don't work for http and ca cert chains don't work for web sockets.
    assert.equal(provisionedDevices[3].authenticationDescription, 'CA signed certificate');
    device_service_tests(hubConnectionString, deviceMqtt.Mqtt, provisionedDevices[3]);
    device_service_tests(hubConnectionString, deviceAmqp.Amqp, provisionedDevices[3]);
    device_acknowledge_tests(hubConnectionString, deviceAmqp.Amqp, provisionedDevices[3]);
    //In the interest of saving time, we only will perform the connection
    //tests on the shared key device.
    assert.equal(provisionedDevices[1].authenticationDescription, 'shared private key');
    c2d_disconnect(hubConnectionString, provisionedDevices[1]);
    d2c_disconnect(hubConnectionString, provisionedDevices[1]);
    method_disconnect(hubConnectionString, provisionedDevices[1]);
    throttle_disconnect(hubConnectionString, provisionedDevices[1]);
    uploadDisconnectProtocols.forEach(function(protocolToTest) {
      upload_disconnect(hubConnectionString, protocolToTest, provisionedDevices[1]);
    });
    twin_disconnect(hubConnectionString);

    generalProtocols.forEach(function(protocolToTest) {
      sas_token_tests(hubConnectionString, protocolToTest, provisionedDevices[1]);
    });
    file_upload_tests(hubConnectionString, deviceHttp.Http, provisionedDevices[1]);
  }

  device_teardown(hubConnectionString, provisionedDevices);
  if (!provisionedDevices || provisionedDevices.length !== 4) {
    describe('device creation did not', function() {
      it('completely work', function(done) {
          done(new Error(''));
      });
    });
  }
  /* The FOLLOWING comment directs the jshint linter to assume that run is a global.  run is supplied by the the mocha framework. */
  /* globals run */
  run();
});

// job_client(hubConnectionString);

