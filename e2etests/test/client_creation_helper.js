// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Registry = require('azure-iothub').Registry;
const ConnectionString = require('azure-iothub').ConnectionString;
const DeviceIdentityHelper = require('./device_identity_helper.js');
const promisify = require('util').promisify;
const uuid = require('uuid');
const createDeviceClient = require('./testUtils.js').createDeviceClient;
const ModuleClient = require('azure-iot-device').ModuleClient;
const SharedAccessSignature = require('azure-iot-common').SharedAccessSignature;
const anHourFromNow = require('azure-iot-common').anHourFromNow;

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

const registry = Registry.fromConnectionString(hubConnectionString);
const hubHostName = ConnectionString.parse(hubConnectionString).HostName;

const authTypes = {
  SAS: 'sas',
  SYMMETRIC_KEY: 'symmetricKey',
  X509_SELF_SIGNED: 'x509SelfSigned',
  X509_CA_SIGNED: 'x509CaSigned'
};

async function createDeviceOrModuleClient(
  transportCtor,
  authType, // Must be one of the values in authTypes
  modelId, // Model ID to connect with (if specified, transport must be Mqtt or MqttWs)
  isModule // If true, a ModuleClient is returned. If false or unspecified, a DeviceClient is returned. (if true, x509 auth cannot be used)
) {
  if (isModule && (authType === authTypes.X509_CA_SIGNED || authType === authTypes.X509_SELF_SIGNED)) {
    throw new Error('x509 auth is not supported for ModuleClient');
  }

  let registerDeviceMethod;
  switch (authType) {
    case authTypes.SAS:
      registerDeviceMethod = DeviceIdentityHelper.createDeviceWithSas;
      break;
    case authTypes.SYMMETRIC_KEY:
      registerDeviceMethod = DeviceIdentityHelper.createDeviceWithSymmetricKey;
      break;
    case authTypes.X509_SELF_SIGNED:
      registerDeviceMethod = DeviceIdentityHelper.createDeviceWithX509SelfSignedCert;
      break;
    case authTypes.X509_CA_SIGNED:
      registerDeviceMethod = DeviceIdentityHelper.createDeviceWithX509CASignedCert;
      break;
    default:
      throw new Error('Invalid authType provided');
  }
  const deviceInfo = await promisify(registerDeviceMethod)();

  if (!isModule) {
    return {
      deviceId: deviceInfo.deviceId,
      client: createDeviceClient(transportCtor, deviceInfo, modelId)
    };
  }

  // If we get here, we know we are creating a module client.
  const moduleId = `node_e2e_${uuid.v4()}`;
  const registryResponse = await registry.addModule({deviceId: deviceInfo.deviceId, moduleId});
  const pkey = registryResponse.responseBody.authentication.symmetricKey.primaryKey;


  if (authType === authTypes.SAS) {
    return {
      moduleId,
      deviceId: deviceInfo.deviceId,
      client: ModuleClient.fromSharedAccessSignature(
        SharedAccessSignature.create(
          `${hubHostName}/devices/${deviceInfo.deviceId}/modules/${moduleId}`,
          null,
          pkey,
          anHourFromNow()
        ).toString(),
        transportCtor,
        modelId
      )
    };
  }

  return {
    moduleId,
    deviceId: deviceInfo.deviceId,
    client: ModuleClient.fromConnectionString(
      `HostName=${hubHostName};DeviceId=${deviceInfo.deviceId};ModuleId=${moduleId};SharedAccessKey=${pkey}`,
      transportCtor,
      modelId
    )
  };
}

module.exports = {
  createDeviceOrModuleClient,
  authTypes
};