// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The `azure-iot-provisioning-device` module provides access to the Azure Device Provisoning Service.
 *
 * @module azure-iot-provisioning-device
 * @requires module:azure-iot-common
 */

module.exports = {
  PollingTransportHandlers: require('./lib/interfaces').PollingTransportHandlers,
  ProvisioningTransportOptions: require('./lib/interfaces').ProvisioningTransportOptions,
  ProvisioningAuthentication: require('./lib/interfaces').ProvisioningAuthentication,
  ProvisioningDeviceConfiguration: require('./lib/interfaces').ProvisioningDeviceConfiguration,
  ProvisioningTransportHandlersBase: require('./lib/interfaces').ProvisioningTransportHandlersBase,
  ProvisioningTransportHandlersX509: require('./lib/interfaces').ProvisioningTransportHandlersX509,
  PollingStateMachine: require('./lib/polling_state_machine').PollingStateMachine,
  ProvisioningDeviceClient: require('./lib/client').ProvisioningDeviceClient,
  ProvisioningDeviceConstants: require('./lib/constants').ProvisioningDeviceConstants,
};