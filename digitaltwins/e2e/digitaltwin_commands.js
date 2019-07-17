// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
const debug = require('debug')('digitaltwinse2e:invokecommand');
const uuid = require('uuid');
const assert = require('chai').assert;

const ServiceConnectionString = require('azure-iothub').ConnectionString;
const Registry = require('azure-iothub').Registry;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;

const DeviceSas = require('azure-iot-device').SharedAccessSignature;
const DeviceClient = require('azure-iot-device').Client;

const IoTHubTokenCredentials = require('azure-iot-digitaltwin-service').IoTHubTokenCredentials;
const DigitalTwinDeviceClient = require('azure-iot-digitaltwin-device').DigitalTwinClient;
const DigitalTwinServiceClient = require('azure-iot-digitaltwin-service').DigitalTwinServiceClient;

const createModel = require('./model_repository_helper').createModel;
const interfaceDocument = require('./dtdl/test_interface');
const capabilityModelDocument = require('./dtdl/test_capability_model');

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
const hubHostName = ServiceConnectionString.parse(hubConnectionString).HostName;
const credentials = new IoTHubTokenCredentials(hubConnectionString);

const TestComponent = require('./test_component').TestComponent;

describe('Digital Twin Invoke Command', function() {
  const deviceDescription = {
    deviceId: 'node-e2e-digitaltwin-invoke-command-' + uuid.v4()
  };
  const testComponentName = 'testComponent';
  const invokeCommandName = 'syncCommand';
  const invokeCommandArgument = 'testInvokeCommandArgument';
  const invokeCommandResponse = 'testInvokeCommandResponse';
  let createdDevice;

  before('creating device identity: ' + deviceDescription.deviceId, function(done) {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    debug('creating test device: ' + deviceDescription.deviceId);
    Registry.fromConnectionString(hubConnectionString).create(deviceDescription
    ).then((device) => {
      createdDevice = device.responseBody;
      debug('create or update test interface model: ' + interfaceDocument['@id']);
      return createModel(interfaceDocument);
    }).then(() => {
      debug('interface model creation succeeded');
      debug('create or update test capability model: ' + capabilityModelDocument['@id']);
      return createModel(capabilityModelDocument);
    }).then(() => {
      debug('beforeAll hook done');
      done();
    }).catch((err) => {
      debug('error creating test resources: ' + err.toString());
      done(err);
    });
  });

  after('deleting device identity: ' + deviceDescription.deviceId, function(done) {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    Registry.fromConnectionString(hubConnectionString).delete(deviceDescription.deviceId, done);
  });

  it('invoke command received by the device client', function(done) {
    this.timeout(160000); // eslint-disable-line no-invalid-this

    // test device client
    const deviceSasExpiry = Math.floor(new Date() / 1000) + 3600;
    const deviceSas = DeviceSas.create(hubHostName, createdDevice.deviceId, createdDevice.authentication.symmetricKey.primaryKey, deviceSasExpiry);
    const deviceClient = DeviceClient.fromSharedAccessSignature(deviceSas, Mqtt);
    const digitalTwinClient = new DigitalTwinDeviceClient(capabilityModelDocument['@id'], deviceClient);

    const commandCallback = function(request, response) {
      debug('command handler invoked');
      assert.isNotNull(request);
      assert.strictEqual(request.commandName, invokeCommandName);
      console.log('invoked command: ' + invokeCommandName);
      response.acknowledge(200, invokeCommandResponse, (err) => {
        if (err) {
          console.log('responding to the testInvokeCommand command failed.');
          deviceClient.close(function() {
            debug('device client closed');
            done(err);
          });
        }
      });
    };

    const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

    const testComponent = new TestComponent(testComponentName, function() {}, commandCallback);
    digitalTwinClient.addComponent(testComponent);
    digitalTwinClient.register()
        .then(function() {
          return digitalTwinServiceClient.invokeCommand(deviceDescription.deviceId, testComponentName, invokeCommandName, invokeCommandArgument);
        })
        .then(function(response) {
          assert.strictEqual(200, response.statusCode);
          assert.strictEqual(invokeCommandResponse, response.result);
        })
        .then(function() {
          return deviceClient.close();
        })
        .then(function() {
          done();
        })
        .catch((err) => {
          deviceClient.close(function() {
            debug('device client closed');
            done(err);
          });
        });
  });
});
