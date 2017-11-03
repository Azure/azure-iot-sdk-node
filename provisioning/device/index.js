// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Interface = require('./lib/interfaces');

/**
 * The `azure-iot-provisioning-device` module provides access to the Azure Device Provisoning Service.
 *
 * @module azure-iot-provisioning-device
 * @requires module:azure-iot-common
 */

module.exports = {
  ResponseCallback: Interface.ResponseCallback,
  TransportHandlers: Interface.TransportHandlers,
  Authentication: Interface.Authentication,
  DeviceConfiguration: Interface.DeviceConfiguration,
  ClientConfiguration: Interface.ClientConfiguration,
  ClientStateMachine: require('./lib/client_state_machine').ClientStateMachine,
  ProvisioningDeviceClient: require('./lib/client').ProvisioningDeviceClient,
};