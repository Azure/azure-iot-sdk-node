// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Registry = require('azure-iothub').Registry;
const deviceMqtt = require('azure-iot-device-mqtt');
const DeviceIdentityHelper = require('./device_identity_helper.js');
const createDeviceClient = require('./testUtils.js').createDeviceClient;
const assert = require('chai').assert;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const firstPropertyUpdate = { fake: 'payload' };
const secondPropertyUpdate = { fake: null };

[
  DeviceIdentityHelper.createDeviceWithSas,
  DeviceIdentityHelper.createDeviceWithSymmetricKey,
  DeviceIdentityHelper.createDeviceWithX509SelfSignedCert,
  DeviceIdentityHelper.createDeviceWithX509CASignedCert
].forEach((createDeviceMethod) => {
  [deviceMqtt.Mqtt, deviceMqtt.MqttWs].forEach((deviceTransport) => {
    pnpPropertiesRequestsTests(deviceTransport, createDeviceMethod);
  });
});

function pnpPropertiesRequestsTests(deviceTransport, createDeviceMethod) {
  describe(`onWritablePropertyUpdateRequest() over ${deviceTransport.name} using device client with ${createDeviceMethod.name} authentication`, function () {
    this.timeout(120000);
    let provisionedDevice, deviceClient, registryClient;

    before(function (beforeCallback) {
      registryClient = Registry.fromConnectionString(connectionString);
      createDeviceMethod(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
    });

    beforeEach(async function () {
      deviceClient = createDeviceClient(deviceTransport, provisionedDevice);
      await deviceClient.open();
    });
  
    afterEach(async function () {
      await deviceClient.close();
    });

    it('receives writable property update requests and calls the listener', async function () {
      let propertiesPromise = new Promise(resolve => deviceClient.onWritablePropertyUpdateRequest(resolve));
      const updateResult = await registryClient.updateTwin(
        provisionedDevice.deviceId,
        {properties: {desired: firstPropertyUpdate}},
        '*'
      );
      let properties = await propertiesPromise;
      assert.strictEqual(properties.backingObject.fake, firstPropertyUpdate.fake);
      assert.strictEqual(properties.version, 2);

      propertiesPromise = new Promise(resolve => deviceClient.onWritablePropertyUpdateRequest(resolve));
      await registryClient.updateTwin(
        provisionedDevice.deviceId,
        {properties: {desired: secondPropertyUpdate}},
        updateResult.responseBody.etag
      );
      properties = await propertiesPromise;
      assert.isNull(properties.backingObject.fake);
      assert.strictEqual(properties.version, 3);
    });
  });
}