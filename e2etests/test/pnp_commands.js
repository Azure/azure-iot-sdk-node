// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const debug = require('debug')('e2etests:pnp_commands');
const ServiceClient = require('azure-iothub').Client;
const assert = require('chai').assert;
const runPnpTestSuite = require('./pnp_client_helper.js').runPnpTestSuite;
const createDeviceOrModuleClient = require('./client_creation_helper').createDeviceOrModuleClient;
const DeviceIdentityHelper = require('./device_identity_helper.js');

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
const commandName = 'fakeCommand';
const componentName = 'fakeComponent';
const requestPayload = {this: 'is the payload for the request'};
const responsePayload = {payload: 'for the response'};
const statusCode = 200;

runPnpTestSuite(pnpCommandsTests);

function pnpCommandsTests(transportCtor, authType, modelId, isModule) {
  describe(`PnP Commands over ${transportCtor.name} using ${isModule ? 'ModuleClient' : 'Client'} with ${authType} authentication`, function () {
    this.timeout(120000);
    let moduleId, deviceId, client, serviceClient;

    before(async function () {
      serviceClient = ServiceClient.fromConnectionString(hubConnectionString);
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

    it('It receives command requests to the default component', async function () {
      client.onCommand(commandName, (request, response) => {
        if (request.commandName !== commandName) {
          debug(`request.commandName ${request.commandName} doesn't match ${commandName}`);
        } else if (request.componentName) {
          debug(`request.commandName ${request.componentName} is not undefined`);
        } else if (JSON.stringify(request.payload) !== JSON.stringify(requestPayload)) {
          debug(`request.payload ${JSON.stringify(request.payload)} doesn't match ${JSON.stringify(requestPayload)}`);
        } else {
          response.send(statusCode, responsePayload).catch((err) => {
            debug(`response.send() failed with error ${err}`);
          });
        }
      });

      const response = await serviceClient.invokeDeviceMethod(
        deviceId,
        ...(isModule ? [moduleId] : []),
        {methodName: commandName, payload: requestPayload}
      );

      assert.strictEqual(response.result.status, statusCode);
      assert.deepEqual(response.result.payload, responsePayload);
    });

    it('It receives command requests to a component', async function () {
      client.onCommand(componentName, commandName, (request, response) => {
        if (request.commandName !== commandName) {
          debug(`request.commandName ${request.commandName} doesn't match ${commandName}`);
        } else if (request.componentName !== componentName) {
          debug(`request.commandName ${request.componentName} doesn't match ${componentName}`);
        } else if (JSON.stringify(request.payload) !== JSON.stringify(requestPayload)) {
          debug(`request.payload ${JSON.stringify(request.payload)} doesn't match ${JSON.stringify(requestPayload)}`);
        } else {
          response.send(statusCode, responsePayload).catch((err) => {
            debug(`response.send() failed with error ${err}`);
          });
        }
      });

      const response = await serviceClient.invokeDeviceMethod(
        deviceId,
        ...(isModule ? [moduleId] : []),
        {methodName: `${componentName}*${commandName}`, payload: requestPayload}
      );

      assert.strictEqual(response.result.status, statusCode);
      assert.deepEqual(response.result.payload, responsePayload);
    });
  });
}