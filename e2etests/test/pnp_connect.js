// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const DeviceIdentityHelper = require('./device_identity_helper.js');
const assert = require('chai').assert;
const runPnpTestSuite = require('./pnp_client_helper.js').runPnpTestSuite;
const createDeviceOrModuleClient = require('./client_creation_helper').createDeviceOrModuleClient;

const Registry = require('azure-iothub').Registry;

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

runPnpTestSuite(pnpConnectTests);

function pnpConnectTests(transportCtor, authType, modelId, isModule) {
  describe(`Connect with model ID ${modelId} over ${transportCtor.name} using ${isModule ? 'ModuleClient' : 'Client'} with ${authType} authentication`, function () {
    this.timeout(60000);

    let moduleId, deviceId, client, registryClient;

    before(async function () {
      registryClient = Registry.fromConnectionString(hubConnectionString);
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

    it('connects to the Hub with the model name', async function () {
      const getTwinFunc = registryClient[isModule ? 'getModuleTwin' : 'getTwin'].bind(registryClient, deviceId, isModule ? moduleId : undefined);
      const twinResponse = await getTwinFunc();
      assert.strictEqual(twinResponse.responseBody.modelId, modelId);
    });
  });
}