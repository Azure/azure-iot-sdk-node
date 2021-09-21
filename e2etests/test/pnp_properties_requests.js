// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Registry = require('azure-iothub').Registry;
const DeviceIdentityHelper = require('./device_identity_helper.js');
const assert = require('chai').assert;
const runPnpTestSuite = require('./pnp_client_helper.js').runPnpTestSuite;
const createDeviceOrModuleClient = require('./client_creation_helper').createDeviceOrModuleClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const firstPropertyUpdate = { fake: 'payload' };
const secondPropertyUpdate = { fake: null };

runPnpTestSuite(pnpPropertiesRequestsTests);

function pnpPropertiesRequestsTests(transportCtor, authType, modelId, isModule) {
  describe(`onWritablePropertyUpdateRequest() over ${transportCtor.name} using ${isModule ? 'ModuleClient' : 'Client'} with ${authType} authentication`, function () {
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

    it('receives writable property update requests and calls the listener', async function () {
      let propertiesPromise = new Promise(resolve => client.onWritablePropertyUpdateRequest(resolve));
      const updateTwinFunc = registryClient[isModule ? 'updateModuleTwin' : 'updateTwin'].bind(registryClient, deviceId, ...(isModule ? [moduleId] : []));

      const updateResult = await updateTwinFunc({properties: {desired: firstPropertyUpdate}}, '*');
      let properties = await propertiesPromise;
      assert.strictEqual(properties.backingObject.fake, firstPropertyUpdate.fake);
      assert.strictEqual(properties.version, 2);

      propertiesPromise = new Promise(resolve => client.onWritablePropertyUpdateRequest(resolve));
      await updateTwinFunc({properties: {desired: secondPropertyUpdate}}, updateResult.responseBody.etag);
      properties = await propertiesPromise;
      assert.isNull(properties.backingObject.fake);
      assert.strictEqual(properties.version, 3);
    });
  });
}