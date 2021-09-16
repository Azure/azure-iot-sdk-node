// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
/*jshint esversion: 9 */

const Registry = require('azure-iothub').Registry;
const deviceMqtt = require('azure-iot-device-mqtt');
const DeviceIdentityHelper = require('./device_identity_helper.js');
const ClientPropertyCollection = require('azure-iot-device').ClientPropertyCollection;
const createDeviceClient = require('./testUtils.js').createDeviceClient;
const promisify = require('util').promisify;
const assert = require('chai').assert;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const servicePropertyUpdate = {
  fake: 'service update',
  nested: {
    number: 42
  }
};
const devicePropertyUpdate = {
  fake: 'device update',
  nested: {
    number: 11
  }
};

[
  DeviceIdentityHelper.createDeviceWithSas,
  DeviceIdentityHelper.createDeviceWithSymmetricKey,
  DeviceIdentityHelper.createDeviceWithX509SelfSignedCert,
  DeviceIdentityHelper.createDeviceWithX509CASignedCert
].forEach((createDeviceMethod) => {
  [deviceMqtt.Mqtt, deviceMqtt.MqttWs].forEach((deviceTransport) => {
    pnpGetPropertiesTests(deviceTransport, createDeviceMethod);
  });
});

function pnpGetPropertiesTests(deviceTransport, createDeviceMethod) {
  describe(`getClientProperties() over ${deviceTransport.name} using device client with ${createDeviceMethod.name} authentication`, function () {
    this.timeout(120000);
    let deviceInfo, deviceClient, registryClient;

    before(async function () {
      registryClient = Registry.fromConnectionString(connectionString);
      deviceInfo = await promisify(createDeviceMethod)();
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

    it('successfully gets the twin from the service', async function () {
      await registryClient.updateTwin(
        deviceInfo.deviceId,
        {properties: {desired: servicePropertyUpdate}},
        '*'
      );
      await deviceClient.updateClientProperties(new ClientPropertyCollection(devicePropertyUpdate));
      await new Promise(resolve => setTimeout(resolve, 3000));

      let clientProperties = await deviceClient.getClientProperties();

      assert.deepEqual(
        clientProperties.writablePropertiesRequests.backingObject,
        {$version: 2, ...servicePropertyUpdate}
      );

      assert.deepEqual(
        clientProperties.reportedFromDevice.backingObject,
        {$version: 2, ...devicePropertyUpdate}
      );
    });
  });
}