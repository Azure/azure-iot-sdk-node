/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { IotHubGatewayServiceAPIs as PLClient, IotHubGatewayServiceAPIsModels as Models } from '../pl/iotHubGatewayServiceAPIs';
import { IoTHubTokenCredentials } from '../auth/iothub_token_credentials';
import {
  AuthenticationMechanism,
  SymmetricKey,
  X509Thumbprint,
  DeviceCapabilities,
  DevicesCreateOrUpdateIdentityOptionalParams,
  DevicesDeleteIdentityOptionalParams,
  ModulesCreateOrUpdateIdentityOptionalParams,
} from '../pl/models';

/**
 * @export
 * @type Device  Type alias to simplify the auto generated type's name
 */
export type Device = Models.Device;

/**
 * @export
 * @type Module  Type alias to simplify the auto generated type's name
 */
export type Module = Models.Module;

/**
 * @export
 * @type DevicesGetIdentityResponse   Type alias to simplify the auto generated type's name
 */
export type DevicesGetIdentityResponse = Models.DevicesGetIdentityResponse;

/**
 * @export
 * @type DevicesCreateOrUpdateIdentityResponse   Type alias to simplify the auto generated type's name
 */
export type DevicesCreateOrUpdateIdentityResponse = Models.DevicesCreateOrUpdateIdentityResponse;

/**
 * @export
 * @type DevicesGetDevicesResponse   Type alias to simplify the auto generated type's name
 */
export type DevicesGetDevicesResponse = Models.DevicesGetDevicesResponse;

/**
 * @export
 * @type ModulesCreateOrUpdateIdentityResponse   Type alias to simplify the auto generated type's name
 */
export type ModulesCreateOrUpdateIdentityResponse = Models.ModulesCreateOrUpdateIdentityResponse;

/**
 * @export
 * @type ModulesGetIdentityResponse   Type alias to simplify the auto generated type's name
 */
export type ModulesGetIdentityResponse = Models.ModulesGetIdentityResponse;

/**
 * @export
 * @type ModulesGetModulesOnDeviceResponse   Type alias to simplify the auto generated type's name
 */
export type ModulesGetModulesOnDeviceResponse = Models.ModulesGetModulesOnDeviceResponse;

/**
 * @export
 * @type ModulesDeleteIdentityOptionalParams   Type alias to simplify the auto generated type's name
 */
export type ModulesDeleteIdentityOptionalParams = Models.ModulesDeleteIdentityOptionalParams;

/**
 * @export
 * @type StatisticsGetServiceStatisticsResponse   Type alias to simplify the auto generated type's name
 */
export type StatisticsGetServiceStatisticsResponse = Models.StatisticsGetServiceStatisticsResponse;

/**
 * @export
 * @type StatisticsGetDeviceStatisticsResponse   Type alias to simplify the auto generated type's name
 */
export type StatisticsGetDeviceStatisticsResponse = Models.StatisticsGetDeviceStatisticsResponse;

/**
 * @export
 * @type DevicesGetDevicesOptionalParams   Type alias to simplify the auto generated type's name
 */
export type DevicesGetDevicesOptionalParams = Models.DevicesGetDevicesOptionalParams;

/**
 * @export
 * @type BulkRegistryUpdateRegistryResponse   Type alias to simplify the auto generated type's name
 */
export type BulkRegistryUpdateRegistryResponse = Models.BulkRegistryUpdateRegistryResponse;

/**
 * @export
 * @type ExportImportDevice   Type alias to simplify the auto generated type's name
 */
export type ExportImportDevice = Models.ExportImportDevice;

/**
 * @export
 * @type QuerySpecification   Type alias to simplify the auto generated type's name
 */
export type QuerySpecification = Models.QuerySpecification;

/**
 * @export
 * @type QueryGetTwinsResponse   Type alias to simplify the auto generated type's name
 */
export type QueryGetTwinsResponse = Models.QueryGetTwinsResponse;

/**
 * @export
 * @type DevicesGetTwinResponse   Type alias to simplify the auto generated type's name
 */
export type DevicesGetTwinResponse = Models.DevicesGetTwinResponse;

/**
 * @export
 * @type Twin   Type alias to simplify the auto generated type's name
 */
export type Twin = Models.Twin;

/**
 * @export
 * @type DevicesReplaceTwinResponse   Type alias to simplify the auto generated type's name
 */
export type DevicesReplaceTwinResponse = Models.DevicesReplaceTwinResponse;

/**
 * @export
 * @type DevicesUpdateTwinOptionalParams   Type alias to simplify the auto generated type's name
 */
export type DevicesUpdateTwinOptionalParams = Models.DevicesUpdateTwinOptionalParams;

/**
 * @export
 * @type ModulesGetTwinResponse   Type alias to simplify the auto generated type's name
 */
export type ModulesGetTwinResponse = Models.ModulesGetTwinResponse;

/**
 * @export
 * @type DevicesUpdateTwinResponse   Type alias to simplify the auto generated type's name
 */
export type DevicesUpdateTwinResponse = Models.DevicesUpdateTwinResponse;

/**
 * @export
 * @type ModulesReplaceTwinResponse   Type alias to simplify the auto generated type's name
 */
export type ModulesReplaceTwinResponse = Models.ModulesReplaceTwinResponse;

/**
 * @export
 * @type ModulesUpdateTwinOptionalParams   Type alias to simplify the auto generated type's name
 */
export type ModulesUpdateTwinOptionalParams = Models.ModulesUpdateTwinOptionalParams;

/**
 * @export
 * @type CloudToDeviceMethod   Type alias to simplify the auto generated type's name
 */
export type CloudToDeviceMethod = Models.CloudToDeviceMethod;

/**
 * @export
 * @type DevicesInvokeMethodResponse   Type alias to simplify the auto generated type's name
 */
export type DevicesInvokeMethodResponse = Models.DevicesInvokeMethodResponse;

/**
 * @export
 * @class IoTHubRegistryManager    Main class to implement IoTHub Registry Manager Operations
 *                                 based on the top of the auto generated IotHub REST APIs
 */
export class IoTHubRegistryManager {
  /**
   * @private
   * The IoTHub token credentials used for creating the Protocol Layer client.
   */
  private _creds: IoTHubTokenCredentials;
  /**
   * @private
   * The Protocol Layer Client instance used by the DigitalTwinClient.
   */
  private _pl: PLClient;
  /**
   * @private
   * The Azure IoT service's API version.
   */
  private _apiVersion: string = '2021-04-12';

  /**
   * Constructor which also creates an instance of the Protocol Layer Client used by the DigitalTwinClient.
   * @param {IoTHubTokenCredentials} creds    The IoTHub token credentials used for creating the Protocol Layer client.
   * @memberof DigitalTwinClient
   */
  constructor(creds: IoTHubTokenCredentials) {
    /*Code_SRS_NODE_DIGITAL_TWIN_CLIENT_12_001: [** The `DigitalTwinClient` creates an instance of the DigitalTwinClient passing IoTHubTokenCredentials class as an argument.]*/
    this._creds = creds;
    this._pl = new PLClient(this._creds, {
      baseUri: 'https://' + this._creds.getHubName(),
      apiVersion: this._apiVersion,
      deserializationContentTypes: { // application/ld+json isn't supported by autorest by default, which is why we need these options
        json: [
          'application/ld+json',
          'application/json',
          'text/json'
        ]
      }
    });
  }

  /**
   * @method createDeviceWithSas                              module: azure-iot-digitaltwins-service.IoTHubRegistryManager.createDeviceWithSas
   * @description                                             Creates a device identity on IoTHub using SAS authentication.
   * @param {string}  deviceId                                The name (Id) of the device.
   * @param {string}  primaryKey                              Primary authentication key.
   * @param {string}  secondaryKey                            Secondary authentication key.
   * @param {boolean} isEnabled                               The status of the device. If the status disabled, a device cannot connect to the service.
   * @returns Promise<DevicesCreateOrUpdateIdentityResponse>  The return object containing the created device and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  createDeviceWithSas(
    deviceId: string,
    primaryKey: string,
    secondaryKey: string,
    isEnabled: boolean
  ): Promise<DevicesCreateOrUpdateIdentityResponse> {
    const symmetricKey: SymmetricKey = {
      primaryKey: primaryKey,
      secondaryKey: secondaryKey
    };

    const authenticationMechanism: AuthenticationMechanism = {
      type: 'sas',
      symmetricKey: symmetricKey
    };

    const device: Device = {};
    device.deviceId = deviceId;
    if (isEnabled) {
      device.status = 'enabled';
    } else {
      device.status = 'disabled';
    }
    device.authentication = authenticationMechanism;

    return this._pl.devices.createOrUpdateIdentity(deviceId, device);
  }

  /**
   * @method createDeviceWithX509                             module: azure-iot-digitaltwins-service.IoTHubRegistryManager.createDeviceWithX509
   * @description                                             Creates a device identity on IoTHub using X509 authentication.
   * @param {string}  deviceId                                The name (Id) of the device.
   * @param {string}  primaryThumbprint                       Primary X509 thumbprint.
   * @param {string}  secondaryThumbprint                     Secondary X509 thumbprint.
   * @param {boolean} isEnabled                               The status of the device. If the status disabled, a device cannot connect to the service.
   * @param {boolean} iotEdge                                 The device is part of a IoTEdge or not.
   * @returns Promise<DevicesCreateOrUpdateIdentityResponse>  The return object containing the created device and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  createDeviceWithX509(
    deviceId: string,
    primaryThumbprint: string,
    secondaryThumbprint: string,
    isEnabled: Boolean,
    iotEdge: boolean = false
  ): Promise<DevicesCreateOrUpdateIdentityResponse> {
    const x509Thumbprint: X509Thumbprint = {
      primaryThumbprint: primaryThumbprint,
      secondaryThumbprint: secondaryThumbprint
    };

    const authenticationMechanism: AuthenticationMechanism = {
      type: 'selfSigned',
      x509Thumbprint: x509Thumbprint
    };

    const deviceCapabilities: DeviceCapabilities = {
      iotEdge: iotEdge
    };

    const device: Device = {};
    device.deviceId = deviceId;
    if (isEnabled) {
      device.status = 'enabled';
    } else {
      device.status = 'disabled';
    }
    device.authentication = authenticationMechanism;
    device.capabilities = deviceCapabilities;

    return this._pl.devices.createOrUpdateIdentity(deviceId, device);
  }

  /**
   * @method createDeviceWithCertificateAuthority             module: azure-iot-digitaltwins-service.IoTHubRegistryManager.createDeviceWithCertificateAuthority
   * @description                                             Creates a device identity on IoTHub using X509 authentication.
   * @param {string}  deviceId                                The name (Id) of the device.
   * @param {boolean} isEnabled                               The status of the device. If the status disabled, a device cannot connect to the service.
   * @param {boolean} iotEdge                                 The device is part of a IoTEdge or not.
   * @returns Promise<DevicesCreateOrUpdateIdentityResponse>  The return object containing the created device and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  createDeviceWithCertificateAuthority(
    deviceId: string,
    isEnabled: boolean,
    iotEdge: boolean = false
  ): Promise<DevicesCreateOrUpdateIdentityResponse> {
    const authenticationMechanism: AuthenticationMechanism = {
      type: 'certificateAuthority'
    };

    const deviceCapabilities: DeviceCapabilities = {
      iotEdge: iotEdge
    };

    const device: Device = {};
    device.deviceId = deviceId;
    if (isEnabled) {
      device.status = 'enabled';
    } else {
      device.status = 'disabled';
    }
    device.authentication = authenticationMechanism;
    device.capabilities = deviceCapabilities;

    return this._pl.devices.createOrUpdateIdentity(deviceId, device);
  }

  /**
   * @method updateDevice                                     module: azure-iot-digitaltwins-service.IoTHubRegistryManager.updateDevice
   * @description                                             Updates a device identity on IoTHub
   * @param {string}  deviceId                                The name (Id) of the device.
   * @param {Device}  device                                  The contents of the device identity.
   * @returns Promise<DevicesCreateOrUpdateIdentityResponse>  The return object containing the updated device and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  updateDevice(
    deviceId: string,
    device: Device
  ): Promise<DevicesCreateOrUpdateIdentityResponse> {

    const options: DevicesCreateOrUpdateIdentityOptionalParams = {
      ifMatch: '*'
    };
    return this._pl.devices.createOrUpdateIdentity(deviceId, device, options);
  }

  /**
   * @method getDevice                                module: azure-iot-digitaltwins-service.IoTHubRegistryManager.getDevice
   * @description                                     Retrieves a device identity from IoTHub.
   * @param {string} deviceId                         The name (Id) of the device.
   * @returns Promise<DevicesGetIdentityResponse>     The return object containing the device and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  getDevice(
    deviceId: string
  ): Promise<DevicesGetIdentityResponse> {
    return this._pl.devices.getIdentity(deviceId);
  }

  /**
   * @method deleteDevice                             module: azure-iot-digitaltwins-service.IoTHubRegistryManager.deleteDevice
   * @description                                     Deletes a device identity from IoTHub.
   * @param {string} deviceId                         The name (Id) of the device.
   * @returns void                                    None
   * @memberof IoTHubRegistryManager
   */
  deleteDevice(
    deviceId: string,
    eTag: string = '*'
  ): void {
    const devicesDeleteIdentityOptionalParams: DevicesDeleteIdentityOptionalParams = {
      ifMatch: eTag
    };

    this._pl.devices.deleteIdentity(deviceId, devicesDeleteIdentityOptionalParams);
  }

  /**
   * @method createModuleWithSas                              module: azure-iot-digitaltwins-service.IoTHubRegistryManager.createModuleWithSas
   * @description                                             Creates a module identity for a device on IoTHub using SAS authentication.
   * @param {string}  deviceId                                The name (Id) of the device.
   * @param {string}  moduleId                                The name (Id) of the module.
   * @param {string}  managed_by                              The name of the manager device (edge).
   * @param {string}  primaryKey                              Primary authentication key.
   * @param {string}  secondaryKey                            Secondary authentication key.
   * @returns Promise<ModulesCreateOrUpdateIdentityResponse>  The return object containing the created module and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  createModuleWithSas(
    deviceId: string,
    moduleId: string,
    managedBy: string,
    primaryKey: string,
    secondaryKey: string,
  ): Promise<ModulesCreateOrUpdateIdentityResponse> {
    const symmetricKey: SymmetricKey = {
      primaryKey: primaryKey,
      secondaryKey: secondaryKey
    };

    const authenticationMechanism: AuthenticationMechanism = {
      type: 'sas',
      symmetricKey: symmetricKey
    };

    const module: Module = {};
    module.deviceId = deviceId;
    module.moduleId = moduleId;
    module.managedBy = managedBy;
    module.authentication = authenticationMechanism;

    return this._pl.modules.createOrUpdateIdentity(deviceId, moduleId, module);
  }

  /**
   * @method createModuleWithX509                             module: azure-iot-digitaltwins-service.IoTHubRegistryManager.createModuleWithX509
   * @description                                             Creates a module identity for a device on IoTHub using X509 authentication.
   * @param {string}  deviceId                                The name (Id) of the device.
   * @param {string}  moduleId                                The name (Id) of the module.
   * @param {string}  managed_by                              The name of the manager device (edge).
   * @param {string}  primaryThumbprint                       Primary X509 thumbprint.
   * @param {string}  secondaryThumbprint                     Secondary X509 thumbprint.
   * @returns Promise<ModulesCreateOrUpdateIdentityResponse>  The return object containing the created module and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  createModuleWithX509(
    deviceId: string,
    moduleId: string,
    managedBy: string,
    primaryThumbprint: string,
    secondaryThumbprint: string,
  ): Promise<ModulesCreateOrUpdateIdentityResponse> {
    const x509Thumbprint: X509Thumbprint = {
      primaryThumbprint: primaryThumbprint,
      secondaryThumbprint: secondaryThumbprint
    };

    const authenticationMechanism: AuthenticationMechanism = {
      type: 'selfSigned',
      x509Thumbprint: x509Thumbprint
    };

    const module: Module = {};
    module.deviceId = deviceId;
    module.moduleId = moduleId;
    module.managedBy = managedBy;
    module.authentication = authenticationMechanism;

    return this._pl.modules.createOrUpdateIdentity(deviceId, moduleId, module);
  }

  /**
   * @method createModuleWithCertificateAuthority             module: azure-iot-digitaltwins-service.IoTHubRegistryManager.createModuleWithCertificateAuthority
   * @description                                             Creates a module identity for a device on IoTHub using certificate authority.
   * @param {string}  deviceId                                The name (Id) of the device.
   * @param {string}  moduleId                                The name (Id) of the module.
   * @param {string}  managed_by                              The name of the manager device (edge).
   * @returns Promise<ModulesCreateOrUpdateIdentityResponse>  The return object containing the created module and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  createModuleWithCertificateAuthority(
    deviceId: string,
    moduleId: string,
    managedBy: string,
  ): Promise<ModulesCreateOrUpdateIdentityResponse> {
    const authenticationMechanism: AuthenticationMechanism = {
      type: 'certificateAuthority'
    };

    const module: Module = {};
    module.deviceId = deviceId;
    module.moduleId = moduleId;
    module.managedBy = managedBy;
    module.authentication = authenticationMechanism;

    return this._pl.modules.createOrUpdateIdentity(deviceId, moduleId, module);
  }

  /**
   * @method updateModule                                           module: azure-iot-digitaltwins-service.IoTHubRegistryManager.updateModule
   * @description                                                   Updates a module identity for a device on IoTHub using SAS authentication.
   * @param {string}  deviceId                                      The name (Id) of the device.
   * @param {string}  moduleId                                      The name (Id) of the module.
   * @param {Module}  module                                        The contents of the module identity.
   * @returns Promise<ModulesCreateOrUpdateIdentityOptionalParams>  The return object containing the updated module and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  updateModule(
    deviceId: string,
    moduleId: string,
    module: Module
  ): Promise<ModulesCreateOrUpdateIdentityResponse> {
    const options: ModulesCreateOrUpdateIdentityOptionalParams = {
      ifMatch: '*'
    };

    return this._pl.modules.createOrUpdateIdentity(deviceId, moduleId, module, options);
  }

  /**
   * @method getModule                                module: azure-iot-digitaltwins-service.IoTHubRegistryManager.getModule
   * @description                                     Retrieves a module identity for a device from IoTHub.
   * @param {string} deviceId                         The name (Id) of the device.
   * @param {string} moduleId                         The name (Id) of the module.
   * @returns Promise<ModulesGetIdentityResponse>     The return object containing the module and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  getModule(
    deviceId: string,
    moduleId: string
  ): Promise<ModulesGetIdentityResponse> {
    return this._pl.modules.getIdentity(deviceId, moduleId);
  }

  /**
   * @method getModules                                   module: azure-iot-digitaltwins-service.IoTHubRegistryManager.getModules
   * @description                                         Retrieves all module identities on a device.
   * @param {string} deviceId                             The name (Id) of the device.
   * @returns Promise<ModulesGetModulesOnDeviceResponse>  The return object containing the array of modules and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  getModules(
    deviceId: string
  ): Promise<ModulesGetModulesOnDeviceResponse> {
    return this._pl.modules.getModulesOnDevice(deviceId);
  }

  /**
   * @method deleteModule                             module: azure-iot-digitaltwins-service.IoTHubRegistryManager.deleteModule
   * @description                                     Deletes a module identity for a device from IoTHub.
   * @param {string} deviceId                         The name (Id) of the device.
   * @param {string} moduleId                         The name (Id) of the module.
   * @returns void
   * @memberof IoTHubRegistryManager
   */
  deleteModule(
    deviceId: string,
    moduleId: string,
    eTag: string = '*'
  ): void {
    const modulesDeleteIdentityOptionalParams: ModulesDeleteIdentityOptionalParams = {
      ifMatch: eTag
    };

    this._pl.modules.deleteIdentity(deviceId, moduleId, modulesDeleteIdentityOptionalParams);
  }

  /**
   * @method getServiceStatistics                               module: azure-iot-digitaltwins-service.IoTHubRegistryManager.getServiceStatistics
   * @description                                               Retrieves the IoTHub service statistics.
   * @returns Promise<StatisticsGetServiceStatisticsResponse>   The return object containing the service statistics and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  getServiceStatistics(
  ): Promise<StatisticsGetServiceStatisticsResponse> {
    return this._pl.statistics.getServiceStatistics();
  }

  /**
   * @method getDeviceRegistryStatistics                        module: azure-iot-digitaltwins-service.IoTHubRegistryManager.getDeviceRegistryStatistics
   * @description                                               Retrieves the IoTHub device registry statistics.
   * @returns Promise<StatisticsGetDeviceStatisticsResponse>    The return object containing the registry statistics and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  getDeviceRegistryStatistics(
  ): Promise<StatisticsGetDeviceStatisticsResponse> {
    return this._pl.statistics.getDeviceStatistics();
  }

  /**
   * @method getDevices                               module: azure-iot-digitaltwins-service.IoTHubRegistryManager.getDevices
   * @description                                     Get the identities of multiple devices from the IoTHub identity
   *                                                  registry. Not recommended. Use the IoTHub query language to retrieve
   *                                                  device twin and device identity information. See
   *                                                  https://docs.microsoft.com/en-us/rest/api/iothub/service/queryiothub
   *                                                  and
   *                                                  https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-query-language
   *                                                  for more information.
   * @param {number} maxNumberOfDevices               This parameter when specified, defines the maximum number
   *                                                  of device identities that are returned. Any value outside the range of
   *                                                  1-1000 is considered to be 1000.
   * @returns Promise<DevicesGetDevicesResponse>      The return object containing the array of devices and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  getDevices(
    maxNumberOfDevices: number
  ): Promise<DevicesGetDevicesResponse> {
    const devicesGetDevicesOptionalParams: DevicesGetDevicesOptionalParams = {
      top: maxNumberOfDevices
    };
    return this._pl.devices.getDevices(devicesGetDevicesOptionalParams);
  }

  /**
   * @method bulkCreateOrUpdateDevices                      module: azure-iot-digitaltwins-service.IoTHubRegistryManager.bulkCreateOrUpdateDevices
   * @description                                           Create, update, or delete the identities of multiple devices from the
   *                                                        IoTHub identity registry.
   *                                                        Create, update, or delete the identities of multiple devices from the
   *                                                        IoTHub identity registry. A device identity can be specified only once
   *                                                        in the list. Different operations (create, update, delete) on different
   *                                                        devices are allowed. A maximum of 100 devices can be specified per
   *                                                        invocation. For large scale operations, consider using the import
   *                                                        feature using blob
   *                                                        storage(https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-identity-registry#import-and-export-device-identities).
   * @param {ExportImportDevice[]} devices                  The list of device objects to operate on.
   * @returns Promise<BulkRegistryUpdateRegistryResponse>   The return object containing the bulk update result and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  bulkCreateOrUpdateDevices(
    devices: ExportImportDevice[]
  ): Promise<BulkRegistryUpdateRegistryResponse> {
    return this._pl.bulkRegistry.updateRegistry(devices);
  }

  /**
   * @method queryIoTHub                                    module: azure-iot-digitaltwins-service.IoTHubRegistryManager.queryIoTHub
   * @description                                           Query an IoTHub to retrieve information regarding device twins using a
   *                                                        SQL-like language.
   *                                                        See https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-query-language
   *                                                        for more information. Pagination of results is supported. This returns
   *                                                        information about device twins only.
   * @param {QuerySpecification} querySpecification         The query specification.
   * @returns Promise<QueryGetTwinsResponse>                The return object containing the query result and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  queryIoTHub(
    querySpecification: QuerySpecification
  ): Promise<QueryGetTwinsResponse> {
    return this._pl.query.getTwins(querySpecification);
  }

  /**
   * @method getTwin                                        module: azure-iot-digitaltwins-service.IoTHubRegistryManager.getTwin
   * @description                                           Gets a device twin.
   * @param {string} deviceId                               The name (Id) of the device.
   * @returns Promise<DevicesGetTwinResponse>               The return object containing the twin and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  getTwin(
    deviceId: string
  ): Promise<DevicesGetTwinResponse> {
    return this._pl.devices.getTwin(deviceId);
  }

  /**
   * @method replaceTwin                                    module: azure-iot-digitaltwins-service.IoTHubRegistryManager.replaceTwin
   * @description                                           Replaces tags and desired properties of a device twin.
   * @param {string} deviceId                               The name (Id) of the device.
   * @param {Twin} deviceTwin                               The twin info of the device.
   * @returns Promise<DevicesReplaceTwinResponse>           The return object containing the twin and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  replaceTwin(
    deviceId: string,
    deviceTwin: Twin
  ): Promise<DevicesReplaceTwinResponse> {
    return this._pl.devices.replaceTwin(deviceId, deviceTwin);
  }

  /**
   * @method updateTwin                                     module: azure-iot-digitaltwins-service.IoTHubRegistryManager.updateTwin
   * @description                                           Updates tags and desired properties of a device twin.
   * @param {string} deviceId                               The name (Id) of the device.
   * @param {Twin} deviceTwin                               The twin info of the device.
   * @param {string} eTag                                   The etag (if_match) value to use for the update operation.
   * @returns Promise<DevicesUpdateTwinResponse>            The return object containing the twin and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  updateTwin(
    deviceId: string,
    deviceTwin: Twin,
    eTag: string
  ): Promise<DevicesUpdateTwinResponse> {
    const devicesUpdateTwinOptionalParams: DevicesUpdateTwinOptionalParams = {
      ifMatch: eTag
    };
    return this._pl.devices.updateTwin(deviceId, deviceTwin, devicesUpdateTwinOptionalParams);
  }

  /**
   * @method getModuleTwin                                  module: azure-iot-digitaltwins-service.IoTHubRegistryManager.getModuleTwin
   * @description                                           Gets a module twin.
   * @param {string} deviceId                               The name (Id) of the device.
   * @param {string} moduleId                               The name (Id) of the module.
   * @returns Promise<ModulesGetTwinResponse>               The return object containing the twin and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  getModuleTwin(
    deviceId: string,
    moduleId: string
  ): Promise<ModulesGetTwinResponse> {
    return this._pl.modules.getTwin(deviceId, moduleId);
  }

  /**
   * @method replaceModuleTwin                              module: azure-iot-digitaltwins-service.IoTHubRegistryManager.replaceModuleTwin
   * @description                                           Replaces tags and desired properties of a module twin.
   * @param {string} deviceId                               The name (Id) of the device.
   * @param {string} moduleId                               The name (Id) of the module.
   * @param {Twin} moduleTwin                               The twin info of the module.
   * @returns Promise<ModulesReplaceTwinResponse>           The return object containing the twin and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  replaceModuleTwin(
    deviceId: string,
    moduleId: string,
    moduleTwin: Twin
  ): Promise<ModulesReplaceTwinResponse> {
    return this._pl.modules.replaceTwin(deviceId, moduleId, moduleTwin);
  }

  /**
   * @method updateModuleTwin                               module: azure-iot-digitaltwins-service.IoTHubRegistryManager.updateModuleTwin
   * @description                                           Updates tags and desired properties of a module twin.
   * @param {string} deviceId                               The name (Id) of the device.
   * @param {string} moduleId                               The name (Id) of the module.
   * @param {Twin} moduleTwin                               The twin info of the module.
   * @param {string} eTag                                   The etag (if_match) value to use for the update operation.
   * @returns Promise<ModulesReplaceTwinResponse>           The return object containing the twin and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  updateModuleTwin(
    deviceId: string,
    moduleId: string,
    moduleTwin: Twin,
    eTag: string
  ): Promise<ModulesReplaceTwinResponse> {
    const modulesUpdateTwinOptionalParams: ModulesUpdateTwinOptionalParams = {
      ifMatch: eTag
    };
    return this._pl.modules.updateTwin(deviceId, moduleId, moduleTwin, modulesUpdateTwinOptionalParams);
  }

  /**
   * @method invokeDeviceMethod                             module: azure-iot-digitaltwins-service.IoTHubRegistryManager.invokeDeviceMethod
   * @description                                           Invoke a direct method on a device.
   * @param {string} deviceId                               The name (Id) of the device.
   * @param {CloudToDeviceMethod} directMethodRequest       The method request.
   * @returns Promise<DevicesInvokeMethodResponse>          The return object containing the result of the method call and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  invokeDeviceMethod(
    deviceId: string,
    directMethodRequest: CloudToDeviceMethod
  ): Promise<DevicesInvokeMethodResponse> {
    if (typeof directMethodRequest.payload !== 'undefined') {
      directMethodRequest.payload = '';
    }
    return this._pl.devices.invokeMethod(deviceId, directMethodRequest);
  }

  /**
   * @method invokeDeviceModuleMethod                       module: azure-iot-digitaltwins-service.IoTHubRegistryManager.invokeDeviceModuleMethod
   * @description                                           Invoke a direct method on a module of a device.
   * @param {string} deviceId                               The name (Id) of the device.
   * @param {string} moduleId                               The name (Id) of the module.
   * @param {CloudToDeviceMethod} directMethodRequest       The method request.
   * @returns Promise<DevicesInvokeMethodResponse>          The return object containing the result of the method call and the parsed HttpResponse.
   * @memberof IoTHubRegistryManager
   */
  invokeDeviceModuleMethod(
    deviceId: string,
    moduleId: string,
    directMethodRequest: CloudToDeviceMethod
  ): Promise<DevicesInvokeMethodResponse> {
    if (typeof directMethodRequest.payload !== 'undefined') {
      directMethodRequest.payload = '';
    }
    return this._pl.modules.invokeMethod(deviceId, moduleId, directMethodRequest);
  }
}
