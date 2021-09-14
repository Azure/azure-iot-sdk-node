// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const DeviceIdentityHelper = require('./device_identity_helper.js');
const createDeviceClient = require('./testUtils.js').createDeviceClient;
const assert = require('chai').assert;

const deviceMqtt = require('azure-iot-device-mqtt');
const IoTHubTokenCredentials = require('azure-iothub').IoTHubTokenCredentials;
const DigitalTwinClient = require('azure-iothub').DigitalTwinClient;

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
const modelId = 'dtmi:com:example:Thermostat;1';

[
  DeviceIdentityHelper.createDeviceWithSas,
  DeviceIdentityHelper.createDeviceWithSymmetricKey,
  DeviceIdentityHelper.createDeviceWithX509SelfSignedCert,
  DeviceIdentityHelper.createDeviceWithX509CASignedCert
].forEach((createDeviceMethod) => {
  [deviceMqtt.Mqtt, deviceMqtt.MqttWs].forEach((deviceTransport) => {
    pnpConnectTests(deviceTransport, createDeviceMethod);
  });
});

function pnpConnectTests(deviceTransport, createDeviceMethod) {
  describe(`Connect with model ID over ${deviceTransport.name} using device client with ${createDeviceMethod.name} authentication`, function () {
    this.timeout(60000);

    let provisionedDevice, deviceClient, digitalTwinClient;

    before(function (beforeCallback) {
      digitalTwinClient = new DigitalTwinClient(new IoTHubTokenCredentials(hubConnectionString));
      createDeviceMethod(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
    });

    beforeEach(async function () {
      deviceClient = createDeviceClient(deviceTransport, provisionedDevice, modelId);
      await deviceClient.open();
    });

    afterEach(async function () {
      await deviceClient.close();
    });

    it('connects to the Hub with the model name', async function () {
      const digitalTwin = await digitalTwinClient.getDigitalTwin(provisionedDevice.deviceId);
      assert.strictEqual(digitalTwin.$metadata.$model, modelId);
    });
  });
}