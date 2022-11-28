// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let Registry = require('azure-iothub').Registry;
let ServiceClient = require('azure-iothub').Client;
let ConnectionString = require('azure-iothub').ConnectionString;
let SharedAccessSignature = require('azure-iothub').SharedAccessSignature;
let deviceSas = require('azure-iot-device').SharedAccessSignature;
let deviceSdk = require('azure-iot-device');
let anHourFromNow = require('azure-iot-common').anHourFromNow;
let uuid = require('uuid');
let assert = require('chai').assert;
let debug = require('debug')('e2etests:devicemethod');

let deviceAmqp = require('azure-iot-device-amqp');
let deviceMqtt = require('azure-iot-device-mqtt');
let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

[
  deviceMqtt.Mqtt,
  deviceMqtt.MqttWs,
  deviceAmqp.Amqp,
  deviceAmqp.AmqpWs
].forEach(function (protocolCtor) {
  describe('Device Methods over ' + protocolCtor.name, function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(120000);
    let registry = Registry.fromConnectionString(hubConnectionString);
    let deviceClient;
    let deviceDescription;

    before(function (done) {
      deviceDescription = {
        deviceId:  '0000e2etest-delete-me-node-device-method-' + uuid.v4(),
        status: 'enabled',
          authentication: {
          symmetricKey: {
            primaryKey: Buffer.from(uuid.v4()).toString('base64'),
            secondaryKey: Buffer.from(uuid.v4()).toString('base64')
          }
        }
      };

      debug('creating device: ' + deviceDescription.deviceId);
      registry.create(deviceDescription, function (err) {
        if (err) {
          debug('failed to create the device: ' +  deviceDescription.deviceId + ': ' + err.toString());
          return done(err);
        } else {
          debug('created test device: ' + deviceDescription.deviceId);
          return done();
        }
      });
    });

    after(function (done) {
      debug('deleting test device: ' + deviceDescription.deviceId);
      registry.delete(deviceDescription.deviceId, function (err) {
        if (err) {
          debug('failed to delete device: ' +  deviceDescription.deviceId + ': ' + err.toString());
          return done(err);
        } else {
          debug('device deleted: ' +  deviceDescription.deviceId);
          return done();
        }
      });
    });

    // create a new device for every test
    beforeEach(function (done) {
      let host = ConnectionString.parse(hubConnectionString).HostName;
      let sas = deviceSas.create(host, deviceDescription.deviceId, deviceDescription.authentication.symmetricKey.primaryKey, anHourFromNow()).toString();
      deviceClient = deviceSdk.Client.fromSharedAccessSignature(sas, protocolCtor);
      debug('connecting device client...');
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      deviceClient.open(function (err) {
        if (err) {
          debug('error connecting device client: ' + err.toString());
          return done(err);
        } else {
          debug('device client connected');
          return done();
        }
      });
    });

    // delete the test device identity after every test
    afterEach(function (done) {
      if (deviceClient) {
        debug('disconnecting device client...');
        deviceClient.close(function (err) {
          if (err) {
            console.warn('Could not close connection to device ' + deviceDescription.deviceId + ': ' + err.toString());
            return done(err);
          } else {
            debug('device connection closed');
            return done();
          }
        });
      } else {
        debug('no device client. nothing to disconnect');
        done();
      }
    });

    let methodName = 'method1';
    let methodResult = 200;

    let setMethodHandler = function (testPayload) {
      debug('---------- new method test ------------');
      // setup device to handle the method call
      deviceClient.onDeviceMethod(methodName, function (request, response) {
        // validate request
        assert.isNotNull(request);
        assert.strictEqual(request.methodName, methodName);
        assert.deepEqual(request.payload, testPayload);
        debug('device: received method request');
        debug(JSON.stringify(request, null, 2));
        // validate response
        assert.isNotNull(response);

        // send the response
        response.send(methodResult, testPayload, function (err) {
          debug('send method response with statusCode: ' + methodResult);
          if(err) {
            console.error('An error ocurred when sending a method response:\n' +
                err.toString());
          }
        });
      });
    };

    let sendMethodCall = function (serviceClient, deviceId, testPayload, done) {
      setTimeout(function () {
        // make the method call via the service
        let methodParams = {
          methodName: methodName,
          payload: testPayload,
          connectTimeoutInSeconds: 30,
          responseTimeoutInSeconds: 45
        };
        debug('service sending method call:');
        debug(JSON.stringify(methodParams, null, 2));
        serviceClient.invokeDeviceMethod(
                deviceId,
                methodParams,
                function (err, result) {
                  if(!err) {
                    debug('got method results');
                    debug(JSON.stringify(result, null, 2));
                    assert.strictEqual(result.status, methodResult);
                    assert.deepEqual(result.payload, testPayload);
                  }
                  debug('---------- end method test ------------');
                  done(err);
                });
      }, 1000);
    };

    [null, '', 'foo', { k1: 'v1' }, {}].forEach(function (testPayload) {
      it('makes and receives a method call with ' + JSON.stringify(testPayload), function (done) {
        setMethodHandler(testPayload);
        let serviceClient = ServiceClient.fromConnectionString(hubConnectionString);
        sendMethodCall(serviceClient, deviceDescription.deviceId, testPayload, done);
      });
    });

    it('makes and receives a method call when the client is created with a Shared Access Signature', function (done) {
      let testPayload = 'foo';
      let cn = ConnectionString.parse(hubConnectionString);
      let sas = SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, anHourFromNow());
      let serviceClient = ServiceClient.fromSharedAccessSignature(sas);
      setMethodHandler(testPayload);
      sendMethodCall(serviceClient, deviceDescription.deviceId, testPayload, done);
    });

    it('makes and receives a method call after renewing the SAS token', function (done) {
      let testPayload = { 'k1' : 'v1' };
      setMethodHandler(testPayload);
        deviceClient.on('_sharedAccessSignatureUpdated', function () {
        setTimeout(function () {
          let serviceClient = ServiceClient.fromConnectionString(hubConnectionString);
          sendMethodCall(serviceClient, deviceDescription.deviceId, testPayload, done);
        }, 1000);
      });
      deviceClient.updateSharedAccessSignature(deviceSas.create(ConnectionString.parse(hubConnectionString).HostName, deviceDescription.deviceId, deviceDescription.authentication.symmetricKey.primaryKey, anHourFromNow()).toString());
    });
  });
});
