/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
/**
 * Describes the parameters that enable a device or cloud application to connect to an Azure IoT hub.
 */
export declare class ConnectionString {
    /**
     * Hostname of the Azure IoT hub.
     * @memberof {azure-iot-common.ConnectionString}
     */
    HostName?: string;
    /**
     * Unique device identifier as it exists in the device identity registry. This is only used for device connection strings.
     * @memberof {azure-iot-common.ConnectionString}
     */
    DeviceId?: string;
    /**
     * Unique module identifier as it exists in the device identity registry. This is only used for device connection strings.
     * @memberof {azure-iot-common.ConnectionString}
     */
    ModuleId?: string;
    /**
     * Unique repository identifier as it exists in the model repository.
     * @memberof {azure-iot-common.ConnectionString}
     */
    RepositoryId?: string;
    /**
     * Symmetric key used to create shared access signature tokens that are in turn used to authenticate the connection. Associated either with a specific device or a specific service policy.
     * @memberof {azure-iot-common.ConnectionString}
     */
    SharedAccessKey?: string;
    /**
     * Name of the access policy used to connect to the Azure IoT hub. used only in the case of the service SDK, unused with the Device SDK (which uses `DeviceId` instead).
     * @memberof {azure-iot-common.ConnectionString}
     */
    SharedAccessKeyName?: string;
    /**
     * IP address or internet name of the host machine working as a device or protocol gateway.  Used when communicating with Azure Edge devices.
     * @memberof {azure-iot-common.ConnectionString}
     */
    GatewayHostName?: string;
    /**
     * A shared access signature which encapsulates "device connect" permissions on an IoT hub.
     * @memberof {azure-iot-common.ConnectionString}
     */
    SharedAccessSignature?: string;
    /**
     * This property exists only if a device uses x509 certificates for authentication and if it exists, will be set to True.
     * @memberof {azure-iot-common.ConnectionString}
     */
    x509?: string;
    /**
     * Parses a string and returns the corresponding {@link azure-iot-common.ConnectionString} object.
     * @param {string}   source          string from which the connection string will be extracted
     * @param {string[]} requiredFields  array of strings listing the fields that are expected to be found.
     */
    static parse(source: string, requiredFields?: string[]): ConnectionString;
}
