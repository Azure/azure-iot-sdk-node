// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Registry = require('azure-iothub').Registry;
const DeviceIdentityHelper = require('./device_identity_helper.js');
const ClientPropertyCollection = require('azure-iot-device').ClientPropertyCollection;
const assert = require('chai').assert;
const runPnpTestSuite = require('./pnp_client_helper.js').runPnpTestSuite;
const createDeviceOrModuleClient = require('./client_creation_helper').createDeviceOrModuleClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const firstPropertyUpdate = { fake: 'payload' };
const secondPropertyUpdate = { other: 42 };
const thirdPropertyUpdate = { fake: null };

runPnpTestSuite(pnpPropertiesUpdateTests);

function pnpPropertiesUpdateTests(transportCtor, authType, modelId, isModule) {
  describe(`updateClientProperties() over ${transportCtor.name} using ${isModule ? 'ModuleClient' : 'Client'} with ${authType} authentication`, function () {
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

    it('updates properties and the service gets them', async function () {
      const getTwinFunc = registryClient[isModule ? 'getModuleTwin' : 'getTwin'].bind(registryClient, deviceId, isModule ? moduleId : undefined);

      await client.updateClientProperties(new ClientPropertyCollection(firstPropertyUpdate));
      await new Promise(resolve => setTimeout(resolve, 3000));
      let twinResponse = await getTwinFunc();
  
      assert.strictEqual(twinResponse.responseBody.properties.reported.fake, firstPropertyUpdate.fake);
      assert.strictEqual(twinResponse.responseBody.properties.reported.$version, 2);
  
      await client.updateClientProperties(new ClientPropertyCollection(secondPropertyUpdate));
      await new Promise(resolve => setTimeout(resolve, 3000));
      twinResponse = await getTwinFunc();

      assert.strictEqual(twinResponse.responseBody.properties.reported.fake, firstPropertyUpdate.fake);
      assert.strictEqual(twinResponse.responseBody.properties.reported.other, secondPropertyUpdate.other);
      assert.strictEqual(twinResponse.responseBody.properties.reported.$version, 3);

      await client.updateClientProperties(new ClientPropertyCollection(thirdPropertyUpdate));
      await new Promise(resolve => setTimeout(resolve, 3000));
      twinResponse = await getTwinFunc();
      
      assert.isUndefined(twinResponse.responseBody.properties.reported.fake);
      assert.strictEqual(twinResponse.responseBody.properties.reported.other, secondPropertyUpdate.other);
      assert.strictEqual(twinResponse.responseBody.properties.reported.$version, 4);
    });
  });
}