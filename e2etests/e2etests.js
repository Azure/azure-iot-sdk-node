// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;

var deviceAmqp = require('azure-iot-device-amqp');
var deviceHttp = require('azure-iot-device-http');
var deviceMqtt = require('azure-iot-device-mqtt');

var device_provision = require('./test/device_provision.js');
var device_service_tests = require('./test/device_service.js');
var registry_tests = require('./test/registry.js');
var file_upload_tests = require('./test/file_upload.js');
var device_acknowledge_tests = require('./test/device_acknowledge_tests.js');
var sas_token_tests = require('./test/sas_token_tests.js');
var service_client = require('./test/service.js');
var d2c_disconnect = require('./test/d2c_disconnect.js');
var c2d_disconnect = require('./test/c2d_disconnect.js');
var throttle_disconnect = require('./test/throttle_disconnect.js');
var method_disconnect = require('./test/method_disconnect.js');
var upload_disconnect = require('./test/upload_disconnect.js');
var device_teardown = require('./test/device_teardown.js');
var twin_e2e_tests = require('./test/twin_e2e_tests.js');
var device_method = require('./test/device_method.js');
var job_client = require('./test/job_client.js');
var authentication_tests = require('./test/authentication.js');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
var storageConnectionString = process.env.STORAGE_CONNECTION_STRING;
var generalProtocols = [deviceHttp.Http, deviceAmqp.Amqp, deviceAmqp.AmqpWs, deviceMqtt.Mqtt];
var acknowledgementProtocols = [deviceHttp.Http, deviceAmqp.Amqp, deviceAmqp.AmqpWs];
var deviceMethodsProtocols = [deviceMqtt.Mqtt, deviceMqtt.MqttWs, deviceAmqp.Amqp, deviceAmqp.AmqpWs];
var uploadDisconnectProtocols = [deviceMqtt.Mqtt, deviceMqtt.MqttWs, deviceAmqp.Amqp, deviceAmqp.AmqpWs];


device_provision(hubConnectionString, function (err, provisionedDevices) {
  if (err) {
    console.log('Unable to create the devices needed.');
  } else {
    provisionedDevices.forEach(function(deviceToTest) {
      acknowledgementProtocols.forEach(function (protocolToTest) {
        device_acknowledge_tests(hubConnectionString, protocolToTest, deviceToTest);
        });
      generalProtocols.forEach(function(protocolToTest) {
        device_service_tests(hubConnectionString, protocolToTest, deviceToTest);
      });
    });

    // In the interest of saving time, we only will perform the connection
    // tests on the shared key device.
    assert.equal(provisionedDevices[1].authenticationDescription, 'shared private key');
    c2d_disconnect(hubConnectionString, provisionedDevices[1]);
    d2c_disconnect(hubConnectionString, provisionedDevices[1]);
    method_disconnect(hubConnectionString, provisionedDevices[1]);
    throttle_disconnect(hubConnectionString, provisionedDevices[1]);
    uploadDisconnectProtocols.forEach(function(protocolToTest) {
      upload_disconnect(hubConnectionString, protocolToTest, provisionedDevices[1]);
    });

    generalProtocols.forEach(function(protocolToTest) {
      sas_token_tests(hubConnectionString, protocolToTest, provisionedDevices[1]);
    });
    file_upload_tests(hubConnectionString, deviceHttp.Http, provisionedDevices[1]);
  }
  service_client(hubConnectionString);
  registry_tests(hubConnectionString, storageConnectionString);
  authentication_tests(hubConnectionString);

  device_teardown(hubConnectionString, provisionedDevices);
  if (!provisionedDevices || provisionedDevices.length !== 3) {
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

twin_e2e_tests(hubConnectionString);
device_method(hubConnectionString, deviceMethodsProtocols);
job_client(hubConnectionString);

