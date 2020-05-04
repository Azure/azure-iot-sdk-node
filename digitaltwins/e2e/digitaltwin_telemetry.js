// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const debug = require('debug')('e2etests:digitaltwin_telemetry');
const uuid = require('uuid');

const Registry = require('azure-iothub').Registry;
const DigitalTwinDeviceClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const DeviceClient = require('azure-iot-device').Client;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const ServiceConnectionString = require('azure-iothub').ConnectionString;
const DeviceSas = require('azure-iot-device').SharedAccessSignature;
const TestComponent = require('./test_component').TestComponent;

const createModel = require('./model_repository_helper').createModel;

const startEventHubsClient = require('./event_hubs_helper').startEventHubsClient;
const closeClients = require('./event_hubs_helper').closeClients;

const interfaceDocument = require('./dtdl/test_interface');
const capabilityModelDocument = require('./dtdl/test_capability_model');

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
const hubHostName = ServiceConnectionString.parse(hubConnectionString).HostName;

describe('Digital Twin Telemetry', function () {
  const deviceDescription = {
    deviceId: 'node-e2e-digitaltwin-telemetry-' + uuid.v4()
  };
  let createdDevice;

  before('creating device identity: ' + deviceDescription.deviceId, async function () {
    this.timeout(60000);
    debug('creating test device: ' + deviceDescription.deviceId);
    return Registry.fromConnectionString(hubConnectionString).create(deviceDescription)
      .then((device) => {
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
    this.timeout(60000);
    debug('deleting test device: ' + deviceDescription.deviceId);
    return Registry.fromConnectionString(hubConnectionString).delete(deviceDescription.deviceId)
      .then(() => {
        debug('test device deleted: ' + deviceDescription.deviceId);
        return Promise.resolve();
      }).catch((err) => {
        debug('error deleting test device: ' + deviceDescription.deviceId);
        throw err;
      });
  });

  it('can send telemetry and it is received on the Event Hubs endpoint', function (done) {
    this.timeout(60000);

    const testTelemetryBody = uuid.v4();
    const startAfterTime = Date.now() - 5000;
    let ehClient;

    // test device client
    const deviceSasExpiry = Math.floor(new Date() / 1000) + 3600;
    const deviceSas = DeviceSas.create(hubHostName, createdDevice.deviceId, createdDevice.authentication.symmetricKey.primaryKey, deviceSasExpiry);
    const deviceClient = DeviceClient.fromSharedAccessSignature(deviceSas, Mqtt);
    const digitalTwinClient = new DigitalTwinDeviceClient(capabilityModelDocument['@id'], deviceClient);
    const testComponent = new TestComponent('testComponent', function () {}, function () {});
    digitalTwinClient.addComponents(testComponent);

    const onEventHubMessage = function (eventData) {
      if (eventData.annotations['iothub-connection-device-id'] === createdDevice.deviceId) {
        debug('received a message from the test device: ');
        debug(JSON.stringify(eventData.body));
        if (eventData.body.telemetry && eventData.body.telemetry === testTelemetryBody) {
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

    debug('event hubs client: starting...');
    startEventHubsClient(onEventHubMessage, onEventHubError, startAfterTime, 3000)
      .then((client) => {
        debug('event hubs client: started');
        ehClient = client;
        debug('registering digital twin client with test component');
        return digitalTwinClient.register();
      }).then(function () {
        debug('digital twin client registered. sending telemetry: ' + testTelemetryBody);
        return testComponent.telemetry.send(testTelemetryBody);
      }).then(() => {
        debug('telemetry sent: ' + testTelemetryBody);
      }).catch((err) => {
        debug('error while testing telemetry: ' + err.toString());
        return closeClients(deviceClient, ehClient, done, err);
      });
  });

  it('can send "imploded" telemetry and it is received on the Event Hubs endpoint', function (done) {
    this.timeout(60000);

    const testTelemetryBody = {
      firstTelemetryProperty: 1,
      thirdTelemetryProperty: 'end'
    };
    const startAfterTime = Date.now() - 5000;
    let ehClient;

    // test device client
    const deviceSasExpiry = Math.floor(new Date() / 1000) + 3600;
    const deviceSas = DeviceSas.create(hubHostName, createdDevice.deviceId, createdDevice.authentication.symmetricKey.primaryKey, deviceSasExpiry);
    const deviceClient = DeviceClient.fromSharedAccessSignature(deviceSas, Mqtt);
    const digitalTwinClient = new DigitalTwinDeviceClient(capabilityModelDocument['@id'], deviceClient);
    const testComponent = new TestComponent('testComponent', function () {}, function () {});
    digitalTwinClient.addComponents(testComponent);

    const onEventHubMessage = function (eventData) {
      if (eventData.annotations['iothub-connection-device-id'] === createdDevice.deviceId) {
        debug('received a message from the test device: ');
        debug(JSON.stringify(eventData.body));
        if ((eventData.body.firstTelemetryProperty && eventData.body.firstTelemetryProperty === testTelemetryBody.firstTelemetryProperty) &&
            (eventData.body.thirdTelemetryProperty && eventData.body.thirdTelemetryProperty === testTelemetryBody.thirdTelemetryProperty) &&
            (Object.keys(eventData.body).length === 2)) {
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

    debug('event hubs client: starting...');
    startEventHubsClient(onEventHubMessage, onEventHubError, startAfterTime, 3000)
      .then((client) => {
        debug('event hubs client: started');
        ehClient = client;
        debug('registering digital twin client with test component');
        return digitalTwinClient.register();
      }).then(function () {
        debug('digital twin client registered. sending telemetry: ' + testTelemetryBody);
        return testComponent.sendTelemetry(testTelemetryBody);
      }).then(() => {
        debug('telemetry sent: ' + testTelemetryBody);
      }).catch((err) => {
        debug('error while testing telemetry: ' + err.toString());
        return closeClients(deviceClient, ehClient, done, err);
      });
  });
});
