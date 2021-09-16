// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const debug = require('debug')('e2etests:pnp_telemetry');

const DeviceIdentityHelper = require('./device_identity_helper.js');
const createDeviceClient = require('./testUtils.js').createDeviceClient;
const Rendezvous = require('./rendezvous_helper').Rendezvous;
const EventHubReceiverHelper = require('./eventhub_receiver_helper');

const deviceMqtt = require('azure-iot-device-mqtt');

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

    let deviceInfo, deviceClient, ehReceiver;

    before(function (beforeCallback) {
      createDeviceMethod(function (err, testDeviceInfo) {
        if (err) {
          beforeCallback(err);
          return;
        }
        deviceInfo = testDeviceInfo;
        ehReceiver = new EventHubReceiverHelper();
        ehReceiver.openClient(function (err) {
          if (err) {
            beforeCallback(err);
            return;
          }
          setTimeout(beforeCallback, 3000);
        });
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(deviceInfo.deviceId, (deleteErr) => {
        ehReceiver.closeClient((closeErr) => {
          afterCallback(deleteErr || closeErr);
        });
      });
    });

    beforeEach(async function () {
      deviceClient = createDeviceClient(deviceTransport, deviceInfo);
      await deviceClient.open();
    });

    afterEach(async function () {
      await deviceClient.close();
      ehReceiver.removeAllListeners('error');
      ehReceiver.removeAllListeners('message');
    });

    it('sends a telemetry message with a component name and the service sees the message with the correct component name, content type, and content encoding', function (done) {
      const rdv = new Rendezvous(done);
      rdv.imIn('ehReceiver');
      rdv.imIn('deviceClient');
      ehReceiver.on('error', done);
      ehReceiver.on('message', (eventData) => {
        if (eventData.annotations['iothub-connection-device-id'] !== deviceInfo.deviceId) {
          debug(
            `eventData.annotations['iothub-connection-device-id'] "${eventData.annotations['iothub-connection-device-id']}" doesn't match "${deviceInfo.deviceId}"`
          );
        } else if (eventData.properties.content_type !== 'application/json') {
          debug(
            `eventData.properties.content_type "${eventData.properties.content_type}" doesn't match "application/json"`
          );
        } else if (eventData.properties.content_encoding !== 'utf-8') {
          debug(
            `eventData.properties.content_encoding "${eventData.properties.content_encoding}" doesn't match "utf-8"`
          );
        } else if (eventData.annotations['dt-subject'] !== componentName) {
          debug(
            `eventData.annotations['dt-subject'] "${eventData.annotations['dt-subject']}" doesn't match ${componentName}`
          );
        } else if (JSON.stringify(eventData.body) !== JSON.stringify({fake: 'payload'})) {
          debug(
            `eventData.body "${JSON.stringify(eventData.body)}" doesn't match "${JSON.stringify({fake: 'payload'})}"`
          );
        } else {
          rdv.imDone('ehReceiver');
        }
      });

      deviceClient.sendTelemetry({fake: 'payload'}, componentName, (err) => {
        if (err) {
          done(err);
          return;
        }
        rdv.imDone('deviceClient');
      });
    });

    it('sends a telemetry message without a component name and the service sees the message with the correct component name, content type, and content encoding', function (done) {
      const rdv = new Rendezvous(done);
      rdv.imIn('ehReceiver');
      rdv.imIn('deviceClient');
      ehReceiver.on('error', done);
      ehReceiver.on('message', (eventData) => {
        if (eventData.annotations['iothub-connection-device-id'] !== deviceInfo.deviceId) {
          debug(
            `eventData.annotations['iothub-connection-device-id'] "${eventData.annotations['iothub-connection-device-id']}" doesn't match "${deviceInfo.deviceId}"`
          );
        } else if (eventData.properties.content_type !== 'application/json') {
          debug(
            `eventData.properties.content_type "${eventData.properties.content_type}" doesn't match "application/json"`
          );
        } else if (eventData.properties.content_encoding !== 'utf-8') {
          debug(
            `eventData.properties.content_encoding "${eventData.properties.content_encoding}" doesn't match "utf-8"`
          );
        } else if (eventData.annotations['dt-subject']) {
          debug(`eventData.annotations['dt-subject'] "${eventData.annotations['dt-subject']}" should be undefined`);
        } else if (JSON.stringify(eventData.body) !== JSON.stringify({fake: 'payload'})) {
          debug(
            `eventData.body "${JSON.stringify(eventData.body)}" doesn't match "${JSON.stringify({fake: 'payload'})}"`
          );
        } else {
          rdv.imDone('ehReceiver');
        }
      });

      deviceClient.sendTelemetry({fake: 'payload'}, (err) => {
        if (err) {
          done(err);
          return;
        }
        rdv.imDone('deviceClient');
      });
    });
  });
}