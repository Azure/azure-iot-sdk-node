// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The `azure-iot-provisioning-device` module provides access to the Azure Device Provisioning Service.
 *
 * @module azure-iot-provisioning-device
 * @requires module:azure-iot-common
 */

module.exports = {
  ProvisioningTransportOptions: require('./lib/interfaces').ProvisioningTransportOptions,
  RegistrationRequest: require('./lib/interfaces').RegistrationRequest,
  RegistrationResult: require('./lib/interfaces').RegistrationResult,
  DeviceRegistrationResult: require('./lib/interfaces').DeviceRegistrationResult,
  X509ProvisioningTransport: require('./lib/interfaces').X509ProvisioningTransport,
  SymmetricKeyProvisioningTransport: require('./lib/interfaces').SymmetricKeyProvisioningTransport,
  PollingStateMachine: require('./lib/polling_state_machine').PollingStateMachine,
  ProvisioningDeviceClient: require('./lib/client').ProvisioningDeviceClient,
  ProvisioningDeviceConstants: require('./lib/constants').ProvisioningDeviceConstants,
  translateError: require('./lib/provisioning_errors').translateError
};