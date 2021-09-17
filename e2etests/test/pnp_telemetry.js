// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const debug = require('debug')('e2etests:pnp_telemetry');

const DeviceIdentityHelper = require('./device_identity_helper.js');
const Rendezvous = require('./rendezvous_helper').Rendezvous;
const EventHubReceiverHelper = require('./eventhub_receiver_helper');
const runPnpTestSuite = require('./pnp_client_helper.js').runPnpTestSuite;
const createDeviceOrModuleClient = require('./client_creation_helper').createDeviceOrModuleClient;
const promisify = require('util').promisify;

const componentName = 'fakeComponent';

runPnpTestSuite(pnpTelemetryTests);

function pnpTelemetryTests(transportCtor, authType, modelId, isModule) {
  describe(`sendTelemetry() over ${transportCtor.name} using ${isModule ? 'ModuleClient' : 'Client'} with ${authType} authentication`, function () {
    this.timeout(120000);

    let deviceId, client, ehReceiver;

    before(async function () {
      ({ deviceId, client } = await createDeviceOrModuleClient(transportCtor, authType, modelId, isModule));
      ehReceiver = new EventHubReceiverHelper();
      await (promisify(ehReceiver.openClient).bind(ehReceiver))();
      await new Promise(resolve => setTimeout(resolve, 3000));
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(deviceId, (deleteErr) => {
        ehReceiver.closeClient((closeErr) => {
          afterCallback(deleteErr || closeErr);
        });
      });
    });

    beforeEach(async function () {
      await client.open();
    });

    afterEach(async function () {
      await client.close();
      ehReceiver.removeAllListeners('error');
      ehReceiver.removeAllListeners('message');
    });

    it('sends a telemetry message with a component name and the service sees the message with the correct component name, content type, and content encoding', function (done) {
      const rdv = new Rendezvous(done);
      rdv.imIn('ehReceiver');
      rdv.imIn('client');
      ehReceiver.on('error', done);
      ehReceiver.on('message', (eventData) => {
        if (eventData.annotations['iothub-connection-device-id'] !== deviceId) {
          debug(
            `eventData.annotations['iothub-connection-device-id'] "${eventData.annotations['iothub-connection-device-id']}" doesn't match "${deviceId}"`
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

      client.sendTelemetry({fake: 'payload'}, componentName, (err) => {
        if (err) {
          done(err);
          return;
        }
        rdv.imDone('client');
      });
    });

    it('sends a telemetry message without a component name and the service sees the message with the correct component name, content type, and content encoding', function (done) {
      const rdv = new Rendezvous(done);
      rdv.imIn('ehReceiver');
      rdv.imIn('client');
      ehReceiver.on('error', done);
      ehReceiver.on('message', (eventData) => {
        if (eventData.annotations['iothub-connection-device-id'] !== deviceId) {
          debug(
            `eventData.annotations['iothub-connection-device-id'] "${eventData.annotations['iothub-connection-device-id']}" doesn't match "${deviceId}"`
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

      client.sendTelemetry({fake: 'payload'}, (err) => {
        if (err) {
          done(err);
          return;
        }
        rdv.imDone('client');
      });
    });
  });
}