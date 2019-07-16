// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const debug = require('debug')('e2etests:digitaltwin_telemetry');
const uuid = require('uuid');

const Registry = require('azure-iothub').Registry;
const EventHubClient = require('@azure/event-hubs').EventHubClient;
const EventPosition = require('@azure/event-hubs').EventPosition;
const DigitalTwinDeviceClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const DeviceClient = require('azure-iot-device').Client;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const ServiceConnectionString = require('azure-iothub').ConnectionString;
const DeviceSas = require('azure-iot-device').SharedAccessSignature;
const TestComponent = require('./test_component').TestComponent;

const createModel = require('./model_repository_helper').createModel;

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
        debug('create or update test capability model: ' + capabilityModelDocument['@id']);
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
    let testComponent;

    // test device client
    const deviceSasExpiry = Math.floor(new Date() / 1000) + 3600;
    const deviceSas = DeviceSas.create(hubHostName, createdDevice.deviceId, createdDevice.authentication.symmetricKey.primaryKey, deviceSasExpiry);
    const deviceClient = DeviceClient.fromSharedAccessSignature(deviceSas, Mqtt);
    const digitalTwinClient = new DigitalTwinDeviceClient(capabilityModelDocument['@id'], deviceClient);

    const closeClients = function (deviceClient, ehClient, err) {
      debug('closing device and event hubs clients');
      return Promise.all([
        deviceClient.close(),
        ehClient.close()
      ]).then(() => {
        debug('device client and event hubs client closed');
        return done(err);
      }).catch((closeErr)=> {
        debug('error closing clients: ' + closeErr.toString());
        return done(err || closeErr);
      });
    };

    const onEventHubMessage = function (eventData) {
      if (eventData.annotations['iothub-connection-device-id'] === createdDevice.deviceId) {
        debug('received a message from the test device: ');
        debug(JSON.stringify(eventData.body));
        if (eventData.body.telemetry && eventData.body.telemetry === testTelemetryBody) {
          debug('found telemetry message from test device. test successful.');
          closeClients(deviceClient, ehClient);
        }
      } else {
        debug('Incoming device id is: ' + eventData.annotations['iothub-connection-device-id']);
      }
    };

    const onEventHubError = function (err) {
      debug('Error from Event Hub Client Receiver: ' + err.toString());
      closeClients(deviceClient, ehClient, err);
    };

    debug('event hubs client: creating...');
    EventHubClient.createFromIotHubConnectionString(hubConnectionString)
      .then(function (client) {
        debug('event hubs client: created');
        ehClient = client;
        debug('event hubs client: getting partition ids...');
        return ehClient.getPartitionIds();
      })
      .then(function (partitionIds) {
        debug('event hubs client: got ' + partitionIds.length + ' partition ids');
        partitionIds.forEach(function (partitionId) {
          debug('event hubs client: creating receiver for partition: ' + partitionId);
          ehClient.receive(partitionId, onEventHubMessage, onEventHubError, { eventPosition: EventPosition.fromEnqueuedTime(startAfterTime) });
        });
        return new Promise(function (resolve) {
          debug('event hubs client: waiting 3 seconds to get everything setup before starting the digital twin client...');
          setTimeout(function () {
            debug('event hubs client: setup finished.');
            resolve();
          }, 3000);
        });
      })
      .then(function () {
        debug('creating test component');
        testComponent = new TestComponent('testComponent', function () {}, function () {});
        digitalTwinClient.addComponent(testComponent);
        debug('registering digital twin client with test component');
        return digitalTwinClient.register();
      }).then(function () {
        debug('digital twin client registered. sending telemetry: ' + testTelemetryBody);
        return testComponent.telemetry.send(testTelemetryBody);
      }).then(() => {
        debug('telemetry sent: ' + testTelemetryBody);
      }).catch((err) => {
        debug('error while testing telemetry: ' + err.toString());
        return closeClients(deviceClient, ehClient, err);
      });
  });
});
