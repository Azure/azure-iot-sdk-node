// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
/*jshint esversion: 9 */

const Registry = require('azure-iothub').Registry;
const DeviceIdentityHelper = require('./device_identity_helper.js');
const ClientPropertyCollection = require('azure-iot-device').ClientPropertyCollection;
const assert = require('chai').assert;
const runPnpTestSuite = require('./pnp_client_helper.js').runPnpTestSuite;
const createDeviceOrModuleClient = require('./client_creation_helper').createDeviceOrModuleClient;

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

runPnpTestSuite(pnpGetPropertiesTests);

function pnpGetPropertiesTests(transportCtor, authType, modelId, isModule) {
  describe(`getClientProperties() over ${transportCtor.name} using ${isModule ? 'ModuleClient' : 'Client'} with ${authType} authentication`, function () {
    this.timeout(120000);
    let moduleId, deviceId, client, registryClient;

    before(async function () {
      registryClient = Registry.fromConnectionString(connectionString);
      ({ moduleId, deviceId, client } = await createDeviceOrModuleClient(transportCtor, authType, modelId, isModule));
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(deviceId, afterCallback);
    });

    beforeEach(async function () {
      await client.open();
    });
  
    afterEach(async function () {
      await client.close();
    });

    it('successfully gets the twin from the service', async function () {
      const updateTwinFunc = registryClient[isModule ? 'updateModuleTwin' : 'updateTwin'].bind(registryClient, deviceId, ...(isModule ? [moduleId] : []));
      await updateTwinFunc({properties: {desired: servicePropertyUpdate}}, '*');
      await client.updateClientProperties(new ClientPropertyCollection(devicePropertyUpdate));
      await new Promise(resolve => setTimeout(resolve, 3000));

      const clientProperties = await client.getClientProperties();

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