// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-common').Message;
var SharedAccessSignature = require('azure-iot-device').SharedAccessSignature;
var ConnectionString = require('azure-iot-device').ConnectionString;
var DeviceIdentityHelper = require('./device_identity_helper.js');
var debug = require('debug')('e2etests:sas_token_tests');
var tls = require('tls');
var sinon = require('sinon');
var assert = require('chai').assert;
var debug = require('debug')('e2etests:tls_one_dot_two_enforcement');

/**
 * TLS 1.2 Enforcement Tests
 * 
 * TLS 1.2 Enforcement has been built into the Node.js Device Client for MQTT, AMQP, and HTTP.
 * There is no enforcement for WS on MQTT or AMQP currently.
 */

var transport  = [
  require('azure-iot-device-amqp').Amqp,
  require('azure-iot-device-mqtt').Mqtt
];

transport.forEach(function (deviceTransport) {
  describe('TLS 1.2 enforcement test over ' + deviceTransport.name, function () {
    this.timeout(60000);
    var provisionedDevice;

    before(function (beforeCallback) {
      DeviceIdentityHelper.createDeviceWithSymmetricKey(function (err, testDeviceInfo) {
        debug('created test device: ' + testDeviceInfo.deviceId);
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      debug('deleting test device: ' + provisionedDevice.deviceId);
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
    });

    function thirtySecondsFromNow() {
      var raw = (Date.now() / 1000) + 30;
      return Math.ceil(raw);
    }

    function createNewSas() {
      var cs = ConnectionString.parse(provisionedDevice.connectionString);
      var sas = SharedAccessSignature.create(cs.HostName, provisionedDevice.deviceId, cs.SharedAccessKey, thirtySecondsFromNow());
      return sas.toString();
    }

    it('Provides TLS with a SecureContext with SecureOptions', function (testCallback) {
      var secureContextSpy = sinon.spy(tls, 'createSecureContext');

      var deviceClient = Client.fromSharedAccessSignature(createNewSas(), deviceTransport);

      var finishUp = function(e) {
        deviceClient.close(function () {
          secureContextSpy.restore();
          testCallback(e);
        });
      };

      deviceClient.open(function (err) {
        // the spy will check that we did infact call the secureContext in the TLS.
        if (err) return testCallback(err);
        try {
          assert.isTrue(secureContextSpy.called, 'createSecureContext not called');
          assert.exists(secureContextSpy.args[0][0].secureOptions, 'secureOptions not passed to createSecureContext');
          finishUp();
        } catch (e) {
          finishUp(e);
        }

      });
    });
  });
});

var httpTransport = require('azure-iot-device-http').Http;

describe('TLS 1.2 enforcement test over Http', function () {
  this.timeout(60000);
  var provisionedDevice;

  before(function (beforeCallback) {
    DeviceIdentityHelper.createDeviceWithSymmetricKey(function (err, testDeviceInfo) {
      debug('created test device: ' + testDeviceInfo.deviceId);
      provisionedDevice = testDeviceInfo;
      beforeCallback(err);
    });
  });

  after(function (afterCallback) {
    debug('deleting test device: ' + provisionedDevice.deviceId);
    DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
  });

  function thirtySecondsFromNow() {
    var raw = (Date.now() / 1000) + 30;
    return Math.ceil(raw);
  }

  function createNewSas() {
    var cs = ConnectionString.parse(provisionedDevice.connectionString);
    var sas = SharedAccessSignature.create(cs.HostName, provisionedDevice.deviceId, cs.SharedAccessKey, thirtySecondsFromNow());
    return sas.toString();
  }

  it('Provides TLS with a SecureContext with SecureOptions', function (testCallback) {
    var secureContextSpy = sinon.spy(tls, 'createSecureContext');
    var message = new Message('trash');
    var deviceClient = Client.fromSharedAccessSignature(createNewSas(), httpTransport);

    var finishUp = function() {
      deviceClient.close(function () {
        secureContextSpy.restore();
        testCallback();
      });
    };

    deviceClient.open(function (err) {
      if (err) return testCallback(err);
      deviceClient.sendEvent(message, (err) => {
        if (err) return testCallback(err);
        // the spy will check that we did infact call the secureContext in the TLS.
        assert.isTrue(secureContextSpy.called, 'createSecureContext not called');
        assert.exists(secureContextSpy.args[0][0].secureProtocol, "TLSv1_2_method");
        finishUp();
      });
    });
  });
});