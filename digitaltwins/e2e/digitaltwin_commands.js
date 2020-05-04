// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
const debug = require('debug')('e2etests:digitaltwin_commands');
const uuid = require('uuid');
const assert = require('chai').assert;

const ServiceConnectionString = require('azure-iothub').ConnectionString;
const Registry = require('azure-iothub').Registry;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;

const DeviceSas = require('azure-iot-device').SharedAccessSignature;
const DeviceClient = require('azure-iot-device').Client;

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinDeviceClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const createModel = require('./model_repository_helper').createModel;
const interfaceDocument = require('./dtdl/test_interface');
const capabilityModelDocument = require('./dtdl/test_capability_model');

const startEventHubsClient = require('./event_hubs_helper').startEventHubsClient;
const closeClients = require('./event_hubs_helper').closeClients;

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
const hubHostName = ServiceConnectionString.parse(hubConnectionString).HostName;
const credentials = new IoTHubTokenCredentials(hubConnectionString);

const TestComponent = require('./test_component').TestComponent;

describe('Digital Twin Invoke Command', function () {
  const deviceDescription = {
    deviceId: 'node-e2e-digitaltwin-invoke-command-' + uuid.v4()
  };
  const testComponentName = 'testComponent';
  const syncCommandName = 'syncCommand';
  const asyncCommandName = 'asyncCommand';
  const invokeCommandArgument = 'testInvokeCommandArgument';
  const invokeCommandResponse = 'testInvokeCommandResponse';
  let createdDevice;

  before('creating device identity: ' + deviceDescription.deviceId, function () {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    debug('creating test device: ' + deviceDescription.deviceId);
    return Registry.fromConnectionString(hubConnectionString).create(deviceDescription
    ).then((device) => {
      createdDevice = device.responseBody;
      debug('create or update test interface model: ' + interfaceDocument['@id']);
      return createModel(interfaceDocument);
    }).then(() => {
      debug('interface model creation succeeded');
      debug('create or update test Model ID: ' + capabilityModelDocument['@id']);
      return createModel(capabilityModelDocument);
    }).then(() => {
      debug('beforeAll hook done');
      return Promise.resolve();
    }).catch((err) => {
      debug('error creating test resources: ' + err.toString());
      throw err;
    });
  });

  after('deleting device identity: ' + deviceDescription.deviceId, function () {
    this.timeout(60000); // eslint-disable-line no-invalid-this
    return Registry.fromConnectionString(hubConnectionString).delete(deviceDescription.deviceId);
  });

  it('service invokes a sync command and it is acknowledged by the device client', function (done) {
    this.timeout(60000); // eslint-disable-line no-invalid-this

    // test device client
    const deviceSasExpiry = Math.floor(new Date() / 1000) + 3600;
    const deviceSas = DeviceSas.create(hubHostName, createdDevice.deviceId, createdDevice.authentication.symmetricKey.primaryKey, deviceSasExpiry);
    const deviceClient = DeviceClient.fromSharedAccessSignature(deviceSas, Mqtt);
    const digitalTwinClient = new DigitalTwinDeviceClient(capabilityModelDocument['@id'], deviceClient);
    const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

    const testComponent = new TestComponent(testComponentName, function () {}, (request, response) => {
      debug('command handler invoked');
      assert.isNotNull(request);
      assert.strictEqual(request.commandName, syncCommandName);
      console.log('invoked command: ' + syncCommandName);
      response.acknowledge(200, invokeCommandResponse, (err) => {
        if (err) {
          console.log('responding to the testInvokeCommand command failed.');
          deviceClient.close(function () {
            debug('device client closed');
            done(err);
          });
        }
      });
    });
    digitalTwinClient.addComponents(testComponent);

    debug('device client: registering');
    digitalTwinClient.register()
      .then(function () {
        debug('device client: registred and ready to receive commands.');
        debug('service client: invoke the sync command');
        return digitalTwinServiceClient.invokeCommand(deviceDescription.deviceId, testComponentName, syncCommandName, invokeCommandArgument);
      })
      .then(function (response) {
        debug('service client: command response received');
        assert.strictEqual(200, response.statusCode);
        assert.strictEqual(invokeCommandResponse, response.result);
        debug('closing device client');
        return deviceClient.close();
      })
      .then(function () {
        debug('device client closed: test successful');
        done();
      })
      .catch((err) => {
        debug('error invoking the command: ' + err.toString());
        deviceClient.close(function () {
          debug('device client closed');
          done(err);
        });
      });
  });

  it('service invokes an async command and it is acknowledged then updated by the device client', function (done) {
    this.timeout(60000); // eslint-disable-line no-invalid-this

    // test device client
    const deviceSasExpiry = Math.floor(new Date() / 1000) + 3600;
    const deviceSas = DeviceSas.create(hubHostName, createdDevice.deviceId, createdDevice.authentication.symmetricKey.primaryKey, deviceSasExpiry);
    const deviceClient = DeviceClient.fromSharedAccessSignature(deviceSas, Mqtt);
    const digitalTwinClient = new DigitalTwinDeviceClient(capabilityModelDocument['@id'], deviceClient);
    const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);
    const startAfterTime = Date.now() - 5000;

    let ehClient;
    let requestId;

    const onEventHubMessage = function (eventData) {
      if (eventData.annotations['iothub-connection-device-id'] === createdDevice.deviceId) {
        debug('received a message from the test device: ');
        if (eventData.body.modelInformation) {
          debug('device registered its interfaces');
        }
        if (eventData.applicationProperties && eventData.applicationProperties['iothub-command-name'] === asyncCommandName) {
          assert.strictEqual(eventData.body, invokeCommandResponse);
          assert.strictEqual(eventData.applicationProperties['iothub-command-statuscode'], '200');
          assert.strictEqual(eventData.applicationProperties['iothub-command-request-id'], requestId);
          debug('found telemetry message from test device. test successful.');
          closeClients(deviceClient, ehClient, done);
        }
      } else {
        debug('Incoming device id is: ' + eventData.annotations['iothub-connection-device-id']);
      }
    };

    const onEventHubError = function (err) {
      debug('Error from Event Hub Client Receiver: ' + err.toString());
      closeClients(deviceClient, ehClient, done, err);
    };

    const testComponent = new TestComponent(testComponentName, function () {}, (request, response) => {
      debug('command handler invoked');
      assert.isNotNull(request);
      if (request.commandName === asyncCommandName) {
        debug('invoked command: ' + asyncCommandName);
        response.acknowledge(200, invokeCommandResponse, (err) => {
          if (err) {
            debug('responding to the testInvokeCommand command failed.');
            closeClients(deviceClient, ehClient, done, err);
          } else {
            debug('waiting 2 seconds before sending a telemetry update');
            setTimeout(() => {
              debug('sending telemetry update');
              response.update(200, invokeCommandResponse, (err) => {
                if (err) {
                  debug('error sending telemetry update: ' + err.toString());
                  closeClients(deviceClient, ehClient, done, err);
                } else {
                  debug('sent telemetry update');
                }
              });
            }, 2000);
          }
        });
      }
    });
    digitalTwinClient.addComponents(testComponent);

    debug('event hubs client: creating...');
    startEventHubsClient(onEventHubMessage, onEventHubError, startAfterTime, 3000)
      .then((client) => {
        debug('event hubs client: started');
        ehClient = client;
        debug('device client: registering...');
        return digitalTwinClient.register();
      }).then(() => {
        debug('device client: registered');
        debug('service client: invoke the async command');
        return digitalTwinServiceClient.invokeCommand(deviceDescription.deviceId, testComponentName, asyncCommandName, 'arg');
      }).then((response) => {
        debug('service client: command response received');
        assert.strictEqual(200, response.statusCode);
        assert.strictEqual(invokeCommandResponse, response.result);
        requestId = response.requestId;
        debug('now waiting for updates using telemetry...');
      }).catch((err) => {
        debug('test failed before telemetry updates: ' + err.toString());
        closeClients(deviceClient, ehClient, done, err);
      });
  });
});
