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
  ProvisioningTransportOptions: require('./dist/interfaces').ProvisioningTransportOptions,
  RegistrationRequest: require('./dist/interfaces').RegistrationRequest,
  RegistrationResult: require('./dist/interfaces').RegistrationResult,
  DeviceRegistrationResult: require('./dist/interfaces').DeviceRegistrationResult,
  X509ProvisioningTransport: require('./dist/interfaces').X509ProvisioningTransport,
  SymmetricKeyProvisioningTransport: require('./dist/interfaces').SymmetricKeyProvisioningTransport,
  PollingStateMachine: require('./dist/polling_state_machine').PollingStateMachine,
  ProvisioningDeviceClient: require('./dist/client').ProvisioningDeviceClient,
  ProvisioningDeviceConstants: require('./dist/constants').ProvisioningDeviceConstants,
  translateError: require('./dist/provisioning_errors').translateError,
  DeviceRegistration: require('./dist/interfaces').DeviceRegistration,
  TpmAttestation: require('./dist/interfaces').TpmAttestation
};