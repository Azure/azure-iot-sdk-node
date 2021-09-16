// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const debug = require('debug')('e2etests:pnp_commands');
const ServiceClient = require('azure-iothub').Client;
const deviceMqtt = require('azure-iot-device-mqtt');
const DeviceIdentityHelper = require('./device_identity_helper.js');
const createDeviceClient = require('./testUtils.js').createDeviceClient;
const assert = require('chai').assert;
const promisify = require('util').promisify;

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
const commandName = 'fakeCommand';
const componentName = 'fakeComponent';
const requestPayload = {this: 'is the payload for the request'};
const responsePayload = {payload: 'for the response'};
const statusCode = 200;

[
  DeviceIdentityHelper.createDeviceWithSas,
  DeviceIdentityHelper.createDeviceWithSymmetricKey,
  DeviceIdentityHelper.createDeviceWithX509SelfSignedCert,
  DeviceIdentityHelper.createDeviceWithX509CASignedCert
].forEach((createDeviceMethod) => {
  [deviceMqtt.Mqtt, deviceMqtt.MqttWs].forEach((deviceTransport) => {
    pnpCommandsTests(deviceTransport, createDeviceMethod);
  });
});

function pnpCommandsTests(deviceTransport, createDeviceMethod) {
  describe(`PnP Commands over ${deviceTransport.name} using device client with ${createDeviceMethod.name} authentication`, function () {
    this.timeout(120000);
    let deviceInfo, deviceClient, serviceClient;

    before(async function () {
      serviceClient = ServiceClient.fromConnectionString(hubConnectionString);
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

    it('It receives command requests to the default component', async function () {
      deviceClient.onCommand(commandName, (request, response) => {
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
        deviceInfo.deviceId,
        {methodName: commandName, payload: requestPayload}
      );

      assert.strictEqual(response.result.status, statusCode);
      assert.deepEqual(response.result.payload, responsePayload);
    });

    it('It receives command requests to a component', async function () {
      deviceClient.onCommand(componentName, commandName, (request, response) => {
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
        deviceInfo.deviceId,
        {methodName: `${componentName}*${commandName}`, payload: requestPayload}
      );

      assert.strictEqual(response.result.status, statusCode);
      assert.deepEqual(response.result.payload, responsePayload);
    });
  });
}