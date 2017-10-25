// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The Azure IoT Provisioning Service SDK for Node.js allows applications to perform
 * CRUD operations on enrollments and enrollmentGroups as well as deleting device registration
 * status objects.
 * @module azure-iot-provisioning-service
 */
module.exports = {
  ProvisioningServiceClient: require('./lib/provisioningserviceclient.js').ProvisioningServiceClient
};