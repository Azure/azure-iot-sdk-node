// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const authTypes = require('./client_creation_helper.js').authTypes;
const deviceMqtt = require('azure-iot-device-mqtt');

async function runPnpTestSuite(testSuite) {
  [true, false].forEach((isModule) => {
    [deviceMqtt.Mqtt, deviceMqtt.MqttWs].forEach((transportCtor) => {
      [
        authTypes.SAS,
        authTypes.SYMMETRIC_KEY,
        ...(isModule ? [] : [authTypes.X509_CA_SIGNED, authTypes.X509_SELF_SIGNED])
      ].forEach((authType) => {
        testSuite(transportCtor, authType, 'dtmi:com:example:Thermostat;1', isModule);
      });
    });
  });
}

module.exports = {
  runPnpTestSuite
};