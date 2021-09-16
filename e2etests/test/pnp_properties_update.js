// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Registry = require('azure-iothub').Registry;
const deviceMqtt = require('azure-iot-device-mqtt');
const DeviceIdentityHelper = require('./device_identity_helper.js');
const ClientPropertyCollection = require('azure-iot-device').ClientPropertyCollection;
const createDeviceClient = require('./testUtils.js').createDeviceClient;
const assert = require('chai').assert;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const firstPropertyUpdate = { fake: 'payload' };
const secondPropertyUpdate = { other: 42 };
const thirdPropertyUpdate = { fake: null };

[
  DeviceIdentityHelper.createDeviceWithSas,
  DeviceIdentityHelper.createDeviceWithSymmetricKey,
  DeviceIdentityHelper.createDeviceWithX509SelfSignedCert,
  DeviceIdentityHelper.createDeviceWithX509CASignedCert
].forEach((createDeviceMethod) => {
  [deviceMqtt.Mqtt, deviceMqtt.MqttWs].forEach((deviceTransport) => {
    pnpPropertiesUpdateTests(deviceTransport, createDeviceMethod);
  });
});

function pnpPropertiesUpdateTests(deviceTransport, createDeviceMethod) {
  describe(`updateClientProperties() over ${deviceTransport.name} using device client with ${createDeviceMethod.name} authentication`, function () {
    this.timeout(120000);
    let deviceInfo, deviceClient, registryClient;

    before(function (beforeCallback) {
      registryClient = Registry.fromConnectionString(connectionString);
      createDeviceMethod(function (err, testDeviceInfo) {
        deviceInfo = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(deviceInfo.deviceId, afterCallback);
    });

    beforeEach(async function () {
      deviceClient = createDeviceClient(deviceTransport, deviceInfo);
      await deviceClient.open();
    });
  
    afterEach(async function () {
      await deviceClient.close();
    });

    it('updates properties and the service gets them', async function () {
      await deviceClient.updateClientProperties(new ClientPropertyCollection(firstPropertyUpdate));
      await new Promise(resolve => setTimeout(resolve, 3000));
      let twinResponse = await registryClient.getTwin(deviceInfo.deviceId);
  
      assert.strictEqual(twinResponse.responseBody.properties.reported.fake, firstPropertyUpdate.fake);
      assert.strictEqual(twinResponse.responseBody.properties.reported.$version, 2);
  
      await deviceClient.updateClientProperties(new ClientPropertyCollection(secondPropertyUpdate));
      await new Promise(resolve => setTimeout(resolve, 3000));
      twinResponse = await registryClient.getTwin(deviceInfo.deviceId);

      assert.strictEqual(twinResponse.responseBody.properties.reported.fake, firstPropertyUpdate.fake);
      assert.strictEqual(twinResponse.responseBody.properties.reported.other, secondPropertyUpdate.other);
      assert.strictEqual(twinResponse.responseBody.properties.reported.$version, 3);

      await deviceClient.updateClientProperties(new ClientPropertyCollection(thirdPropertyUpdate));
      await new Promise(resolve => setTimeout(resolve, 3000));
      twinResponse = await registryClient.getTwin(deviceInfo.deviceId);
      
      assert.isUndefined(twinResponse.responseBody.properties.reported.fake);
      assert.strictEqual(twinResponse.responseBody.properties.reported.other, secondPropertyUpdate.other);
      assert.strictEqual(twinResponse.responseBody.properties.reported.$version, 4);
    });
  });
}