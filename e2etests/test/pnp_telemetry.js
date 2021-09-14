// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const debug = require('debug')('e2etests:pnp_telemetry');

const DeviceIdentityHelper = require('./device_identity_helper.js');
const createDeviceClient = require('./testUtils.js').createDeviceClient;
const closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;
const Rendezvous = require('./rendezvous_helper').Rendezvous;
const EventHubClient = require('@azure/event-hubs').EventHubClient;
const EventPosition = require('@azure/event-hubs').EventPosition;

const deviceMqtt = require('azure-iot-device-mqtt');

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
const componentName = 'fakeComponent';

[
  DeviceIdentityHelper.createDeviceWithSas,
  DeviceIdentityHelper.createDeviceWithSymmetricKey,
  DeviceIdentityHelper.createDeviceWithX509SelfSignedCert,
  DeviceIdentityHelper.createDeviceWithX509CASignedCert
].forEach((createDeviceMethod) => {
  [deviceMqtt.Mqtt, deviceMqtt.MqttWs].forEach((deviceTransport) => {
    pnpTelemetryTests(deviceTransport, createDeviceMethod);
  });
});

function pnpTelemetryTests(deviceTransport, createDeviceMethod) {
  describe(`sendTelemetry() over ${deviceTransport.name} using device client with ${createDeviceMethod.name} authentication`, function () {
    this.timeout(120000);

    let provisionedDevice, deviceClient, ehClient;

    before(function (beforeCallback) {
      createDeviceMethod(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
    });

    beforeEach(function () {
      deviceClient = createDeviceClient(deviceTransport, provisionedDevice);
    });

    afterEach(function (done) {
      closeDeviceEventHubClients(deviceClient, ehClient, done);
    });

    it('sends a telemetry message with a component name and the service sees the message with the correct component name, content type, and content encoding', function (done) {
      const rdv =  new Rendezvous(done);
      const startAfterTime = Date.now() - 5000;

      const onEventHubMessage = function (eventData) {
        if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
          if (eventData.properties.content_type !== 'application/json') {
            debug(`eventData.properties.content_type "${eventData.properties.content_type}" doesn't match "application/json"`);
          } else if (eventData.properties.content_encoding !== 'utf-8') {
            debug(`eventData.properties.content_encoding "${eventData.properties.content_encoding}" doesn't match "utf-8"`);
          } else if (eventData.annotations['dt-subject'] !== componentName) {
            debug(`eventData.annotations['dt-subject'] "${eventData.annotations['dt-subject']}" doesn't match ${componentName}`);
          } else if (JSON.stringify(eventData.body) !== JSON.stringify({fake: 'payload'})) {
            debug(`eventData.body "${JSON.stringify(eventData.body)}" doesn't match "${JSON.stringify({fake: 'payload'})}"`);
          } else {
            debug('trying to finish from the receiving side');
            rdv.imDone('ehClient');
          }
        } else {
          debug(`Incoming device id is: ${eventData.annotations['iothub-connection-device-id']}`);
        }
      };

      const onEventHubError = function (err) {
        debug(`Error from Event Hub Client Receiver: ${err}`);
        done(err);
      };

      EventHubClient.createFromIotHubConnectionString(hubConnectionString).then(function (client) {
        ehClient = client;
        rdv.imIn('ehClient');
        return ehClient.getPartitionIds();
      }).then(function (partitionIds) {
        partitionIds.forEach(function (partitionId) {
          ehClient.receive(partitionId, onEventHubMessage, onEventHubError, { eventPosition: EventPosition.fromEnqueuedTime(startAfterTime) });
        });
        return new Promise(function (resolve) {
          setTimeout(resolve, 3000);
        });
      }).then(function () {
        deviceClient.open(function (openErr) {
          rdv.imIn('deviceClient');
          if (openErr) {
            done(openErr);
          } else {
            deviceClient.sendTelemetry({fake: 'payload'}, componentName, function (sendErr) {
              if (sendErr) {
                done(sendErr);
              }
              debug('trying to finish from the sending side');
              rdv.imDone('deviceClient');
            });
          }
        });
      })
      .catch(function (err) {
        debug(`Error thrown by Event Hubs client: ${err}`);
        done(err);
      });
    });

    it('sends a telemetry message without a component name and the service sees the message with the correct component name, content type, and content encoding', function (done) {
      const rdv =  new Rendezvous(done);
      const startAfterTime = Date.now() - 5000;

      const onEventHubMessage = function (eventData) {
        if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
          if (eventData.properties.content_type !== 'application/json') {
            debug(`eventData.properties.content_type "${eventData.properties.content_type}" doesn't match "application/json"`);
          } else if (eventData.properties.content_encoding !== 'utf-8') {
            debug(`eventData.properties.content_encoding "${eventData.properties.content_encoding}" doesn't match "utf-8"`);
          } else if (eventData.annotations['dt-subject']) {
            debug(`eventData.annotations['dt-subject'] "${eventData.annotations['dt-subject']}" should be undefined`);
          } else if (JSON.stringify(eventData.body) !== JSON.stringify({fake: 'payload'})) {
            debug(`eventData.body "${JSON.stringify(eventData.body)}" doesn't match "${JSON.stringify({fake: 'payload'})}"`);
          } else {
            debug('trying to finish from the receiving side');
            rdv.imDone('ehClient');
          }
        } else {
          debug(`Incoming device id is: ${eventData.annotations['iothub-connection-device-id']}`);
        }
      };

      const onEventHubError = function (err) {
        debug(`Error from Event Hub Client Receiver: ${err}`);
        done(err);
      };

      EventHubClient.createFromIotHubConnectionString(hubConnectionString).then(function (client) {
        ehClient = client;
        rdv.imIn('ehClient');
        return ehClient.getPartitionIds();
      }).then(function (partitionIds) {
        partitionIds.forEach(function (partitionId) {
          ehClient.receive(partitionId, onEventHubMessage, onEventHubError, { eventPosition: EventPosition.fromEnqueuedTime(startAfterTime) });
        });
        return new Promise(function (resolve) {
          setTimeout(resolve, 3000);
        });
      }).then(function () {
        deviceClient.open(function (openErr) {
          rdv.imIn('deviceClient');
          if (openErr) {
            done(openErr);
          } else {
            deviceClient.sendTelemetry({fake: 'payload'}, function (sendErr) {
              if (sendErr) {
                done(sendErr);
              }
              debug('trying to finish from the sending side');
              rdv.imDone('deviceClient');
            });
          }
        });
      })
      .catch(function (err) {
        debug(`Error thrown by Event Hubs client: ${err}`);
        done(err);
      });
    });
  });
}