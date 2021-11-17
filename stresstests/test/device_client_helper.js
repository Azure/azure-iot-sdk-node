// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Client = require('azure-iot-device').Client;
const ModuleClient = require('azure-iot-device').ModuleClient;
const DeviceSas = require('azure-iot-device').SharedAccessSignature;
const Registry = require('azure-iothub').Registry;
const ConnectionString = require('azure-iothub').ConnectionString;
const anHourFromNow = require('azure-iot-common').anHourFromNow;
const CommonSas = require('azure-iot-common').SharedAccessSignature;
const uuid = require('uuid');

const debug = require('debug')('stresstests:DeviceClientHelper');

/**
 * Helps manage the lifecycle of a device client (Client) or module client (ModuleClient).
 */
class DeviceClientHelper {
  /**
   * Construct a DeviceClientHelper instance.
   * @param {string} [iotHubConnectionString] - The connection string to the IoT Hub.
   *   If not provided, the environment variable IOTHUB_CONNECTION_STRING will be used.
   * @public
   */
  constructor(iotHubConnectionString) {
    [this.client, this.deviceId, this.moduleId] = [null, null, null];
    this._iotHubConnectionString = iotHubConnectionString ?
      iotHubConnectionString :
      process.env.IOTHUB_CONNECTION_STRING;
    this._hubHostName =
      ConnectionString.parse(this._iotHubConnectionString).HostName;
    this._registry = Registry.fromConnectionString(this._iotHubConnectionString);
  }

  /**
   * Closes the client, disposes of the client, and removes the device from the IoT Hub.
   * @public
   */
  async disposeClient() {
    if (!this.client) {
      debug('attempted to dispose a non-exiting client')
      return;
    }
    debug('disposing client');
    const [client, deviceId] = [this.client, this.deviceId];
    [this.client, this.deviceId, this.moduleId] = [null, null, null];
    await Promise.all([
      client.close().then(() => debug('client closed')),
      this._registry.delete(deviceId).then(() => debug('device id removed from registry'))
    ]);
  }

  /**
   * Registers a device with the IoT Hub and then creates a corresponding device
   * client (Client) that authenticates using a shared access signature.
   * @param {function} transportCtor - The constructor of the device transport to use.
   * @param {string} [modelId] - An optional model ID to use for the device.
   * @public
   */
  async createDeviceClientSas(transportCtor, modelId) {
    debug('creating Client with SAS authentication');
    this._clientCreationChecks(...arguments);
    const deviceDescription = await this._registerSasDevice();
    this.deviceId = deviceDescription.deviceId;
    try {
      this.client = Client.fromSharedAccessSignature(DeviceSas.create(
        this._hubHostName,
        this.deviceId,
        deviceDescription.authentication.symmetricKey.primaryKey,
        anHourFromNow()
      ).toString(), ...arguments);
    } catch (err) {
      await this._cleanUpFailedClientCreation();
      throw err;
    }
  }

  /**
   * Registers a device with the IoT Hub and then creates a corresponding device
   * client (Client) that authenticates using a symmetric key.
   * @param {function} transportCtor - The constructor of the device transport to use.
   * @param {string} [modelId] - An optional model ID to use for the device.
   * @public
   */
  async createDeviceClientSymmetricKey(transportCtor, modelId) {
    debug('creating Client with symmetric key authentication');
    this._clientCreationChecks(...arguments);
    const deviceDescription = await this._registerSasDevice();
    this.deviceId = deviceDescription.deviceId;
    try {
      this.client = Client.fromConnectionString(
        `HostName=${this._hubHostName};DeviceId=${this.deviceId};SharedAccessKey=${deviceDescription.authentication.symmetricKey.primaryKey}`,
        ...arguments
      );
    } catch (err) {
      await this._cleanUpFailedClientCreation();
      throw err;
    }
  }

  async createDeviceClientX509SelfSigned(transportCtor, modelId) {
    throw new Error('createDeviceClientX509SelfSigned() is not implemented yet');
  }

  async createDeviceClientX509CaSigned(transportCtor, modelId) {
    throw new Error('createDeviceX509CaSigned() is not implemented yet');
  }

  /**
   * Registers a device, registers a module under that device, and then creates
   * a corresponding module client (ModuleClient) that authenticates using a
   * shared access signature.
   * @param {function} transportCtor - The constructor of the device transport to use.
   * @param {string} [modelId] - An optional model ID to use for the module.
   * @public
   */
  async createModuleClientSas(transportCtor, modelId) {
    debug('creating ModuleClient with SAS authentication');
    this._clientCreationChecks(...arguments);
    const deviceDescription = await this._registerSasDevice();
    const moduleId = `node_stress_delete_me_${uuid.v4()}`
    await this._registry.addModule({
      moduleId,
      deviceId: deviceDescription.deviceId,
    });
    [this.deviceId, this.moduleId] = [deviceDescription.deviceId, moduleId];
    try {
      this.client = ModuleClient.fromSharedAccessSignature(
        CommonSas.create(
          `${this._hubHostName}/devices/${this.deviceId}/modules/${this.moduleId}`,
          null,
          deviceDescription.authentication.symmetricKey.primaryKey,
          anHourFromNow()
        ).toString(),
        ...arguments
      )
    } catch (err) {
      await this._cleanUpFailedClientCreation();
      throw err;
    }
  }

  /**
   * Registers a device, registers a module under that device, and then creates
   * a corresponding module client (ModuleClient) that authenticates using a
   * symmetric key.
   * @param {function} transportCtor - The constructor of the device transport to use.
   * @param {string} [modelId] - An optional model ID to use for the module.
   * @public
   */
  async createModuleClientSymmetricKey(transportCtor, modelId) {
    debug('creating ModuleClient with symmetric key authentication');
    this._clientCreationChecks(...arguments);
    const deviceDescription = await this._registerSasDevice();
    const moduleId = `node_stress_delete_me_${uuid.v4()}`
    await this._registry.addModule({
      moduleId,
      deviceId: deviceDescription.deviceId,
    });
    [this.deviceId, this.moduleId] = [deviceDescription.deviceId, moduleId];
    try {
      this.client = ModuleClient.fromConnectionString(
        `HostName=${this._hubHostName};DeviceId=${this.deviceId};ModuleId=${this.moduleId};SharedAccessKey=${deviceDescription.authentication.symmetricKey.primaryKey}`,
        ...arguments
      );
    } catch (err) {
      await this._cleanUpFailedClientCreation();
      throw err;
    }
  }

  /**
   * Sets the token valid time in seconds and token renewal margin in seconds
   * for the device client. Only supported for clients with symmetric key
   * authentication.
   * 
   * NOTE: This method relies on internal implementation details of the client
   * and is not guaranteed to work in the future.
   * @param {number} tokenValidTimeInSeconds - The time in seconds that the
   *   token is valid for.
   * @param {number} tokenRenewalMarginInSeconds - The time in seconds before
   *   token expiry that the client will renew the token.
   * @public
   */
  setTokenRenewalValues(tokenValidTimeInSeconds, tokenRenewalMarginInSeconds) {
    if (!this.client) {
      throw new Error('Client must be created before setting token renewal values.');
    }
    if (!this.client._transport || !this.client._transport._authenticationProvider || !this.client._transport._authenticationProvider.setTokenRenewalValues) {
      throw new Error('Setting token renewal values is not supported on this client.');
    }
    this._checkType(tokenValidTimeInSeconds, 'tokenValidTimeInSeconds', 'number');
    this._checkType(tokenRenewalMarginInSeconds, 'tokenRenewalMarginInSeconds', 'number');
    this.client._transport._authenticationProvider.setTokenRenewalValues(...arguments);
  }
  
  // NOTE: ModuleClient does not support X509

  /**
   * @private
   */
  _checkType(value, name, type) {
    if (typeof value !== type) {
      throw new TypeError(`${name} must be a ${type}`);
    }
  }

  /**
   * @private
   */
  _clientCreationChecks(transportCtor, modelId) {
    if (this.client) {
      throw new Error(
        'A client already exists. The client must be disposed with disposeClient() before creating a new one.'
      )
    }
    this._checkType(transportCtor, 'transportCtor', 'function');
    if (modelId) {
      this._checkType(modelId, 'modelId', 'string');
    }
  }

  /**
   * @private
   */
  async _cleanUpFailedClientCreation() {
    debug('cleaning up failed client creation');
    const deviceId = this.deviceId;
    [this.client, this.deviceId, this.moduleId] = [null, null, null];
    await this._registry.delete(deviceId);
  }

  /**
   * @private
   */
  async _registerSasDevice() {
    const deviceDescription = {
      deviceId: `node_stress_delete_me_${uuid.v4()}`,
      status: 'enabled',
      authentication: {
        type: 'sas',
        symmetricKey: {
          primaryKey: Buffer.from(uuid.v4()).toString('base64'),
          secondaryKey: Buffer.from(uuid.v4()).toString('base64')
        }
      }
    };
    await this._registry.create(deviceDescription);
    return deviceDescription;
  }

}

module.exports = DeviceClientHelper;